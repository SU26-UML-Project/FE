import { useState, useCallback } from 'react'

type CodeTab = 'plantuml' | 'mermaid' | 'xml'

interface CodePanelProps {
  diagramXml: string | null
  onClose: () => void
}

const CodePanel = ({ diagramXml, onClose }: CodePanelProps) => {
  const [activeTab, setActiveTab] = useState<CodeTab>('plantuml')
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [])

  const tabs: { key: CodeTab; label: string }[] = [
    { key: 'plantuml', label: 'PlantUML' },
    { key: 'mermaid', label: 'Mermaid' },
    { key: 'xml', label: 'XML' },
  ]

  const getCode = (tab: CodeTab): string => {
    if (!diagramXml) return ''

    switch (tab) {
      case 'xml':
        return diagramXml
      case 'plantuml':
      case 'mermaid':
        return ''
    }
  }

  const code = getCode(activeTab)

  const renderEmpty = () => (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center">
        <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        <p className="text-sm text-gray-400 font-medium mb-1">No diagram data</p>
        <p className="text-xs text-gray-400">Draw something and save to see the code</p>
      </div>
    </div>
  )

  const renderConversionPlaceholder = () => (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-xs">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 flex items-center justify-center">
          <svg className="w-6 h-6 text-uml-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.58 5.58m0-11.17l5.58 5.58M13.17 11.42l5.58-5.58m0 11.17l-5.58-5.58M12 2v4m0 16v-4m-6-6H2m20 0h-4" />
          </svg>
        </div>
        <p className="text-sm font-bold text-black mb-1">Auto-convert coming soon</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          {activeTab === 'plantuml'
            ? 'PlantUML conversion will be available once the backend converter service is ready.'
            : 'Mermaid conversion will be available once the backend converter service is ready.'}
        </p>
        <p className="text-xs text-gray-400 mt-3">
          Switch to the <span className="font-bold">XML</span> tab to see the raw diagram data
        </p>
      </div>
    </div>
  )

  const renderXmlCode = () => (
    <div className="flex-1 overflow-auto p-4">
      <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap break-all leading-relaxed">
        {code}
      </pre>
    </div>
  )

  return (
    <div className="w-[420px] border-l border-gray-200 bg-white flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200 shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Code Export</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          aria-label="Close code panel"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex border-b border-gray-200 shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors relative ${
              activeTab === tab.key
                ? 'text-uml-blue'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-uml-blue rounded-full" />
            )}
          </button>
        ))}
      </div>

      {!diagramXml && renderEmpty()}

      {diagramXml && activeTab === 'xml' && renderXmlCode()}

      {diagramXml && activeTab !== 'xml' && renderConversionPlaceholder()}

      {diagramXml && activeTab === 'xml' && (
        <div className="border-t border-gray-200 p-3 shrink-0">
          <button
            onClick={() => handleCopy(code)}
            className={`w-full py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
              copied
                ? 'bg-green-50 text-green-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {copied ? 'Copied!' : 'Copy XML'}
          </button>
        </div>
      )}
    </div>
  )
}

export default CodePanel
