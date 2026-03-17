import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { Leads } from './src/db/queries';
import { initDb } from './src/db';

async function testImport() {
  try {
    initDb();
    const csvPath = 'Test/Master Leads List - Sheet16.csv';
    if (!fs.existsSync(csvPath)) {
      console.error('CSV file not found:', csvPath);
      return;
    }

    const buffer = fs.readFileSync(csvPath);
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      bom: true
    });

    console.log(`Parsed ${records.length} records`);
    let imported = 0;
    for (const record of records) {
      const lead = {
        linkedin_url: record['Linkedin Url'] || record['url'],
        first_name: record['First Name'],
        last_name: record['Last Name'],
        company: record['Company'],
        notes: 'Test Import'
      };
      if (lead.linkedin_url) {
        Leads.add(lead);
        imported++;
      }
    }
    console.log(`Imported ${imported} leads`);
    const allLeads = Leads.getAll();
    console.log(`Total leads in DB: ${allLeads.length}`);
  } catch (error) {
    console.error('Import test failed:', error);
  }
}

testImport();
