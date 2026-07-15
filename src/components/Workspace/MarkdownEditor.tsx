import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  name: string
  value: string
  onChange: (value: string) => void
}

export default function MarkdownEditor({ name, value, onChange }: Props) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [draft, setDraft] = useState(value)
  const draftRef = useRef(draft)
  const onChangeRef = useRef(onChange)

  useEffect(() => { setDraft(value); draftRef.current = value }, [value])
  useEffect(() => { draftRef.current = draft }, [draft])
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => {
    const timer = setTimeout(() => onChangeRef.current(draft), 500)
    return () => clearTimeout(timer)
  }, [draft])
  useEffect(() => () => onChangeRef.current(draftRef.current), [])

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-white">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-admin-outline px-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-admin-on-surface">{name}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-admin-secondary">Markdown</p>
        </div>
        <div className="flex rounded-md border border-admin-outline bg-admin-bg p-0.5">
          {(['edit', 'preview'] as const).map(item => (
            <button key={item} onClick={() => setMode(item)} className={`rounded px-3 py-1 text-xs font-bold capitalize ${mode === item ? 'bg-white text-uml-blue shadow-sm' : 'text-admin-secondary'}`}>
              {item}
            </button>
          ))}
        </div>
      </header>
      {mode === 'edit' ? (
        <textarea
          autoFocus
          value={draft}
          onChange={event => setDraft(event.target.value)}
          placeholder="# Project notes\n\nStart writing…"
          className="min-h-0 flex-1 resize-none bg-white p-8 font-mono text-[14px] leading-7 text-admin-on-surface outline-none"
        />
      ) : (
        <article className="prose prose-sm max-w-none min-h-0 flex-1 overflow-auto p-8 text-admin-on-surface">
          {draft.trim() ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft}</ReactMarkdown> : <p className="text-admin-secondary">Nothing to preview yet.</p>}
        </article>
      )}
    </section>
  )
}
