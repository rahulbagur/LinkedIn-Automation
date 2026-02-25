import { useState, useRef } from 'react';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';

export default function ImportLeads() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (res.ok) {
        setStatus({ type: 'success', message: data.message });
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setStatus({ type: 'error', message: data.error });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Leads</h2>
      
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
          <p className="text-xs text-gray-400">CSV with headers: Linkedin Url, First Name, Last Name, Company</p>
        </label>
      </div>

      {file && (
        <div className="mt-4 flex items-center justify-between bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{file.name}</span>
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {uploading ? 'Importing...' : 'Import Leads'}
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
