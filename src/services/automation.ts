import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { Leads, Logs, Settings } from '../db/queries';
import path from 'path';
import { exec, execSync } from 'child_process';
import clipboardy from 'clipboardy';

// Use the stealth plugin
puppeteer.use(StealthPlugin());

// --- Safety Layer ---

const humanDelay = (min: number, max: number) => {
  return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1) + min)));
};

/**
 * CDP-based evaluation to bypass strict CSP.
 */
const cdpEvaluate = async (page: Page, expression: string, args: any[] = []) => {
  const client = await page.target().createCDPSession();
  
  // Replace arguments in the expression if provided
  let finalExpression = expression;
  args.forEach((arg, i) => {
    const replacement = typeof arg === 'string' ? `"${arg}"` : JSON.stringify(arg);
    finalExpression = finalExpression.replace(new RegExp(`arg_${i}`, 'g'), replacement);
  });

  const result = await client.send('Runtime.evaluate', {
    expression: finalExpression,
    returnByValue: true,
    userGesture: true,
    awaitPromise: true,
    // @ts-ignore - Specific bypass flag as requested
    bypassCSP: true
  } as any);
  
  await client.detach();
  return result.result.value;
};

/**
 * DOM-level clicker with Puppeteer native fallback and Ember/React-compatible event dispatching.
 * Uses CDP to bypass CSP.
 */
const forceClick = async (page: Page, selectors: string | string[], timeout = 3000) => {
  const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
  
  for (const selector of selectorArray) {
    try {
      const isXPath = selector.startsWith('/') || selector.startsWith('(');
      
      // Polling for element visibility via CDP
      const startTime = Date.now();
      let found = false;
      while (Date.now() - startTime < timeout) {
          const checkExpression = isXPath 
            ? `document.evaluate(${JSON.stringify(selector)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue !== null`
            : `document.querySelector(${JSON.stringify(selector)}) !== null`;

          if (await cdpEvaluate(page, checkExpression)) {
              found = true;
              break;
          }
          await new Promise(r => setTimeout(r, 500));
      }

      if (!found) continue;

      const clickExpression = `
          (function() {
          const sel = ${JSON.stringify(selector)};
          const isXP = ${isXPath};
          const el = isXP 
            ? document.evaluate(sel, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
            : document.querySelector(sel);
            
          if (el) {
              if (typeof el.scrollIntoView === 'function') el.scrollIntoView();
              if (typeof el.focus === 'function') el.focus();
              
              const opts = { bubbles: true, cancelable: true, view: window };
              el.dispatchEvent(new MouseEvent('mousedown', opts));
              el.dispatchEvent(new MouseEvent('mouseup', opts));
              el.dispatchEvent(new MouseEvent('click', opts));
              return true;
          }
          return false;
        })()
      `;

      if (await cdpEvaluate(page, clickExpression)) {
          console.log(`CDP-based click successful for: ${selector}`);
          return true;
      }
    } catch (e) {
      continue;
    }
  }
  return false;
};

// --- Selectors Registry ---

const SELECTORS = {
  CONNECTION_LEVEL: "//*[@id='workspace']/div/div/div[1]/div/div/div[1]/div/section/div/div/div[2]/div[1]/div[1]/div/div[1]/p",
  CONNECT_BUTTONS: [
    "button[aria-label^='Connect']", // CSS Primary
    "//button[contains(@aria-label, 'Connect')]",
    "//button[.//span[text()='Connect']]",
    "//span[text()='Connect']/ancestor::button",
    ".pvs-profile-actions button.artdeco-button--primary",
  ],
  MORE_BUTTONS: [
    "//*[@id='workspace']/div/div/div[1]/div/div/div[1]/div/section/div/div/div[2]/div[3]/div/div/div[3]/button", // Explicit User XPath
    "button[aria-label='More actions']",
    "button[aria-label='More']",
    "//button[contains(@aria-label, 'More')]",
  ],
  DROPDOWN_CONNECT: [
    "//*[@id=':rs:']/div/div/div[3]/div/div/a/div", // Explicit User XPath
    "div[role='button'][aria-label^='Connect']",
    "//div[@role='button'][contains(@aria-label, 'Connect')]",
    "//li[contains(., 'Connect')]",
  ],
  SEND_INVITE: [
    "button[aria-label='Send now']",
    "button[aria-label='Send invitation']",
    "//button[@aria-label='Send now' or @aria-label='Send invitation']",
    "//button[contains(@class, 'artdeco-button--primary') and (contains(., 'Send') or contains(., 'Done'))]",
  ],
  ADD_NOTE: [
    "button[aria-label='Add a note']", 
    "//button[contains(., 'Add a note')]",
  ],
  MESSAGE_BUTTON_1ST: [
    "//*[@id='workspace']/div/div/div[1]/div/div/div[1]/div/section/div/div/div[2]/div[3]/div/div/div[1]/a/span", // Explicit User XPath
    "//button[contains(., 'Message') and contains(@class, 'primary')]",
  ],
  MESSAGE_TEXTAREA_1ST: [
    "div[id^='msg-form-ember'][role='textbox']", // Handle dynamic Ember ID
    ".msg-form__contenteditable",
    "//*[@role='textbox' and contains(@id, 'msg-form-ember')]",
  ],
  MESSAGE_SEND_1ST: [
    "button[id^='msg-form-ember'].msg-form__send-button", // Handle dynamic Ember ID
    "//button[contains(@class, 'msg-form__send-button')]",
  ]
};

const humanMoveMouse = async (page: Page) => {
    const x = Math.floor(Math.random() * 800) + 100;
    const y = Math.floor(Math.random() * 600) + 100;
    await page.mouse.move(x, y, { steps: 10 });
};

const replacePlaceholders = (template: string, lead: any) => {
  return template
    .replace(/{first_name}/g, lead.first_name || '')
    .replace(/{last_name}/g, lead.last_name || '')
    .replace(/{company}/g, lead.company || '');
};

const simulateScroll = async (page: Page) => {
  await page.evaluate(`
    (async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight / 2) { // Scroll half page
            clearInterval(timer);
            resolve();
          }
        }, 20 + Math.random() * 30);
      });
    })()
  `);
};

// --- Automation Engine ---

class AutomationEngine {
  private browser: Browser | null = null;
  private isRunning: boolean = false;

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('Starting automation engine...');

    const settings = Settings.getAll();
    const isSimulation = settings.simulation_mode === 'true';

    try {
      let page: Page | null = null;

      if (!isSimulation) {
        try {
          console.log('Connecting to Brave via remote debugging (127.0.0.1:9222)...');
          this.browser = await (puppeteer as any).connect({
            browserURL: 'http://127.0.0.1:9222',
            defaultViewport: null
          });
          
          const pages = await this.browser!.pages();
          page = pages.find(p => p.url().includes('linkedin.com')) || await this.browser!.newPage();
          await page.setBypassCSP(true);
          console.log('Session verified via remote debugging.');
        } catch (e: any) {
          console.error("Failed to connect to browser.", e);
          Logs.add(null, 'ERROR', 'FAILED', `Connection failed: ${e.message}`);
          this.isRunning = false;
          return;
        }
      }

      const syncTab = async () => {
          if (!this.browser) return null;
          const allPages = await this.browser.pages();
          const active = allPages.find(p => p.url().includes('linkedin.com'));
          if (!active) throw new Error('LinkedIn tab not found');
          await active.bringToFront();
          await active.setBypassCSP(true);
          return active;
      };

      while (this.isRunning) {
        page = isSimulation ? null : await syncTab();
        const hasMore = await this.processQueue(page, settings, isSimulation, syncTab);
        if (!hasMore) {
          console.log('No more leads to process. Waiting 60 seconds...');
          await humanDelay(60000, 90000);
        }
        Object.assign(settings, Settings.getAll());
      }
    } catch (error: any) {
      console.error('Automation engine error:', error);
      Logs.add(null, 'ENGINE', 'ERROR', error.message);
    } finally {
      if (this.browser) await this.browser.disconnect();
      this.isRunning = false;
    }
  }

  stop() {
    this.isRunning = false;
  }

  getIsRunning() {
    return this.isRunning;
  }

  private async processQueue(page: Page | null, settings: Record<string, string>, isSimulation: boolean, syncTab: () => Promise<Page | null>) {
    const dailyLimit = parseInt(settings.daily_connect_limit || '20');
    const leads = Leads.getPendingActions(dailyLimit);

    if (leads.length === 0) return false;

    for (const lead of leads) {
      if (!this.isRunning) break;

      try {
        console.log(`Processing lead: ${lead.first_name} ${lead.last_name} (Status: ${lead.status})`);
        
        if (isSimulation) {
          await humanDelay(2000, 4000);
          Leads.updateStatus(lead.id, lead.status === 'NEW' ? 'CONNECT_SENT' : 'MSG_SENT');
          continue;
        }

        page = await syncTab();
        if (!page) throw new Error("Browser page not initialized");

        // 1. Navigate
        await page.goto(lead.linkedin_url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await humanDelay(2000, 4000); 
        await simulateScroll(page);
        await humanMoveMouse(page);

        // 2. Check Connection Level
        const connectionText = await cdpEvaluate(page, `
          (function() {
            const el = document.evaluate("${SELECTORS.CONNECTION_LEVEL}", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            return el ? el.innerText : "";
          })()
        `);
        
        const is1stDegree = connectionText.includes('1st');
        console.log(`Connection Level detected: ${connectionText} (is1stDegree: ${is1stDegree})`);

        if (is1stDegree) {
          // --- ROUTE 3: ALREADY CONNECTED ---
          console.log("Initiating messaging flow for 1st degree connection...");
          
          let msgClicked = await forceClick(page, SELECTORS.MESSAGE_BUTTON_1ST);
          if (!msgClicked) throw new Error("Could not find Message button for 1st degree connection");

          await humanDelay(3000, 5000);

          // Type Message
          const msgText = lead.message ? replacePlaceholders(lead.message, lead) : `Hi ${lead.first_name}`;
          
          // Physical Click and Paste for Textarea
          console.log("Locating message textarea...");
          const textareaSelector = SELECTORS.MESSAGE_TEXTAREA_1ST[0];
          
          // Get coordinates for physical click
          const coords = await cdpEvaluate(page, `
            (function() {
              const el = document.querySelector("${textareaSelector}");
              if (!el) return null;
              const rect = el.getBoundingClientRect();
              return { x: Math.floor(rect.left + rect.width / 2), y: Math.floor(rect.top + rect.height / 2) };
            })()
          `);

          if (coords) {
              const psClick = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${coords.x}, ${coords.y}); $code = '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int flags, int dx, int dy, int cButtons, int dwExtraInfo);'; Add-Type -MemberDefinition $code -Name User32 -Namespace Native; [Native.User32]::mouse_event(0x0002, 0, 0, 0, 0); [Native.User32]::mouse_event(0x0004, 0, 0, 0, 0);`;
              execSync(`powershell -NoProfile -Command "${psClick}"`);
              await humanDelay(1000, 2000);
              
              const psPaste = `
                Add-Type -AssemblyName System.Windows.Forms;
                Set-Clipboard -Value '${msgText.replace(/'/g, "''")}';
                $brave = (Get-Process | Where-Object {$_.MainWindowTitle -like '*LinkedIn*'} | Select-Object -First 1);
                if ($brave) {
                  $code = '[DllImport(\\"user32.dll\\")] public static extern bool SetForegroundWindow(IntPtr h);';
                  Add-Type -MemberDefinition $code -Name Win -Namespace Native;
                  [Native.Win]::SetForegroundWindow($brave.MainWindowHandle);
                  Start-Sleep -Milliseconds 500;
                  [System.Windows.Forms.SendKeys]::SendWait('^v');
                  Start-Sleep -Milliseconds 500;
                  [System.Windows.Forms.SendKeys]::SendWait('{ENTER}');
                }
              `.replace(/\s+/g, ' ').trim();
              execSync(`powershell -NoProfile -Command "${psPaste}"`);
              
              console.log("Message sent via physical interaction.");
              Leads.updateStatus(lead.id, 'COMPLETED');
              Logs.add(lead.id, 'MESSAGE', 'SUCCESS', 'Message sent to 1st degree connection');
          } else {
              // Fallback to Puppeteer type
              await page.type(textareaSelector, msgText, { delay: 50 });
              await forceClick(page, SELECTORS.MESSAGE_SEND_1ST);
              Leads.updateStatus(lead.id, 'COMPLETED');
              Logs.add(lead.id, 'MESSAGE', 'SUCCESS', 'Message sent via fallback');
          }

        } else {
          // --- ROUTE 1 & 2: CONNECTION FLOW ---
          console.log("Initiating connection request flow...");

          let clicked = await forceClick(page, SELECTORS.CONNECT_BUTTONS);

          if (!clicked) {
            console.log("Connect button not found in main bar, trying 'More' menu...");
            const moreClicked = await forceClick(page, SELECTORS.MORE_BUTTONS);
            if (moreClicked) {
              await humanDelay(2000, 3000);
              clicked = await forceClick(page, SELECTORS.DROPDOWN_CONNECT);
            }
          }

          if (clicked) {
            console.log("Connect button clicked. Handling modals...");
            
            // Handle "How do you know" if it appears
            await forceClick(page, "//button[contains(., 'Other')]", 2000);
            await forceClick(page, "//button[contains(., 'Connect') and not(contains(., 'Other'))]", 2000);

            // Add Note
            const noteAdded = await forceClick(page, SELECTORS.ADD_NOTE, 3000);
            if (noteAdded && lead.message) {
                const personalizedMessage = replacePlaceholders(lead.message, lead);
                await page.keyboard.type(personalizedMessage, { delay: 60 });
                await humanDelay(1000, 2000);
            }

            const sent = await forceClick(page, SELECTORS.SEND_INVITE, 3000);
            if (sent) {
              Leads.updateStatus(lead.id, 'CONNECT_SENT');
              Logs.add(lead.id, 'CONNECT', 'SUCCESS', `Connection request sent ${lead.message ? 'with' : 'without'} note`);
            } else {
              throw new Error("Failed to click final Send button");
            }
          } else {
            throw new Error("Connect button not found in main bar or More menu");
          }
        }

        const minDelay = parseInt(settings.min_delay_seconds || '45');
        const maxDelay = parseInt(settings.max_delay_seconds || '90');
        const delayMs = Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay) * 1000;
        await humanDelay(delayMs, delayMs + 2000);

      } catch (error: any) {
        console.error(`Failed to process lead ${lead.id}:`, error);
        Logs.add(lead.id, 'PROCESS', 'FAILED', error.message);
        Leads.updateStatus(lead.id, 'FAILED');
      }
    }
    return true;
  }
}

export const automation = new AutomationEngine();
