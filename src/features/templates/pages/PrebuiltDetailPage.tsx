import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Copy, ArrowLeft, Clock, Layers, FileText, Bot } from 'lucide-react'
import { projectService } from '../../../features/projects/api/projectApi'
import { sheetService } from '../../../features/projects/api/sheetApi'
import { layoutElements } from '../../../shared/lib/elkLayout'
import type { DiagramType, FlowEdge, FlowNode } from '../../../types'
import toast from '../../../shared/lib/toast'

// Minimal types to fix errors
interface WorkspaceSheet {
  id: string;
  name: string;
  diagramType: DiagramType;
  canvasData?: { nodes: FlowNode[]; edges: FlowEdge[]; diagramType: DiagramType };
  thumbnail?: string;
}
interface PrebuiltMeta {
  name: string;
  domain: string;
  summary: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  coverImage?: string;
}
interface PrebuiltProject {
  meta: PrebuiltMeta;
  workspace: {
    name: string;
    category: string;
    sheets: WorkspaceSheet[];
    documents: any[];
    aiContext: any;
  };
}

export default function PrebuiltDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [project, setProject] = useState<PrebuiltProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [cloning, setCloning] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/prebuilts/${id}/project.json`)
        .then((r) => r.json())
        .then((data: PrebuiltProject) => setProject(data))
        .catch(() => {})
        .finally(() => setLoading(false))
  }, [id])

  const handleClone = async () => {
    if (!project) return
    setCloning(true)
    try {
      const createRes = await projectService.createProject({
        projectName: `${project.workspace.name} (Clone)`,
        description: project.workspace.category,
      });

      if (createRes.code === 200 && createRes.result) {
        const newProjectId = createRes.result.id;
        const sheets = project.workspace.sheets;
        const createdSheets = await sheetService.getSheetsByProject(newProjectId);
        const defaultSheet = createdSheets.result?.[0];

        if (!defaultSheet || !sheets.length) throw new Error('Unable to prepare project sheets');

        const saveSheet = async (sheet: WorkspaceSheet, orderIndex: number) => {
          const canvas = structuredClone(sheet.canvasData || { nodes: [], edges: [], diagramType: sheet.diagramType })
          const layouted = await layoutElements(canvas.nodes, canvas.edges, { diagramType: canvas.diagramType })
          return {
            name: sheet.name,
            orderIndex,
            projectId: newProjectId,
            diagramData: JSON.stringify({ ...canvas, ...layouted }),
          }
        }

        await sheetService.updateSheet(defaultSheet.id, await saveSheet(sheets[0], 0));
        await Promise.all(sheets.slice(1).map(async (sheet, index) => sheetService.createSheet(await saveSheet(sheet, index + 1))));

        toast.success('Project cloned successfully');
        navigate(`/workspace/${newProjectId}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to clone project');
    } finally {
      setCloning(false);
    }
  }

  if (loading) {
    return (
        <div className="h-screen flex items-center justify-center bg-white">
          <div className="w-10 h-10 border-2 border-uml-blue border-t-transparent rounded-full animate-spin" />
        </div>
    )
  }

  if (!project) {
    return (
        <div className="h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-400 mb-2">Project not found</h2>
            <button onClick={() => navigate('/dashboard')} className="text-sm text-uml-blue hover:underline">
              Back to Dashboard
            </button>
          </div>
        </div>
    )
  }

  const { meta, workspace } = project
  const sheetCount = workspace.sheets.length
  const docCount = workspace.documents.length

  return (
      <div className="min-h-screen bg-gray-50 pt-[72px]">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6 transition"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {meta.coverImage && <img src={meta.coverImage} alt={`Cover for ${meta.name}`} className="h-56 w-full border-b border-gray-100 object-cover" />}
            <div className="p-8 border-b border-gray-100">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-black text-black mb-2">{meta.name}</h1>
                  <p className="text-gray-500 mb-4">{meta.summary}</p>
                  <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2.5 py-1 bg-gray-100 rounded">
                    {meta.domain}
                  </span>
                    <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded ${
                        meta.difficulty === 'beginner' ? 'bg-green-50 text-green-600' :
                            meta.difficulty === 'intermediate' ? 'bg-amber-50 text-amber-600' :
                                'bg-red-50 text-red-600'
                    }`}>
                    {meta.difficulty}
                  </span>
                  </div>
                </div>
                <button
                    onClick={handleClone}
                    disabled={cloning}
                    className="shrink-0 px-6 py-3 bg-uml-blue text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  <Copy size={18} />
                  {cloning ? 'Cloning...' : 'Clone Project'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 border-b border-gray-100">
              <div className="p-6 text-center border-r border-gray-100">
                <Layers size={24} className="mx-auto mb-2 text-uml-blue" />
                <p className="text-2xl font-black text-black">{sheetCount}</p>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Diagrams</p>
              </div>
              <div className="p-6 text-center border-r border-gray-100">
                <FileText size={24} className="mx-auto mb-2 text-amber-500" />
                <p className="text-2xl font-black text-black">{docCount}</p>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Documents</p>
              </div>
              <div className="p-6 text-center">
                <Bot size={24} className="mx-auto mb-2 text-emerald-500" />
                <p className="text-2xl font-black text-black">{workspace.aiContext.clarifications.length}</p>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Clarifications</p>
              </div>
            </div>

            <div className="p-6">
              <h3 className="text-sm font-bold text-black mb-4">Sheets Preview</h3>
              <div className="space-y-2">
                {workspace.sheets.map((sheet) => (
                    <div key={sheet.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      {sheet.thumbnail ? <img src={sheet.thumbnail} alt={`Preview of ${sheet.name}`} className="h-12 w-20 rounded border border-gray-200 bg-white object-cover" /> : <div className="w-8 h-8 rounded bg-uml-blue/10 flex items-center justify-center text-uml-blue"><Layers size={16} /></div>}
                      <div>
                        <p className="text-sm font-bold text-black">{sheet.name}</p>
                        <span className="text-[10px] text-gray-400 uppercase">{sheet.diagramType}</span>
                      </div>
                    </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
              <Clock size={14} />
              Created with love by the DiaUML team &middot; Clone to edit
            </div>
          </div>
        </div>
      </div>
  )
}
