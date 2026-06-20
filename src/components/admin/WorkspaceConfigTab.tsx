import React from 'react';
import { Settings2, Save, Loader2, CheckCircle2, XCircle, MessageSquare, Bot, Search } from 'lucide-react';
import { aiAdminService, AiWorkspace, AiWorkspaceUpdateRequest } from '../../services/aiAdminService';

const CHAT_MODES = [
  { value: 'query', label: 'Query', icon: <Search size={16} />, desc: 'Direct question answering over documents' },
  { value: 'chat', label: 'Chat', icon: <MessageSquare size={16} />, desc: 'Conversational with history' },
  { value: 'agent', label: 'Agent', icon: <Bot size={16} />, desc: 'Autonomous tool-calling agent' },
];

const WorkspaceConfigTab: React.FC = () => {
  const [workspace, setWorkspace] = React.useState<AiWorkspace | null>(null);
  const [form, setForm] = React.useState<AiWorkspaceUpdateRequest>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    fetchWorkspace();
  }, []);

  const fetchWorkspace = async () => {
    setLoading(true);
    try {
      const res = await aiAdminService.getWorkspace();
      const ws = res.result as AiWorkspace;
      setWorkspace(ws);
      setForm({
        model: ws.chatModel || undefined,
        chatProvider: ws.chatProvider || undefined,
        chatMode: ws.chatMode || 'query',
        temperature: ws.temperature ?? 0.7,
        topN: ws.topN ?? 4,
        similarityThreshold: ws.similarityThreshold ?? 0.25,
      });
    } catch {
      setMessage({ type: 'error', text: 'Failed to load workspace settings.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await aiAdminService.updateWorkspace(form);
      setWorkspace(res.result as AiWorkspace);
      setMessage({ type: 'success', text: 'Workspace settings saved successfully.' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Failed to save workspace settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-uml-blue" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-black">Workspace Config</h1>
          <p className="text-lg text-admin-on-surface-variant mt-2">
            Configure RAG settings, chat mode, and model for the AnythingLLM workspace.
          </p>
        </div>
        {workspace && (
          <div className="text-right">
            <div className="text-sm font-bold text-black">{workspace.name}</div>
            <div className="text-[11px] font-bold text-admin-secondary uppercase tracking-wider">{workspace.slug}</div>
          </div>
        )}
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-sm text-sm font-bold flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-admin-outline rounded-sm p-6">
            <h2 className="text-xl font-bold text-black mb-2 flex items-center gap-2">
              <Settings2 size={20} className="text-uml-blue" />
              Model & Mode
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-admin-secondary uppercase tracking-wider">Chat Model</label>
                <input
                  type="text"
                  value={form.model || ''}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="gemma4:latest"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-admin-outline rounded-lg focus:ring-2 focus:ring-uml-blue/10 focus:border-uml-blue outline-none transition-all text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-admin-secondary uppercase tracking-wider">Chat Provider</label>
                <input
                  type="text"
                  value={form.chatProvider || ''}
                  onChange={(e) => setForm({ ...form, chatProvider: e.target.value })}
                  placeholder="ollama"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-admin-outline rounded-lg focus:ring-2 focus:ring-uml-blue/10 focus:border-uml-blue outline-none transition-all text-sm"
                />
              </div>
            </div>

            <label className="text-xs font-bold text-admin-secondary uppercase tracking-wider block mb-3">Chat Mode</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {CHAT_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setForm({ ...form, chatMode: mode.value })}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    form.chatMode === mode.value
                      ? 'border-uml-blue bg-blue-50/50'
                      : 'border-admin-outline bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className={`flex items-center gap-2 text-sm font-bold mb-1 ${
                    form.chatMode === mode.value ? 'text-uml-blue' : 'text-black'
                  }`}>
                    {mode.icon}
                    {mode.label}
                  </div>
                  <p className="text-[11px] text-admin-secondary">{mode.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-admin-outline rounded-sm p-6">
            <h2 className="text-xl font-bold text-black mb-2">RAG Settings</h2>
            <p className="text-sm text-admin-on-surface-variant mb-6">
              Fine-tune how the AI retrieves and uses context from documents.
            </p>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-admin-secondary uppercase tracking-wider">
                    Similarity Threshold
                  </label>
                  <span className="text-sm font-bold text-uml-blue">
                    {((form.similarityThreshold ?? 0.25) * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(form.similarityThreshold ?? 0.25) * 100}
                  onChange={(e) => setForm({ ...form, similarityThreshold: Number(e.target.value) / 100 })}
                  className="w-full accent-uml-blue"
                />
                <div className="flex justify-between text-[10px] text-admin-secondary">
                  <span>More results (0%)</span>
                  <span>Strict match (100%)</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-admin-secondary uppercase tracking-wider">
                    Max Context Snippets
                  </label>
                  <span className="text-sm font-bold text-uml-blue">{form.topN ?? 4}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={form.topN ?? 4}
                  onChange={(e) => setForm({ ...form, topN: Number(e.target.value) })}
                  className="w-full accent-uml-blue"
                />
                <div className="flex justify-between text-[10px] text-admin-secondary">
                  <span>1</span>
                  <span>20</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-admin-secondary uppercase tracking-wider">
                    Temperature
                  </label>
                  <span className="text-sm font-bold text-uml-blue">{(form.temperature ?? 0.7).toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={(form.temperature ?? 0.7) * 10}
                  onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) / 10 })}
                  className="w-full accent-uml-blue"
                />
                <div className="flex justify-between text-[10px] text-admin-secondary">
                  <span>Precise (0.0)</span>
                  <span>Creative (2.0)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-admin-outline rounded-sm p-6 h-fit">
          <h2 className="text-lg font-bold text-black mb-4">Current Settings</h2>
          {workspace && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-admin-secondary font-semibold">Documents</span>
                <span className="font-bold text-black">{workspace.documentCount}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-admin-secondary font-semibold">Chat Mode</span>
                <span className="font-bold text-black capitalize">{workspace.chatMode || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-admin-secondary font-semibold">Model</span>
                <span className="font-bold text-black">{workspace.chatModel || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-admin-secondary font-semibold">Provider</span>
                <span className="font-bold text-black">{workspace.chatProvider || '—'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-admin-secondary font-semibold">Temperature</span>
                <span className="font-bold text-black">{workspace.temperature ?? '—'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-uml-blue text-white font-bold text-[14px] uppercase px-8 py-3 rounded flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Workspace
        </button>
      </div>
    </div>
  );
};

export default WorkspaceConfigTab;
