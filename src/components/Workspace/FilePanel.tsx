import { useState, useRef } from 'react'
import { Upload, FileText, Trash2, FileCode, Image } from 'lucide-react'
import type { WorkspaceDocument } from '../../types/workspace'

interface FilePanelProps {
  documents: WorkspaceDocument[]
  onAddDocuments: (docs: WorkspaceDocument[]) => void
  onRemoveDocument: (id: string) => void
  compact?: boolean
}

const fileTypeConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  md: { icon: <FileText size={14} />, label: 'MD', color: 'bg-blue-100 text-blue-600' },
  pdf: { icon: <FileText size={14} />, label: 'PDF', color: 'bg-red-100 text-red-600' },
  image: { icon: <Image size={14} />, label: 'IMG', color: 'bg-green-100 text-green-600' },
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1048576).toFixed(1)}MB`
}

export default function FilePanel({ documents, onAddDocuments, onRemoveDocument, compact }: FilePanelProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => setIsDragOver(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files))
      e.target.value = ''
    }
  }

  const handleFiles = (files: File[]) => {
    const docs: WorkspaceDocument[] = files.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: f.name,
      type: getFileType(f.name),
      content: '',
      url: undefined,
    }))
    onAddDocuments(docs)
  }

  const getFileType = (name: string): WorkspaceDocument['type'] => {
    const ext = name.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return 'pdf'
    if (['png', 'jpg', 'jpeg', 'svg', 'gif'].includes(ext || '')) return 'image'
    return 'md'
  }

  return (
    <div className="flex flex-col">
      {/* File list — above upload zone, max 3 visible with scroll */}
      {documents.length > 0 && (
        <div className="space-y-1.5 mb-3 max-h-[140px] overflow-y-auto file-scroll">
          {[...documents].reverse().map((doc) => {
            const config = fileTypeConfig[doc.type] || fileTypeConfig.md
            return (
              <div key={doc.id} className="group flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${config.color}`}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{doc.name}</p>
                  <span className="text-[10px] text-gray-400 font-medium uppercase">{config.label}</span>
                </div>
                <button
                  onClick={() => onRemoveDocument(doc.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-500 transition"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Upload zone — below file list */}
      <div
        className={`transition-colors ${isDragOver ? 'bg-blue-50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-lg transition-all text-center
            ${isDragOver
              ? 'border-uml-blue bg-blue-50'
              : 'border-gray-200 hover:border-uml-blue hover:bg-gray-50'
            }
            ${compact ? 'p-3' : 'p-6'}
          `}
        >
          <Upload size={compact ? 16 : 20} className={`mx-auto mb-1 ${isDragOver ? 'text-uml-blue' : 'text-gray-300'}`} />
          <p className={`font-medium text-gray-400 ${compact ? 'text-[11px]' : 'text-xs'}`}>
            {isDragOver ? 'Drop files here' : 'Drop files or click to upload'}
          </p>
          {!compact && <p className="text-[10px] text-gray-300 mt-0.5">MD, PDF, images</p>}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".md,.pdf,.png,.jpg,.jpeg,.svg,.gif"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  )
}
