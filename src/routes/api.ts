import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { Leads, Settings, Logs } from '../db/queries';
import { automation } from '../services/automation';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// --- Stats & Dashboard ---
router.get('/stats', (req, res) => {
  const stats = Leads.getStats();
  const recentLogs = Logs.getRecent(10);
  res.json({ stats, recentLogs });
});

// --- Leads Management ---
router.get('/leads', (req, res) => {
  const leads = Leads.getAll();
  res.json(leads);
});

router.post('/leads/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const records = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true
    });

    let importedCount = 0;
    for (const record of records) {
      // Map Apollo/CSV fields to our schema
      // Expected CSV headers: "Linkedin Url", "First Name", "Last Name", "Company"
      const lead = {
        linkedin_url: record['Linkedin Url'] || record['Person Linkedin Url'] || record['url'],
        first_name: record['First Name'] || record['first_name'],
        last_name: record['Last Name'] || record['last_name'],
        company: record['Company'] || record['company'],
        notes: 'Imported from CSV'
      };

      if (lead.linkedin_url) {
        Leads.add(lead);
        importedCount++;
      }
    }

    res.json({ message: `Successfully imported ${importedCount} leads` });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to parse CSV: ' + error.message });
  }
});

// --- Settings ---
router.get('/settings', (req, res) => {
  res.json(Settings.getAll());
});

router.post('/settings', (req, res) => {
  const { settings } = req.body;
  for (const [key, value] of Object.entries(settings)) {
    Settings.update(key, value as string);
  }
  res.json({ success: true });
});

// --- Automation Control ---
router.post('/automation/start', (req, res) => {
  automation.start();
  res.json({ status: 'started' });
});

router.post('/automation/stop', (req, res) => {
  automation.stop();
  res.json({ status: 'stopped' });
});

export default router;
