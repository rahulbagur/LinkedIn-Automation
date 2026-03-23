# LinkedIn Automation Suite (v3.5)

A high-reliability, local automation tool that connects directly to your **real** browser session to manage LinkedIn connections and messaging safely.

## Key Features (v3.5)

- **Three-Route Intelligent Flow**: 
  - **Route 1 (Direct)**: Clicks the primary "Connect" button if immediately visible.
  - **Route 2 (Hidden)**: Automatically expands the "More" dropdown to find the "Connect" option if the primary button is missing.
  - **Route 3 (Connected)**: Detects existing "1st" degree connections and bypasses the connection flow to send direct messages.
- **Physical OS-Level Interaction**: Uses PowerShell-driven coordinate clicks and clipboard pasting (`Ctrl+V`) to bypass complex React/Ember event filters and guarantee focus.
- **Remote Debugging Connection**: Connects to your active Brave/Chrome session via port 9222. Uses your real cookies, history, and trusted session.
- **Ember/React Compatibility**: Improved selector strategy handles dynamic IDs (e.g., `msg-form-emberXXXX`) using partial attribute matching.
- **Stealth by Default**: Inherits your natural browser fingerprint and session trust.
- **Local Privacy**: Your data, logs, and lead lists never leave your machine.

## High Reliability Architecture

- **Selector Registry**: Prioritizes `aria-label` and stable accessibility attributes with multi-layer XPath fallbacks.
- **Connection Level Detection**: Uses targeted XPaths to identify relationship status (1st, 2nd, 3rd) and adjust the automation strategy in real-time.
- **Smart Modal Handling**: Automatically detects and processes "How do you know this person" steps and "Add a note" workflows.
- **Human-Like Delay System**: Implements randomized mouse movements and variable wait times.

## Prerequisites

1.  **Brave Browser** (Recommended) or Google Chrome.
2.  **Node.js** (v18+) and npm.
3.  **Windows OS** (Required for physical OS-level interaction features).

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

- **"Connection Failed"**: Ensure you have completely closed all browser windows before running the command in Step 1.
- **Verification**: Visit `http://localhost:9222` in your browser. You should see a list of open tabs.
- **UI Lock**: If buttons don't click, ensure you aren't manually moving the mouse *while* the bot is attempting a physical click.

## Disclaimer

This tool is for educational purposes. Automated use of LinkedIn carries risks. Connect to your real session at your own risk and use conservative limits (recommended < 20 actions/day).
