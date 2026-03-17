# LinkedIn Automation Suite (v3.0)

A high-reliability, local automation tool that connects directly to your **real** browser session to manage LinkedIn connections and messaging safely.

## Key Features (v3.0)

- **Remote Debugging Connection**: Connects to your active Brave/Chrome session via port 9222. Uses your real cookies, history, and trusted session.
- **React-Compatible Interaction**: Uses DOM-level events (`element.click()`) to ensure LinkedIn's React-based UI registers every action.
- **Stealth by Default**: Since it runs in your real browser, it inherits your natural browser fingerprint and session trust.
- **Unified Queue**: Handles Connection Requests and Direct Messaging in a single flow.
- **Local Privacy**: Your data, logs, and lead lists never leave your machine.

## High Reliability Architecture

- **Selector Strategy**: The bot uses a **Selector Registry** that prioritizes `aria-label` and other stable accessibility attributes. It automatically falls back to multiple alternative XPaths if a primary selector fails.
- **Smart Modal Handling**: Automatically detects LinkedIn's dynamic modals and handles the "How do you know this person" step and the "Add a note" workflow using React-compatible DOM events.
- **Human-Like Delay System**: Implements randomized mouse movements and variable wait times between actions to prevent detection.

## Prerequisites

1.  **Brave Browser** (Recommended) or Google Chrome.
2.  **Node.js** (v18+) and npm.

## Setup & Launch Guide

### 1. Launch Browser in Debug Mode
To allow the bot to connect to your real session, you **must** close all open browser windows and relaunch it via the terminal with the remote debugging flag.

**Windows (Brave):**
```powershell
& "C:\Users\Bagur\AppData\Local\BraveSoftware\Brave-Browser\Application\brave.exe" --remote-debugging-port=9222 --profile-directory="Profile 5"
```
*(Ensure all Brave windows are closed before running this command)*

**Windows (Chrome):**
```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

### 2. Start the Automation Suite
In a separate terminal, run:
```bash
npm install
npm run dev
```
Navigate to `http://localhost:3000`.

## How to Use

1.  **Browser Sync**: Once you launch your browser in debug mode (Step 1), open LinkedIn and ensure you are logged in.
2.  **Import Leads**: Go to the **Leads & Import** tab and upload your CSV.
3.  **Start Campaign**: On the **Dashboard**, toggle **Start Automation**. 
    - The bot will find your existing LinkedIn tab (or open a new one) and begin processing the queue.
    - You will see the actions happening live in your real browser window.

## Troubleshooting

- **"Connection Failed"**: Ensure you have completely closed all browser windows before running the command in Step 1. If a background process is still running, port 9222 won't open.
- **Verification**: To check if debug mode is active, visit `http://localhost:9222` in your browser. You should see a list of open tabs.
- **UI Lock**: If buttons don't click, ensure you aren't manually moving the mouse *while* the bot is attempting a click.

## Disclaimer

This tool is for educational purposes. Automated use of LinkedIn carries risks. Connect to your real session at your own risk and use conservative limits (recommended < 20 actions/day).
