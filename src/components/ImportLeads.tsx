import React, { useState, useRef } from 'react';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';

export default function ImportLeads() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({
    linkedin_url: '',
    name: '',
    first_name: '',
    last_name: '',
    company: '',
    message: ''
  });
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autoDetectMapping = (csvHeaders: string[]) => {
    const newMapping = { ...mapping };
    const detect = (field: string, synonyms: string[]) => {
      const match = csvHeaders.find(h => synonyms.some(s => h.toLowerCase().includes(s.toLowerCase())));
      if (match) newMapping[field] = match;
    };

    detect('linkedin_url', ['linkedin url', 'person linkedin url', 'url', 'linkedin profile', 'profile url', 'prospect linkedin url']);
    detect('name', ['name', 'full name', 'fullname', 'contact name']);
    detect('first_name', ['first name', 'firstname', 'given name', 'first_name']);
    detect('last_name', ['last name', 'lastname', 'surname', 'last_name']);
    detect('company', ['company', 'organization', 'employer', 'company name']);
    detect('message', ['message', 'note', 'connection message', 'custom message']);

    setMapping(newMapping);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setStatus(null);

      // Read headers
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const firstLine = text.split('\n')[0];
        const csvHeaders = firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        setHeaders(csvHeaders);
        autoDetectMapping(csvHeaders);
      };
      reader.readAsText(selectedFile.slice(0, 1024)); // Just read first bit
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));

    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (res.ok) {
        setStatus({ type: 'success', message: data.message });
        setFile(null);
        setHeaders([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setStatus({ type: 'error', message: data.error });
      }
    } catch (error) {
      console.error('Fetch Error in handleUpload:', error);
      setStatus({ type: 'error', message: 'Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error') });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Leads</h2>
      
      {!file ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
            id="csv-upload"
          />
          
          <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <Upload size={24} />
            </div>
            <div>
              <span className="font-medium text-blue-600">Click to upload</span>
              <span className="text-gray-500"> or drag and drop</span>
            </div>
            <p className="text-xs text-gray-400">CSV files supported (Apollo, Prospeo, etc.)</p>
          </label>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
             <div className="flex items-center gap-3">
               <FileText size={20} className="text-gray-500" />
               <span className="text-sm font-medium text-gray-700">{file.name}</span>
             </div>
             <button onClick={() => {setFile(null); setHeaders([]);}} className="text-xs text-red-600 hover:underline">Change File</button>
          </div>

          <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
            <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
              Column Mapping
              <span className="text-[10px] font-normal bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Auto-detected</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MappingField label="LinkedIn URL *" value={mapping.linkedin_url} headers={headers} onChange={v => setMapping(m => ({...m, linkedin_url: v}))} />
              <MappingField label="Full Name (Auto-split)" value={mapping.name} headers={headers} onChange={v => setMapping(m => ({...m, name: v}))} />
              <MappingField label="First Name" value={mapping.first_name} headers={headers} onChange={v => setMapping(m => ({...m, first_name: v}))} />
              <MappingField label="Last Name" value={mapping.last_name} headers={headers} onChange={v => setMapping(m => ({...m, last_name: v}))} />
              <MappingField label="Company" value={mapping.company} headers={headers} onChange={v => setMapping(m => ({...m, company: v}))} />
              <MappingField label="Connection Message" value={mapping.message} headers={headers} onChange={v => setMapping(m => ({...m, message: v}))} />
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading || !mapping.linkedin_url}
            className="w-full py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-all shadow-sm"
          >
            {uploading ? 'Importing...' : 'Confirm Mapping & Import'}
          </button>
        </div>
      )}

      {status && (
        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
          status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {status.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {status.message}
        </div>
      )}
    </div>
  );
}

function MappingField({ label, value, headers, onChange }: { label: string, value: string, headers: string[], onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <select 
        value={value} 
        onChange={e => onChange(e.target.value)}
        className="w-full px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
      >
        <option value="">-- Skip Field --</option>
        {headers.map(h => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
    </div>
  );
}
