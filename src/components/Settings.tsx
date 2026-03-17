import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(setSettings);
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Automation Settings</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Limits */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Daily Limits</h3>
          <SettingInput 
            label="Max Connection Requests" 
            value={settings.daily_connect_limit} 
            onChange={v => handleChange('daily_connect_limit', v)} 
            type="number"
          />
          <SettingInput 
            label="Max Messages" 
            value={settings.daily_message_limit} 
            onChange={v => handleChange('daily_message_limit', v)} 
            type="number"
          />
        </div>

        {/* Delays */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Safety Delays (Seconds)</h3>
          <div className="grid grid-cols-2 gap-4">
            <SettingInput 
              label="Min Delay" 
              value={settings.min_delay_seconds} 
              onChange={v => handleChange('min_delay_seconds', v)} 
              type="number"
            />
            <SettingInput 
              label="Max Delay" 
              value={settings.max_delay_seconds} 
              onChange={v => handleChange('max_delay_seconds', v)} 
              type="number"
            />
          </div>
        </div>

        {/* Mode */}
        <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Mode & Browser</h3>
          
          <div className="flex items-center gap-3">
             <input
                type="checkbox"
                id="simulation_mode"
                checked={settings.simulation_mode === 'true'}
                onChange={e => handleChange('simulation_mode', e.target.checked ? 'true' : 'false')}
                className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
             />
             <label htmlFor="simulation_mode" className="text-sm font-medium text-gray-700">
               Enable Simulation Mode (Safe for Demo/Testing)
             </label>
          </div>
          
          <div className="space-y-1 mt-4">
            <label className="text-sm font-medium text-gray-700">Custom Browser Path (Optional)</label>
            <input
              type="text"
              value={settings.browser_path || ''}
              onChange={e => handleChange('browser_path', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
            />
            <p className="text-xs text-gray-500">
              Leave empty to use the default Chrome. Point this to <b>Brave</b> if you're experiencing issues in Chrome.
            </p>
          </div>
        </div>

        {/* Auth */}
        <div className="col-span-1 md:col-span-2 space-y-6 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Authentication</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">LinkedIn "li_at" Cookie</label>
              <input
                type="password"
                value={settings.linkedin_cookie || ''}
                onChange={e => handleChange('linkedin_cookie', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Paste your li_at cookie here"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">LinkedIn "JSESSIONID" Cookie</label>
              <input
                type="password"
                value={settings.linkedin_jsessionid || ''}
                onChange={e => handleChange('linkedin_jsessionid', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder='ajax:XXXXXXXXXXXX'
              />
            </div>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 text-xs text-amber-800 space-y-2">
            <p className="font-semibold">How to find these cookies:</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>Open <b>LinkedIn.com</b> and log in.</li>
              <li>Open <b>Developer Tools</b> (F12 or Right-click &gt; Inspect).</li>
              <li>Go to the <b>Application</b> tab (or <b>Storage</b> in Firefox).</li>
              <li>Select <b>Cookies</b> &gt; <b>https://www.linkedin.com</b>.</li>
              <li>Find <b>li_at</b> and <b>JSESSIONID</b>, then copy their <b>Value</b>.</li>
              <li>Paste them above and click <b>Save Changes</b>.</li>
            </ol>
            <p className="italic">Note: If you logout of LinkedIn in your browser, these cookies will expire.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingInput({ label, value, onChange, type = 'text' }: any) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
