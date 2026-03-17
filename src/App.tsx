/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Settings as SettingsIcon, Trash2, RotateCcw } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ImportLeads from './components/ImportLeads';
import Settings from './components/Settings';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-10">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight">LinkedIn<span className="text-blue-600">Auto</span></h1>
          <p className="text-xs text-gray-500 mt-1">Local Automation Suite</p>
        </div>
        
        <nav className="px-3 space-y-1">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <NavItem 
            icon={<Users size={20} />} 
            label="Leads & Import" 
            active={activeTab === 'leads'} 
            onClick={() => setActiveTab('leads')} 
          />
          <NavItem 
            icon={<SettingsIcon size={20} />} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'leads' && (
            <div className="space-y-6">
              <ImportLeads />
              <LeadsList />
            </div>
          )}
          {activeTab === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active 
          ? 'bg-blue-50 text-blue-700' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function LeadsList() {
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Fetch leads on mount
  const fetchLeads = () => {
    fetch('/api/leads').then(res => res.json()).then(setLeads);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchLeads();
        const newSelected = new Set(selectedIds);
        newSelected.delete(id);
        setSelectedIds(newSelected);
      }
    } catch (error) {
      console.error('Failed to delete lead:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} leads?`)) return;

    try {
      const res = await fetch('/api/leads/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      
      if (res.ok) {
        fetchLeads();
        setSelectedIds(new Set());
      }
    } catch (error) {
      console.error('Failed to bulk delete leads:', error);
    }
  };

  const handleResetLeads = async () => {
    if (!confirm('Are you sure you want to reset ALL leads back to NEW? This will clear current progress.')) return;

    try {
      const res = await fetch('/api/leads/reset', { method: 'POST' });
      if (res.ok) {
        fetchLeads();
      }
    } catch (error) {
      console.error('Failed to reset leads:', error);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold text-gray-900">All Leads</h2>
          <span className="text-xs text-gray-500">{leads.length} leads found</span>
        </div>
        
        <div className="flex items-center gap-3">
          {leads.length > 0 && (
            <button 
              onClick={handleResetLeads}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 text-xs font-semibold rounded-md hover:bg-gray-100 transition-colors border border-gray-200"
              title="Set all leads back to NEW status"
            >
              <RotateCcw size={14} />
              Reset All Progress
            </button>
          )}
          
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2 duration-200">
              <span className="text-sm font-medium text-blue-600">{selectedIds.size} selected</span>
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded-md hover:bg-red-100 transition-colors border border-red-100"
              >
                <Trash2 size={14} />
                Delete Selected
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-50 text-gray-500 font-medium">
            <tr>
              <th className="px-4 py-3 w-10">
                <input 
                  type="checkbox" 
                  checked={leads.length > 0 && selectedIds.size === leads.length}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                />
              </th>
              <th className="px-6 py-3 text-left">Name</th>
              <th className="px-6 py-3 text-left">Company</th>
              <th className="px-6 py-3 text-left">Message</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                  No leads found. Use the import tool above to add some!
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr 
                  key={lead.id} 
                  className={`hover:bg-gray-50 group transition-colors ${selectedIds.has(lead.id) ? 'bg-blue-50/30' : ''}`}
                >
                  <td className="px-4 py-3">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                    />
                  </td>
                  <td className="px-6 py-3 font-medium text-gray-900">
                    {lead.first_name} {lead.last_name}
                  </td>
                  <td className="px-6 py-3 text-gray-500">{lead.company}</td>
                                  <td className="px-6 py-3 text-gray-500 italic max-w-xs truncate">
                                    {lead.message || <span className="text-gray-300 text-xs italic">No message</span>}
                                  </td>                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      lead.status === 'CONNECTED' ? 'bg-green-100 text-green-800' :
                      lead.status === 'CONNECT_SENT' ? 'bg-yellow-100 text-yellow-800' :
                      lead.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button 
                      onClick={() => handleDelete(lead.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete Lead"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

