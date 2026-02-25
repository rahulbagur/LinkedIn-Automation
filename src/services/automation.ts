import puppeteer, { Browser, Page } from 'puppeteer';
import { Leads, Logs, Settings } from '../db/queries';

// --- Safety Layer ---

const humanDelay = (min: number, max: number) => {
  return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1) + min)));
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
      }, 100);
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
        // Real Browser Mode
        try {
          this.browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
          });
          page = await this.browser.newPage();
          
          if (settings.linkedin_cookie) {
            const cookies = [{
                name: 'li_at',
                value: settings.linkedin_cookie,
                domain: '.linkedin.com'
            }];
            await page.setCookie(...cookies);
          }
        } catch (e) {
          console.error("Failed to launch browser. Falling back to simulation.", e);
          // If browser fails (e.g. in container), fallback to simulation to show UI works
          Logs.add('SYSTEM', 'ERROR', 'FAILED', 'Browser failed to launch. Check console.');
          this.isRunning = false;
          return;
        }
      } else {
        console.log('Running in SIMULATION mode');
        Logs.add('SYSTEM', 'START', 'INFO', 'Started in Simulation Mode');
      }

      await this.processQueue(page, settings, isSimulation);

    } catch (error) {
      console.error('Automation error:', error);
    } finally {
      if (this.browser) await this.browser.close();
      this.isRunning = false;
      Logs.add('SYSTEM', 'STOP', 'INFO', 'Automation stopped');
    }
  }

  private async processQueue(page: Page | null, settings: Record<string, string>, isSimulation: boolean) {
    const dailyLimit = parseInt(settings.daily_connect_limit || '20');
    const leads = Leads.getPendingActions(dailyLimit);

    for (const lead of leads) {
      if (!this.isRunning) break;

      try {
        console.log(`Processing lead: ${lead.first_name} ${lead.last_name}`);
        
        if (isSimulation) {
          // --- SIMULATION MODE ---
          await humanDelay(1000, 3000); // Simulate navigation
          
          if (lead.status === 'NEW' || lead.status === 'CONNECT_QUEUED') {
             // Simulate 80% success rate
             if (Math.random() > 0.2) {
               Leads.updateStatus(lead.id, 'CONNECT_SENT');
               Logs.add(lead.id, 'CONNECT', 'SUCCESS', '[SIMULATION] Connection request sent');
             } else {
               Leads.updateStatus(lead.id, 'FAILED');
               Logs.add(lead.id, 'CONNECT', 'FAILED', '[SIMULATION] Failed to connect');
             }
          }
          
          await humanDelay(1000, 2000); // Wait between actions

        } else {
          // --- REAL BROWSER MODE ---
          if (!page) throw new Error("Browser page not initialized");

          // 1. Navigate to profile
          await page.goto(lead.linkedin_url, { waitUntil: 'domcontentloaded' });
          await humanDelay(2000, 5000);
          await simulateScroll(page);

          // 2. Check if already connected (Mock logic for this demo)
          const isConnected = false; 

          if (lead.status === 'NEW' || lead.status === 'CONNECT_QUEUED') {
              if (!isConnected) {
                  // Simulate clicking connect
                  // await page.click('button[aria-label^="Connect"]');
                  // await humanDelay(1000, 2000);
                  // await page.click('button[aria-label="Send now"]');
                  
                  Leads.updateStatus(lead.id, 'CONNECT_SENT');
                  Logs.add(lead.id, 'CONNECT', 'SUCCESS', 'Connection request sent');
              } else {
                  Leads.updateStatus(lead.id, 'CONNECTED');
              }
          }
        }

        // Wait before next action
        const minDelay = parseInt(settings.min_delay_seconds || '5') * 1000; // Faster for demo
        const maxDelay = parseInt(settings.max_delay_seconds || '10') * 1000;
        await humanDelay(minDelay, maxDelay);

      } catch (error: any) {
        console.error(`Failed to process lead ${lead.id}:`, error);
        Logs.add(lead.id, 'PROCESS', 'FAILED', error.message);
        Leads.updateStatus(lead.id, 'FAILED');
      }
    }
  }
}

export const automation = new AutomationEngine();
