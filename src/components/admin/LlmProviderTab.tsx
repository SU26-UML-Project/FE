import React from 'react';
import { Cpu, Save, Zap, Loader2, CheckCircle2, XCircle, Database, RotateCw } from 'lucide-react';
import { aiAdminService, AiSystemConfig, AiSystemConfigRequest, AiTestConnection } from '../../services/aiAdminService';

const VECTOR_DBS = ['lancedb', 'qdrant', 'chroma', 'pinecone', 'weaviate', 'milvus'];
const DEFAULT_PROVIDERS = ['ollama', 'openai', 'anthropic', 'google', 'mistral', 'groq', 'together', 'deepseek'];

const LlmProviderTab: React.FC = () => {
  const [config, setConfig] = React.useState<AiSystemConfig | null>(null);
  const [form, setForm] = React.useState<AiSystemConfigRequest>({});
  const [providers, setProviders] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [detecting, setDetecting] = React.useState(false);
  const [models, setModels] = React.useState<string[]>([]);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<AiTestConnection | null>(null);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [configRes, providersRes] = await Promise.all([
        aiAdminService.getSystemConfig(),
        aiAdminService.getProviders(),
      ]);
      const cfg = configRes.result as AiSystemConfig;
      setConfig(cfg);
      setProviders(providersRes.result as string[]);
      setForm({
        llmProvider: cfg.llmProvider || undefined,
        model: cfg.model || undefined,
        baseUrl: undefined,
        apiKey: undefined,
        vectorDb: cfg.vectorDb || undefined,
        vectorDbEndpoint: cfg.vectorDbEndpoint || undefined,
      });
    } catch {
      setProviders(DEFAULT_PROVIDERS);
      setMessage({ type: 'error', text: 'Failed to load system config.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoDetect = async () => {
    setDetecting(true);
    try {
      const res = await aiAdminService.getProviderModels(form.llmProvider || '', form.baseUrl);
      const detected = res.result as string[];
      setModels(detected);
      if (detected.length > 0 && !form.model) {
        setForm({ ...form, model: detected[0] });
      }
    } catch {
      setMessage({ type: 'error', text: 'Auto-detect models failed.' });
    } finally {
      setDetecting(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await aiAdminService.testConnection();
      setTestResult(res.result as AiTestConnection);
    } catch {
      setTestResult({ connected: false, latencyMs: 0 });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await aiAdminService.updateSystemConfig(form);
      setConfig(res.result as AiSystemConfig);
      setMessage({ type: 'success', text: 'System configuration updated successfully.' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Failed to update config.' });
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
      <div className="mb-10">
        <h1 className="text-4xl font-black tracking-tight text-black">LLM Provider</h1>
        <p className="text-lg text-admin-on-surface-variant mt-2">
          Configure the language model provider and vector database for the AI system.
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-sm text-sm font-bold flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-admin-outline rounded-sm p-6">
          <h2 className="text-xl font-bold text-black mb-2 flex items-center gap-2">
            <Cpu size={20} className="text-uml-blue" />
            LLM Provider
          </h2>
          <p className="text-sm text-admin-on-surface-variant mb-6">
            Select the AI model provider and default model.
          </p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-admin-secondary uppercase tracking-wider">Provider</label>
              <select
                value={form.llmProvider || ''}
                onChange={(e) => { setForm({ ...form, llmProvider: e.target.value }); setModels([]); }}
                className="w-full px-4 py-2.5 bg-gray-50 border border-admin-outline rounded-lg focus:ring-2 focus:ring-uml-blue/10 focus:border-uml-blue outline-none transition-all text-sm"
              >
                <option value="">Select provider...</option>
                {providers.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-admin-secondary uppercase tracking-wider">Base URL</label>
              <input
                type="text"
                value={form.baseUrl || ''}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                placeholder={form.llmProvider === 'ollama' ? 'http://host.docker.internal:11434' : 'https://api.openai.com/v1'}
                className="w-full px-4 py-2.5 bg-gray-50 border border-admin-outline rounded-lg focus:ring-2 focus:ring-uml-blue/10 focus:border-uml-blue outline-none transition-all text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-admin-secondary uppercase tracking-wider">API Key</label>
              <input
                type="password"
                value={form.apiKey || ''}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder={config?.hasApiKey ? '•••••••• (key saved)' : 'Enter API key'}
                className="w-full px-4 py-2.5 bg-gray-50 border border-admin-outline rounded-lg focus:ring-2 focus:ring-uml-blue/10 focus:border-uml-blue outline-none transition-all text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-admin-secondary uppercase tracking-wider">Default Model</label>
              <div className="flex gap-2">
                {models.length > 0 ? (
                  <select
                    value={form.model || ''}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-admin-outline rounded-lg focus:ring-2 focus:ring-uml-blue/10 focus:border-uml-blue outline-none transition-all text-sm"
                  >
                    <option value="">Select model...</option>
                    {models.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form.model || ''}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    placeholder={form.llmProvider === 'ollama' ? 'gemma4:latest' : 'gpt-4o'}
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-admin-outline rounded-lg focus:ring-2 focus:ring-uml-blue/10 focus:border-uml-blue outline-none transition-all text-sm"
                  />
                )}
                {form.llmProvider === 'ollama' && (
                  <button
                    onClick={handleAutoDetect}
                    disabled={detecting}
                    className="bg-gray-100 text-black font-bold text-[13px] uppercase px-5 py-2.5 rounded flex items-center gap-2 hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    {detecting ? <Loader2 size={16} className="animate-spin" /> : <RotateCw size={16} />}
                    Detect
                  </button>
                )}
              </div>
              {models.length > 0 && (
                <button
                  onClick={() => { setModels([]); setForm({ ...form, model: '' }); }}
                  className="text-xs text-admin-secondary underline mt-1 hover:text-black transition-colors"
                >
                  Switch to manual input
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-admin-outline rounded-sm p-6">
            <h2 className="text-xl font-bold text-black mb-2 flex items-center gap-2">
              <Database size={20} className="text-uml-blue" />
              Vector Database
            </h2>
            <p className="text-sm text-admin-on-surface-variant mb-6">
              Configure the vector database for storing document embeddings.
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-admin-secondary uppercase tracking-wider">Provider</label>
                <select
                  value={form.vectorDb || ''}
                  onChange={(e) => setForm({ ...form, vectorDb: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-admin-outline rounded-lg focus:ring-2 focus:ring-uml-blue/10 focus:border-uml-blue outline-none transition-all text-sm"
                >
                  <option value="">Select vector DB...</option>
                  {VECTOR_DBS.map((v) => (
                    <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-admin-secondary uppercase tracking-wider">Endpoint</label>
                <input
                  type="text"
                  value={form.vectorDbEndpoint || ''}
                  onChange={(e) => setForm({ ...form, vectorDbEndpoint: e.target.value })}
                  placeholder={form.vectorDb === 'qdrant' ? 'http://qdrant:6333' : ''}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-admin-outline rounded-lg focus:ring-2 focus:ring-uml-blue/10 focus:border-uml-blue outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-admin-secondary uppercase tracking-wider">API Key</label>
                <input
                  type="password"
                  value={form.vectorDbApiKey || ''}
                  onChange={(e) => setForm({ ...form, vectorDbApiKey: e.target.value })}
                  placeholder="Optional API key"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-admin-outline rounded-lg focus:ring-2 focus:ring-uml-blue/10 focus:border-uml-blue outline-none transition-all text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-admin-outline rounded-sm p-6">
            <h2 className="text-xl font-bold text-black mb-2 flex items-center gap-2">
              <Zap size={20} className="text-uml-blue" />
              Connection Test
            </h2>

            {testResult && (
              <div className={`mb-4 p-3 rounded-sm text-sm font-bold flex items-center gap-2 ${
                testResult.connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                {testResult.connected ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <XCircle size={16} />
                )}
                {testResult.connected
                  ? `Connected — ${testResult.latencyMs}ms latency`
                  : 'Connection failed'}
              </div>
            )}

            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="bg-gray-100 text-black font-bold text-[13px] uppercase px-5 py-2.5 rounded flex items-center gap-2 hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {testing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              Test Connection
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-uml-blue text-white font-bold text-[14px] uppercase px-8 py-3 rounded flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Configuration
        </button>
      </div>
    </div>
  );
};

export default LlmProviderTab;
