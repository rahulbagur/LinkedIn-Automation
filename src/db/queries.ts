import { v4 as uuidv4 } from 'uuid';
import db from './index';

export interface Lead {
  id: string;
  linkedin_url: string;
  first_name: string;
  last_name: string;
  company: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
  last_action_at: string | null;
  next_action_at: string | null;
}

export interface Setting {
  key: string;
  value: string;
}

export const Leads = {
  getAll: () => db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all() as Lead[],
  
  getStats: () => {
    const stats = db.prepare('SELECT status, COUNT(*) as count FROM leads GROUP BY status').all() as {status: string, count: number}[];
    return stats.reduce((acc, curr) => ({ ...acc, [curr.status]: curr.count }), {});
  },

  add: (lead: Partial<Lead>) => {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO leads (id, linkedin_url, first_name, last_name, company, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const id = uuidv4();
    stmt.run(id, lead.linkedin_url, lead.first_name, lead.last_name, lead.company, lead.notes || '');
    return id;
  },

  updateStatus: (id: string, status: string) => {
    db.prepare('UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  },

  updateActionTimestamps: (id: string, nextActionAt: string | null) => {
    db.prepare(`
      UPDATE leads 
      SET last_action_at = CURRENT_TIMESTAMP, 
          next_action_at = ?,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(nextActionAt, id);
  },
  
  getPendingActions: (limit: number) => {
    // Logic to fetch leads that are ready for action
    // Simple version: Get NEW leads or leads with next_action_at < NOW
    return db.prepare(`
      SELECT * FROM leads 
      WHERE status IN ('NEW', 'CONNECT_QUEUED') 
      LIMIT ?
    `).all(limit) as Lead[];
  }
};

export const Settings = {
  getAll: () => {
    const rows = db.prepare('SELECT * FROM settings').all() as Setting[];
    return rows.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}) as Record<string, string>;
  },
  
  update: (key: string, value: string) => {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  }
};

export const Logs = {
  add: (leadId: string, actionType: string, status: string, details: string) => {
    db.prepare('INSERT INTO action_logs (lead_id, action_type, status, details) VALUES (?, ?, ?, ?)').run(leadId, actionType, status, details);
  },
  getRecent: (limit = 50) => {
    return db.prepare(`
      SELECT l.first_name, l.last_name, a.* 
      FROM action_logs a 
      LEFT JOIN leads l ON a.lead_id = l.id 
      ORDER BY a.created_at DESC 
      LIMIT ?
    `).all(limit);
  }
};
