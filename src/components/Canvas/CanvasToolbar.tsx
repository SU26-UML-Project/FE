import { useEditableName } from '../../hooks/useEditableName'

interface CanvasToolbarProps {
  diagramName: string
  onNameChange: (name: string) => void
  onBack: () => void
  onToggleCode: () => void
  isCodePanelOpen: boolean
  onExportPng?: () => void
  onExportXml?: () => void
}

const CanvasToolbar = ({
  diagramName,
  onNameChange,
  onBack,
  onToggleCode,
  isCodePanelOpen,
}: CanvasToolbarProps) => {
  const {
    isEditing,
    editName,
    inputRef,
    setEditName,
    startEditing,
    handleSubmitName,
    handleKeyDown,
  } = useEditableName(diagramName, onNameChange)

  return (
    <div className="h-10 border-b border-gray-200 bg-white flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition"
          aria-label="Back to Dashboard"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="w-px h-5 bg-gray-200" />

        <span className="text-xs font-bold text-gray-400 tracking-wider select-none">DiaUML Studio</span>

        <span className="w-px h-5 bg-gray-200" />

        {isEditing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={handleSubmitName}
            onKeyDown={handleKeyDown}
            className="text-sm font-bold text-black bg-gray-50 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-uml-blue focus:ring-1 focus:ring-uml-blue/20"
          />
        ) : (
          <button
            onClick={startEditing}
            className="group flex items-center gap-1.5"
          >
            <span className="text-sm font-bold text-black">{diagramName}</span>
            <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleCode}
          className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
            isCodePanelOpen
              ? 'bg-uml-blue text-white'
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          Code
        </button>

        <span className="w-px h-5 bg-gray-200" />

        <button className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition">
          Export
        </button>
      </div>
    </div>
  )
}

export default CanvasToolbar
