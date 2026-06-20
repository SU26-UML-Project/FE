import React from 'react';
import {
  FileText, Trash2, RefreshCw, Loader2, CheckCircle2, XCircle, FilePlus, Layers,
} from 'lucide-react';
import { aiAdminService, AiDocument, AiWorkspaceInfo } from '../../services/aiAdminService';

const DocumentsTab: React.FC = () => {
  const [documents, setDocuments] = React.useState<AiDocument[]>([]);
  const [workspaces, setWorkspaces] = React.useState<AiWorkspaceInfo[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [loadingWs, setLoadingWs] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [reEmbedding, setReEmbedding] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    initWorkspaces();
  }, []);

  React.useEffect(() => {
    if (!loadingWs && selectedWorkspace) {
      fetchDocuments(selectedWorkspace);
    }
  }, [selectedWorkspace, loadingWs]);

  const initWorkspaces = async () => {
    setLoadingWs(true);
    try {
      const res = await aiAdminService.getWorkspaces();
      const list = res.result as AiWorkspaceInfo[];
      setWorkspaces(list);
      if (list.length > 0) {
        setSelectedWorkspace(list[0].slug);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load workspaces.' });
    } finally {
      setLoadingWs(false);
    }
  };

  const fetchDocuments = async (slug: string) => {
    setLoading(true);
    try {
      const res = await aiAdminService.getDocuments(slug);
      setDocuments(res.result as AiDocument[]);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load documents.' });
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWorkspace(e.target.value);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      await aiAdminService.uploadDocument(file, selectedWorkspace);
      setMessage({ type: 'success', text: `"${file.name}" uploaded to "${selectedWorkspace}".` });
      fetchDocuments(selectedWorkspace);
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Upload failed.' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (doc: AiDocument) => {
    if (!window.confirm(`Delete "${doc.filename}"? This action cannot be undone.`)) return;
    setMessage(null);
    try {
      await aiAdminService.deleteDocument(doc.docpath);
      setMessage({ type: 'success', text: `"${doc.filename}" deleted.` });
      fetchDocuments(selectedWorkspace);
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Delete failed.' });
    }
  };

  const handleReEmbed = async () => {
    setReEmbedding(true);
    setMessage(null);
    try {
      await aiAdminService.reEmbedDocuments(selectedWorkspace);
      setMessage({ type: 'success', text: 'Re-embedding completed.' });
      fetchDocuments(selectedWorkspace);
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Re-embed failed.' });
    } finally {
      setReEmbedding(false);
    }
  };

  const formatSize = (bytes: number | null): string => {
    if (bytes == null) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string | null): string => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      embedded: 'bg-emerald-100 text-emerald-700',
      processing: 'bg-amber-100 text-amber-700',
      pending: 'bg-gray-100 text-gray-600',
      failed: 'bg-red-100 text-red-600',
    };
    return styles[status] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div>
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-black">Documents</h1>
          <p className="text-lg text-admin-on-surface-variant mt-2">
            Upload and manage knowledge base documents for the AI workspace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReEmbed}
            disabled={reEmbedding || documents.length === 0}
            className="bg-gray-100 text-black font-bold text-[13px] uppercase px-5 py-3 rounded flex items-center gap-2 hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
          >
            {reEmbedding ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Re-embed All
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-sm text-sm font-bold flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* Workspace selector */}
      <div className="mb-6 flex items-center gap-3">
        <Layers size={18} className="text-admin-secondary" />
        <label className="text-sm font-bold text-admin-secondary">Workspace:</label>
        <select
          value={selectedWorkspace}
          onChange={handleWorkspaceChange}
          className="border border-admin-outline rounded-sm px-4 py-2 text-sm font-bold bg-white text-black focus:outline-none focus:ring-2 focus:ring-uml-blue/40 min-w-[200px]"
          disabled={loadingWs}
        >
          {workspaces.map((ws) => (
            <option key={ws.slug} value={ws.slug}>{ws.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-admin-outline rounded-sm overflow-hidden">
        <div className="p-8 border-b border-dashed border-admin-outline">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.docx,.csv,.json"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full py-12 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-3 hover:border-uml-blue hover:bg-blue-50/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={36} className="animate-spin text-uml-blue" />
            ) : (
              <FilePlus size={36} className="text-gray-300" />
            )}
            <div>
              <p className="text-sm font-bold text-black">Click to upload or drag and drop</p>
              <p className="text-[11px] text-admin-secondary mt-1">PDF, TXT, MD, DOCX, CSV, JSON (max 10MB)</p>
            </div>
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading || loadingWs ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-uml-blue" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-admin-secondary">
              <FileText size={28} className="opacity-40" />
              <p className="text-sm font-bold">No documents in this workspace</p>
              <p className="text-xs">Upload a file above to get started.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-admin-outline bg-gray-50/30 text-[11px] uppercase tracking-wider text-admin-secondary font-bold">
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Size</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Uploaded</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {documents.map((doc) => (
                  <tr key={doc.docId} className="border-b border-admin-outline hover:bg-gray-50/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <FileText size={16} className="text-gray-400 shrink-0" />
                        <span className="font-bold text-black truncate max-w-[300px]">{doc.filename}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-admin-on-surface-variant">{formatSize(doc.size)}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest ${statusBadge(doc.status)}`}>
                        {doc.status === 'embedded' ? 'Embedded' : doc.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-admin-on-surface-variant">{formatDate(doc.uploadedAt)}</td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleDelete(doc)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete document"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentsTab;
