import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, Users, Settings as SettingsIcon, Play, Square, Upload, AlertCircle } from 'lucide-react';

// Types
interface Stats {
  NEW?: number;
  CONNECT_SENT?: number;
  CONNECTED?: number;
  FAILED?: number;
}

interface Log {
  id: number;
  first_name: string;
  last_name: string;
  action_type: string;
  status: string;
  details: string;
  created_at: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({});
  const [logs, setLogs] = useState<Log[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data.stats);
      setLogs(data.recentLogs);
      setIsRunning(data.isRunning);
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const toggleAutomation = async () => {
    const endpoint = isRunning ? '/api/automation/stop' : '/api/automation/start';
    await fetch(endpoint, { method: 'POST' });
    setIsRunning(!isRunning);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={toggleAutomation}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isRunning 
              ? 'bg-red-100 text-red-700 hover:bg-red-200' 
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {isRunning ? <><Square size={18} /> Stop Automation</> : <><Play size={18} /> Start Automation</>}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="New Leads" value={stats.NEW || 0} color="bg-blue-50 text-blue-700" />
        <StatCard label="Requests Sent" value={stats.CONNECT_SENT || 0} color="bg-yellow-50 text-yellow-700" />
        <StatCard label="Connected" value={stats.CONNECTED || 0} color="bg-green-50 text-green-700" />
        <StatCard label="Failed" value={stats.FAILED || 0} color="bg-red-50 text-red-700" />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Activity size={18} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {logs.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No activity yet. Start a campaign!</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="px-6 py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${log.status === 'SUCCESS' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium text-gray-900">{log.first_name} {log.last_name}</span>
                  <span className="text-gray-500">{log.action_type}</span>
                </div>
                <div className="text-gray-400 text-xs">
                  {new Date(log.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className={`p-6 rounded-xl ${color}`}>
      <div className="text-sm font-medium opacity-80">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}
