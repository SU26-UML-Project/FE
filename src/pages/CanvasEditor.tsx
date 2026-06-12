import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import CanvasToolbar from '../components/Canvas/CanvasToolbar'
import CanvasFrame from '../components/Canvas/CanvasFrame'
import CodePanel from '../components/Canvas/CodePanel'

const CanvasEditor = () => {
  const navigate = useNavigate()
  const [isCodePanelOpen, setIsCodePanelOpen] = useState(false)
  const [diagramName, setDiagramName] = useState('Untitled Diagram')
  const [diagramXml, setDiagramXml] = useState<string | null>(null)

  const handleXmlChange = useCallback((xml: string) => {
    setDiagramXml(xml)
  }, [])

  const handleSave = useCallback((xml: string) => {
    setDiagramXml(xml)
  }, [])

  const handleExportPng = useCallback(() => {
  }, [])

  const handleExportXml = useCallback(() => {
  }, [])

  return (
    <div className="h-screen flex flex-col bg-white">
      <CanvasToolbar
        diagramName={diagramName}
        onNameChange={setDiagramName}
        onBack={() => navigate('/dashboard')}
        onToggleCode={() => setIsCodePanelOpen(prev => !prev)}
        isCodePanelOpen={isCodePanelOpen}
        onExportPng={handleExportPng}
        onExportXml={handleExportXml}
      />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative flex flex-col">
          <div className="flex-1 relative">
            <CanvasFrame
              onXmlChange={handleXmlChange}
              onSave={handleSave}
            />
          </div>
          <div className="h-6 border-t border-gray-200 bg-gray-50/50 flex items-center justify-center shrink-0">
            <span className="text-[10px] text-gray-400 tracking-wider select-none">
              Draw.io based canvas
            </span>
          </div>
        </div>
        {isCodePanelOpen && (
          <CodePanel
            diagramXml={diagramXml}
            onClose={() => setIsCodePanelOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

export default CanvasEditor
