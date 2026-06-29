import { ArrowLeft, Save, Download, Bot, BotOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useEditableName } from '../../hooks/useEditableName'

interface WorkspaceToolbarProps {
  workspaceName: string
  onNameChange: (name: string) => void
  onBack: () => void
  onSave: () => void
  onExport: () => void
  aiEnabled: boolean
  onAiToggle: (enabled: boolean) => void
  saveStatus?: 'saved' | 'saving' | 'error'
}

export default function WorkspaceToolbar({
  workspaceName,
  onNameChange,
  onBack,
  onSave,
  onExport,
  aiEnabled,
  onAiToggle,
  saveStatus = 'saved',
}: WorkspaceToolbarProps) {
  const {
    isEditing,
    editName,
    inputRef,
    setEditName,
    startEditing,
    handleSubmitName,
    handleKeyDown,
  } = useEditableName(workspaceName, onNameChange)

  return (
    <div className="h-10 bg-gradient-to-r from-uml-blue to-blue-700 shadow-sm border-b border-blue-400/10 flex items-center justify-between px-4 shrink-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-md hover:bg-blue-600 text-blue-200 hover:text-white transition"
          aria-label="Back to Dashboard"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="text-sm font-extrabold text-blue-100 tracking-wider select-none whitespace-nowrap">DiaUML Studio</span>
        <span className="w-px h-5 bg-blue-400/40" />
        {isEditing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={handleSubmitName}
            onKeyDown={handleKeyDown}
            className="text-sm font-bold text-white bg-blue-600 border border-blue-400 rounded px-2 py-1 focus:outline-none focus:border-white"
          />
        ) : (
          <button
            onClick={startEditing}
            className="group flex items-center gap-1.5"
          >
            <span className="text-sm font-bold text-white">{workspaceName}</span>
            <svg className="w-3.5 h-3.5 text-blue-300 group-hover:text-white transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onAiToggle(!aiEnabled)}
          className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
            aiEnabled
              ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 shadow-sm'
              : 'text-blue-200 hover:text-white hover:bg-blue-600'
          }`}
          title={aiEnabled ? 'Disable AI Assistant' : 'Enable AI Assistant'}
        >
          {aiEnabled ? <Bot size={14} /> : <BotOff size={14} />}
          AI
        </button>
        <span className="w-px h-5 bg-blue-400/40" />
        <button
          onClick={onExport}
          className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider text-blue-100 hover:text-white hover:bg-blue-600 transition flex items-center gap-1.5"
        >
          <Download size={14} />
          Export
        </button>
        <button
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm ml-1 ${
            saveStatus === 'saving' 
              ? 'bg-blue-600/50 text-blue-200 cursor-not-allowed'
              : saveStatus === 'error'
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-white text-uml-blue hover:bg-blue-50'
          }`}
        >
          {saveStatus === 'saving' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saveStatus === 'error' ? (
            <AlertCircle size={14} />
          ) : saveStatus === 'saved' ? (
            <CheckCircle2 size={14} className="text-emerald-500" />
          ) : (
            <Save size={14} />
          )}
          {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'error' ? 'Retry Save' : 'Saved'}
        </button>
      </div>
    </div>
  )
}
