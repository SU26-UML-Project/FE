import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Layers, ListTree, FileText, CheckCircle, Table, Eye, Cpu, AlertTriangle, Hash } from 'lucide-react'
import { getTemplateContent } from '../utils/templates'
import CanvasFrame from '../components/Canvas/CanvasFrame'
import type { TemplateContent } from '../utils/templates'

const badgeColors: Record<string, string> = {
  structural: 'bg-amber-100 text-amber-700 border-amber-200',
  behavioral: 'bg-blue-100 text-blue-700 border-blue-200',
  c4: 'bg-purple-100 text-purple-700 border-purple-200',
}

const categoryIcons: Record<string, typeof Layers> = {
  behavioral: ListTree,
  structural: FileText,
  'C4 Model': Cpu,
}

const iconBgColors: Record<string, string> = {
  structural: 'bg-amber-50 text-amber-600',
  behavioral: 'bg-blue-50 text-blue-600',
  c4: 'bg-purple-50 text-purple-600',
}

export default function TemplateDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [template, setTemplate] = useState<TemplateContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [diagramXml, setDiagramXml] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(false)
    getTemplateContent(id)
      .then(setTemplate)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    fetch(`/templates/${id}/diagram.xml`)
      .then(r => r.text())
      .then(setDiagramXml)
      .catch(() => setDiagramXml(null))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-admin-bg pt-[88px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-uml-blue border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-admin-bg pt-[88px] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-black text-black mb-2">Template not found</h2>
          <p className="text-gray-500 mb-6">The template you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-uml-blue text-white font-bold rounded-md hover:bg-blue-700 transition"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  const Icon = categoryIcons[template.category] || Layers

  return (
    <div className="min-h-screen bg-admin-bg pt-[88px]">
      <div className="relative max-w-5xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-black font-bold transition mb-8"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-white border border-admin-outline rounded-sm p-8 mb-8"
        >
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-5">
              <div className={`w-14 h-14 rounded flex items-center justify-center shrink-0 mt-1 ${iconBgColors[template.group] || 'bg-uml-blue/10 text-uml-blue'}`}>
                <Icon size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-black mb-2">{template.name}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1 rounded-[4px] text-[11px] font-black uppercase tracking-widest border ${badgeColors[template.group] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {template.type}
                  </span>
                  <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                    {template.category}
                  </span>
                  <span className={`px-3 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest border ${iconBgColors[template.group] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    {template.kind === 'knowledge' ? 'UML Library' : 'Sample Template'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-gray-700 leading-relaxed mb-6">{template.description}</p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-blue-50/50 border border-blue-100 rounded-sm p-5 mb-6"
          >
            <h3 className="text-sm font-black uppercase tracking-wider text-uml-blue mb-2">Purpose</h3>
            <p className="text-sm text-gray-700">{template.purpose}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mb-6"
          >
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-500 mb-3">Best For</h3>
            <ul className="space-y-2">
              {template.bestFor.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <CheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {template.kind === 'knowledge' && template.notSuitableFor && template.notSuitableFor.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="bg-amber-50/50 border border-amber-100 rounded-sm p-5"
            >
              <h3 className="text-sm font-black uppercase tracking-wider text-amber-600 mb-3 flex items-center gap-2">
                <AlertTriangle size={16} />
                Not Suitable For
              </h3>
              <ul className="space-y-2">
                {template.notSuitableFor.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                    <span className="text-amber-400 mt-0.5 shrink-0">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="bg-white border border-admin-outline rounded-sm p-8 mb-8"
        >
          <h2 className="text-lg font-black text-black mb-5 flex items-center gap-3">
            <ListTree size={20} className="text-uml-blue" />
            {template.kind === 'knowledge' ? 'What to Include' : 'Use Cases'}
          </h2>
          <ul className="space-y-3">
            {template.useCases.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="w-6 h-6 rounded-full bg-uml-blue/10 text-uml-blue flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="bg-white border border-admin-outline rounded-sm p-8 mb-8"
        >
          <h2 className="text-lg font-black text-black mb-5 flex items-center gap-3">
            <CheckCircle size={20} className="text-emerald-500" />
            {template.kind === 'knowledge' ? 'Required Inputs' : 'Requirements'}
          </h2>
          <div className="space-y-3">
            {template.requirements.map((req, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                  ✓
                </span>
                <span className="text-gray-700">{req}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="bg-white border border-admin-outline rounded-sm p-8 mb-8"
        >
          <h2 className="text-lg font-black text-black mb-5 flex items-center gap-3">
            <Table size={20} className="text-uml-blue" />
            Elements
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-admin-outline bg-gray-50/30 text-[11px] uppercase tracking-wider text-gray-500 font-bold">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                </tr>
              </thead>
              <tbody>
                {template.elements.map((el, i) => (
                  <tr key={i} className="border-b border-admin-outline hover:bg-gray-50/50 transition-colors text-sm">
                    <td className="py-3 px-4 font-bold text-black">{el.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-600">
                        {el.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{el.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {template.kind === 'knowledge' && template.confusableWith && template.confusableWith.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.35, delay: 0.25 }}
            className="bg-white border border-admin-outline rounded-sm p-8 mb-8"
          >
            <h2 className="text-lg font-black text-black mb-5 flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-500" />
              Confusable With
            </h2>
            <div className="space-y-4">
              {template.confusableWith.map((item, i) => (
                <div key={i} className="bg-amber-50/30 border border-amber-100 rounded-sm p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-black text-amber-700 shrink-0 mt-0.5">{item.diagram}</span>
                    <span className="text-sm text-gray-600">—</span>
                    <span className="text-sm text-gray-700">{item.difference}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {template.kind === 'knowledge' && template.keywords && template.keywords.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.35, delay: 0.3 }}
            className="bg-white border border-admin-outline rounded-sm p-8 mb-8"
          >
            <h2 className="text-lg font-black text-black mb-5 flex items-center gap-3">
              <Hash size={20} className="text-uml-blue" />
              Keywords
            </h2>
            <div className="flex flex-wrap gap-2">
              {template.keywords.map((kw, i) => (
                <span key={i} className="px-3 py-1.5 rounded-[4px] bg-gray-100 text-gray-600 text-[11px] font-bold uppercase tracking-wider">
                  {kw}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.35, delay: 0.35 }}
          className="bg-white border border-admin-outline rounded-sm p-8 mb-8"
        >
          <h2 className="text-lg font-black text-black mb-5 flex items-center gap-3">
            <Eye size={20} className="text-uml-blue" />
            Preview
          </h2>
          <div className="relative h-96 rounded-sm overflow-hidden border border-gray-200 bg-gray-50">
            <CanvasFrame onXmlChange={() => {}} onSave={() => {}} xml={diagramXml || undefined} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="flex justify-center pb-12"
        >
          <button
            onClick={() => navigate(`/canvas?template=${id}`)}
            className="px-10 py-4 bg-uml-blue text-white font-bold rounded-md text-sm uppercase tracking-wider hover:bg-blue-700 transition shadow-md active:scale-95"
          >
            Open in Canvas
          </button>
        </motion.div>
      </div>
    </div>
  )
}
