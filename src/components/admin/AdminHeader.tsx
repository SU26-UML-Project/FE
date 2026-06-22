import React from 'react';
import { Search, Bell, ExternalLink, ChevronDown, Loader2 } from 'lucide-react';
import { aiAdminService } from '../../services/aiAdminService';
import type { AiVersionInfo } from '../../types/ai';
import UserMenu from '../ui/UserMenu';

const ENV_OPTIONS = ['Development', 'Production'] as const;

const AdminHeader: React.FC = () => {
  const [versionInfo, setVersionInfo] = React.useState<AiVersionInfo | null>(null);
  const [versionLoading, setVersionLoading] = React.useState(true);
  const [env, setEnv] = React.useState('');
  const [envOpen, setEnvOpen] = React.useState(false);
  const envRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
    setEnv(apiUrl.includes('onrender.com') ? 'Production' : 'Development');
  }, []);

  React.useEffect(() => {
    let mounted = true;
    setVersionLoading(true);
    aiAdminService.getAiVersion()
      .then((res) => { if (mounted) setVersionInfo(res.result); })
      .catch(() => { if (mounted) setVersionInfo(null); })
      .finally(() => { if (mounted) setVersionLoading(false); });
    return () => { mounted = false; };
  }, []);

  React.useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (envRef.current && !envRef.current.contains(e.target as Node)) {
        setEnvOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="bg-white border-b border-admin-outline">
      <div className="px-8 lg:px-12">
        <div className="flex items-center justify-between py-3 gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <span className="text-lg font-black tracking-tight text-black shrink-0">DiaUML Studio</span>

            <div className="h-5 w-px bg-gray-200 shrink-0" />

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-admin-secondary uppercase tracking-wider">Env:</span>
              <div className="relative" ref={envRef}>
                <button
                  onClick={() => setEnvOpen(!envOpen)}
                  className="flex items-center gap-1.5 bg-gray-50 border border-admin-outline rounded text-[11px] font-bold py-1 pl-2 pr-5 outline-none hover:border-gray-300 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {env}
                </button>
                <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                {envOpen && (
                  <div className="absolute top-full left-0 mt-1 w-full min-w-[140px] bg-white border border-admin-outline rounded shadow-lg z-50 overflow-hidden">
                    {ENV_OPTIONS.map((opt) => {
                      const isActive = opt === env;
                      return (
                        <button
                          key={opt}
                          onClick={() => {}}
                          disabled={!isActive}
                          className={`w-full flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-left transition-colors ${
                            isActive
                              ? 'text-black bg-blue-50/50 cursor-default'
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isActive ? 'bg-emerald-500' : 'bg-gray-200'
                          }`} />
                          {opt}
                          {isActive && <span className="text-[9px] text-emerald-600 ml-auto">Active</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="h-5 w-px bg-gray-200 shrink-0" />

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-admin-secondary uppercase tracking-wider">LLM:</span>
              {versionLoading ? (
                <Loader2 size={12} className="animate-spin text-gray-400" />
              ) : (
                <span className="text-[12px] font-bold text-black">
                  AnythingLLM{versionInfo?.version ? ` v${versionInfo.version}` : ''}
                </span>
              )}
            </div>

            <a
              href="https://docs.anythingllm.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-bold text-uml-blue hover:underline shrink-0"
            >
              <ExternalLink size={11} />
              Docs
            </a>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center bg-gray-50 border border-admin-outline rounded px-3 py-1.5 focus-within:border-uml-blue transition-all max-w-[220px]">
              <Search size={14} className="text-gray-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none outline-none text-[12px] w-full p-0 placeholder:text-gray-400"
              />
            </div>

            <button className="relative p-1.5 text-gray-400 hover:text-black transition-colors">
              <Bell size={18} />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                2
              </span>
            </button>

            <UserMenu />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHeader;
