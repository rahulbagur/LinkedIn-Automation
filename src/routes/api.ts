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
  res.json({ 
    stats, 
    recentLogs,
    isRunning: automation.getIsRunning()
  });
});

// --- Leads Management ---
router.get('/leads', (req, res) => {
  const leads = Leads.getAll();
  res.json(leads);
});

router.delete('/leads/:id', (req, res) => {
  console.log(`[API] Attempting to delete lead ID: ${req.params.id}`);
  try {
    Leads.delete(req.params.id);
    console.log(`[API] Successfully deleted lead ID: ${req.params.id}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error(`[API] Error deleting lead ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/leads/bulk-delete', (req, res) => {
  const { ids } = req.body;
  console.log(`[API] Attempting bulk delete for ${ids?.length} leads`);
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'Invalid IDs' });

  try {
    for (const id of ids) {
      console.log(`[API] Calling Leads.delete for ID: ${id}`);
      Leads.delete(id);
    }
    console.log(`[API] Successfully bulk deleted ${ids.length} leads`);
    res.json({ success: true });
  } catch (error: any) {
    console.error(`[API] Error in bulk delete:`, error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/leads/reset', (req, res) => {
  console.log('[API] Resetting all leads to NEW status');
  try {
    const result = Leads.resetAll();
    res.json({ success: true, message: `Reset ${result.changes} leads to NEW` });
  } catch (error: any) {
    console.error('[API] Error resetting leads:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/leads/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  console.log('[API] Received CSV Import Request');
  console.log('[API] Mapping:', req.body.mapping);

  let mapping: any = {};
  try {
    if (req.body.mapping) {
      mapping = typeof req.body.mapping === 'string' 
        ? JSON.parse(req.body.mapping) 
        : req.body.mapping;
    }
  } catch (e) {
    console.error('[API] Failed to parse mapping JSON:', e);
  }

  try {
    const records = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      bom: true
    });

    console.log(`[API] Parsed ${records.length} records from CSV`);
    if (records.length > 0) {
      console.log('[API] CSV Headers detected:', Object.keys(records[0]));
    }

    let importedCount = 0;
    for (const record of records) {
      try {
        // Use provided mapping or fallback to auto-detect logic if mapping is missing
        let firstName = record[mapping.first_name] || record['First Name'] || record['first_name'];
        let lastName = record[mapping.last_name] || record['Last Name'] || record['last_name'];
        
        // Handle combined "Name" field if separate first/last names are missing
        if (!firstName && (record['Name'] || record['name'] || record[mapping.name])) {
          const fullName = record['Name'] || record['name'] || record[mapping.name];
          const parts = fullName.trim().split(/\s+/);
          firstName = parts[0];
          lastName = parts.slice(1).join(' ');
        }

        const lead = {
          linkedin_url: record[mapping.linkedin_url] || record['Linkedin Url'] || record['Person Linkedin Url'] || record['url'],
          first_name: firstName,
          last_name: lastName,
          company: record[mapping.company] || record['Company'] || record['company'],
          message: record[mapping.message] || record['Message'] || record['message'] || record['Connection Message'],
          notes: 'Imported from CSV'
        };

        if (lead.linkedin_url) {
          Leads.add(lead);
          importedCount++;
        }
      } catch (innerError: any) {
        console.error('[API] Error processing individual record:', innerError);
      }
    }

    console.log(`[API] Successfully imported ${importedCount} leads`);
    res.json({ message: `Successfully imported ${importedCount} leads`, count: importedCount });
  } catch (error: any) {
    console.error('[API] CSV Import Failure:', error);
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
