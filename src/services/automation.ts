import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { Leads, Logs, Settings } from '../db/queries';
import path from 'path';

// Use the stealth plugin
puppeteer.use(StealthPlugin());

// --- Safety Layer ---

const humanDelay = (min: number, max: number) => {
  return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1) + min)));
};

/**
 * DOM-level clicker with Puppeteer native fallback and Ember/React-compatible event dispatching.
 */
const forceClick = async (page: Page, selectors: string | string[], timeout = 3000) => {
  const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
  
  for (const selector of selectorArray) {
    try {
      // Auto-detect XPath vs CSS
      const isXPath = selector.startsWith('/') || selector.startsWith('(');
      const fullSelector = isXPath ? `xpath/${selector}` : selector;
      
      const handle = await page.waitForSelector(fullSelector, { timeout });
      if (handle) {
        await handle.scrollIntoView();
        await humanDelay(300, 600); // Wait for UI/Modal stability

        // Attempt Ember-compatible event dispatching
        const success = await handle.evaluate((el: any) => {
          if (!el) return false;
          
          // Ember.js often requires focus before event dispatching
          if (typeof el.focus === 'function') el.focus();
          
          // Dispatch sequence for Modern UI compatibility
          const opts = { bubbles: true, cancelable: true, view: window };
          el.dispatchEvent(new MouseEvent('mousedown', opts));
          el.dispatchEvent(new MouseEvent('mouseup', opts));
          el.dispatchEvent(new MouseEvent('click', opts));
          return true;
        });
        
        if (success) {
          console.log(`Ember-compatible click sequence dispatched for: ${selector}`);
          return true;
        }
      }
    } catch (e) {
      continue;
    }
  }
  return false;
};

// --- Selectors Registry ---

const SELECTORS = {
  CONNECT_BUTTONS: [
    "button[aria-label^='Connect']", // CSS Primary
    "//button[@aria-label='Connect' or contains(@aria-label, 'Connect with')]",
    "//a[@aria-label='Connect' or contains(@aria-label, 'Connect with')]",
    "//*[@id='workspace']//a[contains(., 'Connect') or contains(@aria-label, 'Connect')]",
    "//*[@id='workspace']//button[contains(., 'Connect') or contains(@aria-label, 'Connect')]",
    "//button[contains(@class, 'pvs-profile-actions__action')]//span[text()='Connect']/..",
    "//button[contains(@class, 'artdeco-button--primary') and contains(., 'Connect')]",
    "//button[.//span[text()='Connect']]",
    "//a[.//span[text()='Connect']]"
  ],
  MORE_BUTTONS: [
    "button[aria-label='More actions']",
    "button[aria-label='More']",
    "//button[@aria-label='More actions' or @aria-label='More']",
    "//button[contains(@class, 'pvs-profile-actions__action')]//span[text()='More']/..",
    "//button[contains(@class, 'artdeco-button--secondary') and (contains(., 'More') or contains(@aria-label, 'More actions'))]"
  ],
  DROPDOWN_CONNECT: [
    "div[role='button'][aria-label^='Connect']",
    "//div[@role='button' and (@aria-label='Connect' or contains(@aria-label, 'Connect'))]",
    "//div[@role='button']//span[text()='Connect']/..",
    "//li//div[contains(., 'Connect')]",
    "//span[text()='Connect']"
  ],
  SEND_INVITE: [
    "button[aria-label='Send now']",
    "button[aria-label='Send invitation']",
    "//button[@aria-label='Send now' or @aria-label='Send invitation']",
    "//button[contains(@class, 'artdeco-button--primary') and (contains(., 'Send') or contains(., 'Done'))]",
    "//div[contains(@class, 'artdeco-modal')]//button[contains(., 'Send')]",
    "//button[contains(., 'Send') and not(contains(., 'note'))]"
  ],
  ADD_NOTE: [
    "button[aria-label='Add a note']", // Static CSS - Highly reliable for Ember
    "//button[@aria-label='Add a note']",
    "//button[contains(., 'Add a note')]",
    "//button[contains(., 'Add Note')]",
    "//div[contains(@class, 'artdeco-modal')]//button[contains(., 'Add a note')]",
    "//button[contains(@class, 'artdeco-button--secondary') and contains(., 'Add a note')]",
    "//button[contains(@class, 'artdeco-button--secondary') and (contains(., 'Add note') or contains(., 'Add a note'))]",
    "//button[.//span[text()='Add a note']]",
    "//button[.//span[text()='Add note']]"
  ],
  MESSAGE_BOX: [
    "textarea[name='message']",
    "textarea#custom-message",
    "//textarea[@name='message' or @id='custom-message']",
    "//*[@role='textbox' or @aria-multiline='true']",
    "//div[contains(@class, 'msg-form__contenteditable')]",
    "//div[contains(@class, 'ql-editor')]",
    "//textarea[contains(@class, 'artdeco-text-area__element')]"
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
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
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
      }, 100 + Math.random() * 100);
    });
  });
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
        // Real Browser Mode - Connecting to existing session
        try {
          console.log('Connecting to Brave via remote debugging (127.0.0.1:9222)...');
          
          this.browser = await (puppeteer as any).connect({
            browserURL: 'http://127.0.0.1:9222',
            defaultViewport: null
          });
          
          const pages = await this.browser!.pages();
          page = pages.find(p => p.url().includes('linkedin.com')) || await this.browser!.newPage();
          
          console.log('Session verified via remote debugging.');
          await humanDelay(2000, 4000);
        } catch (e: any) {
          console.error("Failed to connect to browser. Ensure Brave is running with --remote-debugging-port=9222", e);
          Logs.add(null, 'ERROR', 'FAILED', `Connection failed: ${e.message}`);
          this.isRunning = false;
          return;
        }
      } else {
        console.log('Running in SIMULATION mode');
        Logs.add(null, 'START', 'INFO', 'Started in Simulation Mode');
      }

      // Keep running as long as isRunning is true
      while (this.isRunning) {
        const hasMore = await this.processQueue(page, settings, isSimulation);
        
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
      Logs.add(null, 'STOP', 'INFO', 'Automation stopped');
    }
  }

  stop() {
    this.isRunning = false;
    console.log('Stopping automation engine...');
  }

  getIsRunning() {
    return this.isRunning;
  }

  private async processQueue(page: Page | null, settings: Record<string, string>, isSimulation: boolean) {
    const dailyLimit = parseInt(settings.daily_connect_limit || '20');
    const leads = Leads.getPendingActions(dailyLimit);

    if (leads.length === 0) return false;

    for (const lead of leads) {
      if (!this.isRunning) break;

      try {
        console.log(`Processing lead: ${lead.first_name} ${lead.last_name} (Status: ${lead.status})`);
        
        if (isSimulation) {
          // --- SIMULATION MODE ---
          await humanDelay(2000, 4000);
          
          if (lead.status === 'NEW' || lead.status === 'CONNECT_QUEUED') {
             Leads.updateStatus(lead.id, 'CONNECT_SENT');
             Logs.add(lead.id, 'CONNECT', 'SUCCESS', `[SIMULATION] Connection sent`);
          } else if (lead.status === 'MSG_QUEUED' || lead.status === 'CONNECTED') {
             Leads.updateStatus(lead.id, 'MSG_SENT');
             Logs.add(lead.id, 'MESSAGE', 'SUCCESS', `[SIMULATION] Message sent`);
          }
        } else {
          // --- REAL BROWSER MODE ---
          if (!page) throw new Error("Browser page not initialized");

          // 1. Navigate with Retry
          let navigationSuccess = false;
          for (let i = 0; i < 3; i++) {
              if (!this.isRunning) break;
              try {
                  console.log(`Navigating to ${lead.linkedin_url} (Attempt ${i+1})`);
                  await page.goto(lead.linkedin_url, { 
                    waitUntil: 'networkidle2', 
                    timeout: 60000
                  });
                  
                  await humanDelay(5000, 10000);
                  await simulateScroll(page);
                  
                  const title = await page.title();
                  const finalUrl = page.url();

                  if (finalUrl.includes('authwall') || finalUrl.includes('login') || title.includes('Sign Up')) {
                      throw new Error("REDIRECTED_TO_SECURITY_CHECK");
                  }

                  navigationSuccess = true;
                  break;
              } catch (e: any) {
                  console.warn(`Navigation attempt ${i+1} failed: ${e.message}`);
                  await humanDelay(5000, 10000);
              }
          }

          if (!navigationSuccess) throw new Error("Navigation failed after multiple attempts");

          await humanMoveMouse(page);
          await humanDelay(2000, 4000);

          // --- ROBUSTNESS LAYER: Close any blocking chat windows ---
          await page.evaluate(() => {
              const chatHeader = document.querySelector('.msg-overlay-bubble-header');
              if (chatHeader) {
                  const closeBtn = chatHeader.querySelector('button[aria-label^="Close"], .msg-overlay-bubble-header__control--close');
                  if (closeBtn) (closeBtn as HTMLElement).click();
              }
          });

          // Determine Action: Connect or Message
          const pageState = await page.evaluate(() => {
              const buttons = Array.from(document.querySelectorAll('button'));
              const isPending = buttons.some(b => {
                  const t = b.innerText.toLowerCase();
                  return t.includes('pending') || t.includes('requested') || t.includes('withdraw');
              });
              const isConnected = buttons.some(b => {
                  const text = b.innerText.toLowerCase();
                  return (text === 'message' || text.includes('send message')) && 
                         (b.classList.contains('artdeco-button--primary') || b.classList.contains('pvs-profile-actions__action'));
              });
              return { isPending, isConnected };
          });

          if (lead.status === 'NEW' || lead.status === 'CONNECT_QUEUED') {
              if (pageState.isConnected) {
                  console.log("Lead is already connected. Updating status.");
                  Leads.updateStatus(lead.id, 'CONNECTED');
                  Logs.add(lead.id, 'CONNECT', 'INFO', "Already connected");
                  continue;
              }

              if (pageState.isPending) {
                  console.log("Connection request is already pending.");
                  Leads.updateStatus(lead.id, 'CONNECT_SENT');
                  Logs.add(lead.id, 'CONNECT', 'INFO', "Already pending");
                  continue;
              }

              // --- CONNECTION FLOW ---
              console.log("Initiating connection request...");

              let clicked = await forceClick(page, SELECTORS.CONNECT_BUTTONS);

              if (!clicked) {
                  console.log("Connect button not found in main bar, trying 'More' menu...");
                  const moreClicked = await forceClick(page, SELECTORS.MORE_BUTTONS);
                  if (moreClicked) {
                      await humanDelay(1500, 2500);
                      clicked = await forceClick(page, SELECTORS.DROPDOWN_CONNECT);
                  }
              }

              if (clicked) {
                  console.log("Connect button clicked. Waiting for page to stabilize...");
                  await humanDelay(4000, 6000);

                  // --- DEBUG SNAPSHOT ---
                  try {
                      const fs = await import('fs');
                      const html = await page.content();
                      fs.writeFileSync('debug_snapshot.html', html);
                      console.log('Snapshot saved to debug_snapshot.html');
                      console.log('Current page URL:', page.url());
                  } catch (e: any) {
                      console.error('Failed to save debug snapshot:', e.message);
                  }

                  // --- MODAL HANDLING LAYER ---
                  // Increased patience for modal detection
                  const sendInviteModalSelector = '[data-test-modal-id="send-invite-modal"]';
                  const genericModalSelector = '.artdeco-modal, [role="dialog"], .ip-modal';
                  let modalHandle = null;
                  
                  try {
                      console.log("Waiting for send-invite-modal...");
                      modalHandle = await page.waitForSelector(sendInviteModalSelector, { timeout: 8000 });
                  } catch (e) {
                      console.log("Send-invite-modal not found, checking for generic modal...");
                      try {
                          modalHandle = await page.waitForSelector(genericModalSelector, { timeout: 2000 });
                      } catch (err) {
                          console.log("No explicit modal detected. Proceeding to scan page for 'Add a note' buttons...");
                      }
                  }

                  if (modalHandle) {
                      console.log("Modal detected, stabilizing for 300ms...");
                      await humanDelay(300, 400);
                  }

                  // 2. Handle "How do you know" modal (Pre-Note Step)
                  const otherXPath = "//button[contains(., 'Other')]";
                  const otherClicked = await forceClick(page, otherXPath, 2000);
                  if (otherClicked) {
                      console.log("Handling 'How do you know' modal...");
                      await humanDelay(1500, 2500);
                      // Sometimes it's 'Next', sometimes it's 'Connect'
                      const nextStepXPaths = [
                        "//button[contains(., 'Connect') and not(contains(., 'Other'))]",
                        "//button[contains(., 'Next')]",
                        "//button[contains(@class, 'artdeco-button--primary') and contains(., 'Connect')]",
                        "//button[contains(@class, 'artdeco-button--primary') and contains(., 'Next')]"
                      ];
                      await forceClick(page, nextStepXPaths, 2500);
                      await humanDelay(2500, 4000);
                      
                      // Re-check for modal after 'Other' flow
                      try {
                          modalHandle = await page.waitForSelector(sendInviteModalSelector, { timeout: 4000 });
                      } catch (e) {}
                  }

                  // 3. Add Note
                  const personalizedMessage = lead.message ? replacePlaceholders(lead.message, lead) : null;
                  let noteAdded = false;
                  if (personalizedMessage) {
                      console.log("Attempting to add a note...");
                      
                      // Ensure we are using the most active LinkedIn page reference
                      const allPages = await page.browser().pages();
                      const activePage = allPages.find(p => p.url().includes('linkedin.com')) || page;

                      let addNoteClicked = false;
                      
                      // Strategy A: Coordinate-based Mouse Click (Real Mouse Simulation)
                      try {
                          console.log("Searching for 'Add a note' button for coordinate-based click...");
                          const addNoteBtn = await activePage.waitForSelector('[data-test-modal-id="send-invite-modal"] button[aria-label="Add a note"]', { visible: true, timeout: 5000 });
                          if (addNoteBtn) {
                              const box = await addNoteBtn.boundingBox();
                              if (box) {
                                  // Real mouse click at the center of the button
                                  await activePage.mouse.click(box.x + box.width/2, box.y + box.height/2);
                                  console.log("Coordinate-based mouse click successful.");
                                  addNoteClicked = true;
                              }
                          }
                      } catch (e: any) {
                          console.warn("Coordinate-based click failed:", e.message);
                      }
                      
                      // Strategy B: Fallback to broad forceClick
                      if (!addNoteClicked) {
                          const addNoteXPaths = [
                            ...SELECTORS.ADD_NOTE,
                            "//button[contains(@aria-label, 'Add a note')]",
                            "//button[contains(., 'Add a note')]",
                            "//span[contains(text(), 'Add a note')]/..",
                            "//a[contains(., 'Add a note')]"
                          ];
                          addNoteClicked = await forceClick(activePage, addNoteXPaths);
                      }
                      
                      if (addNoteClicked) {
                          console.log("'Add a note' clicked, waiting for text area...");
                          let typed = false;
                          for (const boxXPath of SELECTORS.MESSAGE_BOX) {
                              try {
                                  const boxHandle = await activePage.waitForSelector(`xpath/${boxXPath}`, { timeout: 2000 });
                                  if (boxHandle) {
                                      await boxHandle.focus();
                                      await boxHandle.click();
                                      await activePage.type(`xpath/${boxXPath}`, personalizedMessage, { delay: 100 });
                                      typed = true;
                                      break;
                                  }
                              } catch (e) {
                                  continue;
                              }
                          }

                          if (!typed) {
                             // Absolute fallback: use evaluate to set the text directly
                             await activePage.evaluate((msg: string) => {
                                const box = document.querySelector('textarea[name="message"], [role="textbox"], .msg-form__contenteditable, .ql-editor');
                                if (box) {
                                  (box as any).innerHTML = msg;
                                  (box as any).value = msg;
                                  box.dispatchEvent(new Event('input', { bubbles: true }));
                                  box.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                             }, personalizedMessage);
                          }
                          
                          await humanDelay(1000, 2000);
                          noteAdded = true;
                      }
                  }

                  // 4. Final Send
                  const sendClicked = await forceClick(page, SELECTORS.SEND_INVITE);

                  if (sendClicked) {
                      await humanDelay(3000, 5000);
                      console.log(`Connection request sent ${noteAdded ? 'with' : 'without'} note!`);
                      Leads.updateStatus(lead.id, 'CONNECT_SENT');
                      Logs.add(lead.id, 'CONNECT', 'SUCCESS', `Connection request sent ${noteAdded ? 'with' : 'without'} note`);
                  } else {
                      // Final check: did it send anyway?
                      const sentCheck = await page.evaluate(() => {
                        const body = document.body.innerText.toLowerCase();
                        return body.includes('invitation sent') || body.includes('invite sent') || body.includes('pending') || body.includes('withdraw');
                      });
                      if (sentCheck) {
                         Leads.updateStatus(lead.id, 'CONNECT_SENT');
                         Logs.add(lead.id, 'CONNECT', 'SUCCESS', 'Connection request sent (Verified via status)');
                      } else {
                         throw new Error("Failed to click final Send button and status did not change.");
                      }
                  }
              } else {
                  throw new Error("Connect button not found or could not be clicked.");
              }
          } else if (lead.status === 'MSG_QUEUED' || lead.status === 'CONNECTED') {
              // --- MESSAGING FLOW ---
              if (!pageState.isConnected) {
                  console.warn("Lead not connected yet, skipping message.");
                  continue; 
              }

              console.log("Initiating message flow...");
              const messageXPath = "//button[contains(., 'Message') and contains(@class, 'primary')]";
              try {
                  const messageHandle = await page.waitForSelector(`xpath/${messageXPath}`, { timeout: 5000 });
                  if (messageHandle) {
                      // DOM-level click for message button
                      await messageHandle.evaluate((btn: any) => (btn as HTMLElement).click());
                      await humanDelay(3000, 5000);
                      
                      const msgText = lead.message ? replacePlaceholders(lead.message, lead) : "Hi " + lead.first_name;
                      
                      // Focus and type into the editor
                      await page.waitForSelector('.msg-form__contenteditable', { timeout: 5000 });
                      await page.click('.msg-form__contenteditable');
                      await page.type('.msg-form__contenteditable', msgText, { delay: 80 });
                      await humanDelay(1500, 2500);

                      const sendMsgBtn = await page.waitForSelector('button.msg-form__send-button', { timeout: 5000 });
                      if (sendMsgBtn) {
                          // DOM-level click for send button
                          await sendMsgBtn.evaluate((btn: any) => (btn as HTMLElement).click());
                          await humanDelay(2000, 4000);
                          console.log("Message sent!");
                          Leads.updateStatus(lead.id, 'MSG_SENT');
                          Logs.add(lead.id, 'MESSAGE', 'SUCCESS', 'Message sent to connection');
                      } else {
                          throw new Error("Could not find Send message button");
                      }
                  } else {
                      throw new Error("Message button not found");
                  }
              } catch (e: any) {
                  throw new Error("Failed to send message: " + e.message);
              }
          }
        }

        const minDelay = parseInt(settings.min_delay_seconds || '45') * 1000;
        const maxDelay = parseInt(settings.max_delay_seconds || '90') * 1000;
        await humanDelay(minDelay, maxDelay);

      } catch (error: any) {
        console.error(`Failed to process lead ${lead.id}:`, error);
        Logs.add(lead.id, 'PROCESS', 'FAILED', error.message);
        Leads.updateStatus(lead.id, 'FAILED');
        if (error.message.includes('AUTHENTICATION_FAILED')) break;
      }
    }
    return true;
  }
}

export const automation = new AutomationEngine();
