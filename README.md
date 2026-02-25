# LinkedIn Automation Suite

A local, privacy-focused browser automation tool for managing LinkedIn connections and campaigns safely.

## Features

- **Local Execution**: Runs on your machine, keeping your data private.
- **Smart Queue**: Manages leads and ensures daily limits are respected.
- **Safety First**: randomized delays, human-like scrolling, and working hours.
- **Dashboard**: Track your campaign performance in real-time.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start the Application**:
    ```bash
    npm run dev
    ```
    This starts both the backend server and the frontend UI.

3.  **Open in Browser**:
    Navigate to `http://localhost:3000`.

## Configuration

1.  **Import Leads**: Go to the "Leads & Import" tab and upload a CSV file with headers: `Linkedin Url`, `First Name`, `Last Name`, `Company`.
2.  **Settings**:
    -   Set your **Daily Limits** (e.g., 20 connections/day).
    -   **CRITICAL**: You must provide your LinkedIn `li_at` cookie in the Settings tab for the automation to authenticate.
    -   *Note*: For local debugging, you can modify `src/services/automation.ts` to set `headless: false` to see the browser in action.

## Architecture

-   **Frontend**: React + Tailwind CSS (Vite)
-   **Backend**: Node.js + Express
-   **Database**: SQLite (`better-sqlite3`)
-   **Automation**: Puppeteer

## Disclaimer

This tool is for educational purposes. Automating LinkedIn accounts carries a risk of restriction or banning. Use conservatively and at your own risk.
