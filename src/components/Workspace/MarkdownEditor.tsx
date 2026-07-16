import { Children, isValidElement, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, ChevronDown, Code2, Copy, Eye, Heading, Italic, Link, List, ListChecks, ListOrdered, Minus, Palette, Pilcrow, Quote, Rows3, SplitSquareHorizontal, Strikethrough, Table2, Type } from 'lucide-react'

interface Props { name: string; value: string; onChange: (value: string) => void }
type Mode = 'edit' | 'split' | 'preview'
type Font = 'sans' | 'serif' | 'mono'
type Theme = 'white' | 'soft' | 'contrast'
interface Preferences { font: Font; fontSize: number; lineHeight: number; width: number; theme: Theme; showToc: boolean; split: number }
const prefKey = 'diauml:markdown-preferences'
const defaults: Preferences = { font: 'sans', fontSize: 16, lineHeight: 1.75, width: 900, theme: 'white', showToc: true, split: 50 }

export default function MarkdownEditor({ name, value, onChange }: Props) {
  const [mode, setMode] = useState<Mode>('edit')
  const [draft, setDraft] = useState(value)
  const [prefs, setPrefs] = useState<Preferences>(() => { try { return { ...defaults, ...JSON.parse(localStorage.getItem(prefKey) || '{}') } } catch { return defaults } })
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [saved, setSaved] = useState(true)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const draftRef = useRef(draft)
  const onChangeRef = useRef(onChange)
  const splitRef = useRef<HTMLDivElement>(null)
  const resizing = useRef(false)

  useEffect(() => { setDraft(value); draftRef.current = value; setSaved(true) }, [value])
  useEffect(() => { draftRef.current = draft }, [draft])
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => { localStorage.setItem(prefKey, JSON.stringify(prefs)) }, [prefs])
  useEffect(() => { const timer = setTimeout(() => { onChangeRef.current(draft); setSaved(true) }, 500); setSaved(false); return () => clearTimeout(timer) }, [draft])
  useEffect(() => () => onChangeRef.current(draftRef.current), [])
  useEffect(() => {
    const move = (event: PointerEvent) => { if (!resizing.current || !splitRef.current) return; const box = splitRef.current.getBoundingClientRect(); setPrefs(previous => ({ ...previous, split: Math.min(75, Math.max(25, ((event.clientX - box.left) / box.width) * 100)) })) }
    const up = () => { resizing.current = false; document.body.style.cursor = ''; document.body.style.userSelect = '' }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [])

  const stats = useMemo(() => ({ lines: draft ? draft.split('\n').length : 1, words: draft.trim() ? draft.trim().split(/\s+/).length : 0, chars: draft.length }), [draft])
  const headings = useMemo(() => draft.split('\n').flatMap((line, index) => { const match = line.match(/^(#{1,4})\s+(.+)$/); return match ? [{ level: match[1].length, text: match[2].replace(/[*_`]/g, ''), id: slug(match[2]), index }] : [] }), [draft])

  const updateDraft = (next: string, selectionStart?: number, selectionEnd?: number) => { setDraft(next); requestAnimationFrame(() => { if (!textarea.current || selectionStart === undefined) return; textarea.current.focus(); textarea.current.setSelectionRange(selectionStart, selectionEnd ?? selectionStart) }) }
  const wrap = (before: string, after = before, placeholder = 'text') => {
    const el = textarea.current; if (!el) return
    const start = el.selectionStart; const end = el.selectionEnd; const selected = draft.slice(start, end)
    const already = draft.slice(Math.max(0, start - before.length), start) === before && draft.slice(end, end + after.length) === after
    if (already) updateDraft(draft.slice(0, start - before.length) + selected + draft.slice(end + after.length), start - before.length, end - before.length)
    else { const content = selected || placeholder; updateDraft(draft.slice(0, start) + before + content + after + draft.slice(end), start + before.length, start + before.length + content.length) }
  }
  const transformLines = (transform: (line: string, index: number) => string) => {
    const el = textarea.current; if (!el) return
    const lineStart = draft.lastIndexOf('\n', el.selectionStart - 1) + 1; const nextBreak = draft.indexOf('\n', el.selectionEnd); const lineEnd = nextBreak < 0 ? draft.length : nextBreak
    const block = draft.slice(lineStart, lineEnd); const transformed = block.split('\n').map(transform).join('\n')
    updateDraft(draft.slice(0, lineStart) + transformed + draft.slice(lineEnd), lineStart, lineStart + transformed.length)
  }
  const prefix = (value: string) => transformLines(line => line.startsWith(value) ? line.slice(value.length) : value + line)
  const heading = (level: number) => transformLines(line => `${'#'.repeat(level)} ${line.replace(/^#{1,6}\s+/, '')}`)
  const insert = (text: string, cursorOffset = text.length) => { const el = textarea.current; if (!el) return; const start = el.selectionStart; const end = el.selectionEnd; updateDraft(draft.slice(0, start) + text + draft.slice(end), start + cursorOffset) }
  const onEditorKey = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = event.metaKey || event.ctrlKey
    if (mod && event.key.toLowerCase() === 'b') { event.preventDefault(); wrap('**') }
    else if (mod && event.key.toLowerCase() === 'i') { event.preventDefault(); wrap('_') }
    else if (mod && event.key.toLowerCase() === 'k') { event.preventDefault(); wrap('[', '](https://)', 'link text') }
    else if (mod && event.key.toLowerCase() === 'e') { event.preventDefault(); wrap('`') }
    else if (mod && event.shiftKey && event.key.toLowerCase() === 'p') { event.preventDefault(); setMode(previous => previous === 'preview' ? 'edit' : 'preview') }
    else if (event.key === 'Tab') { event.preventDefault(); const start = event.currentTarget.selectionStart; const end = event.currentTarget.selectionEnd; if (event.shiftKey) transformLines(line => line.replace(/^( {2}|\t)/, '')); else updateDraft(draft.slice(0, start) + '  ' + draft.slice(end), start + 2) }
  }
  const pastePlain = (event: React.ClipboardEvent<HTMLTextAreaElement>) => { const text = event.clipboardData.getData('text/plain'); if (!text) return; event.preventDefault(); const el = event.currentTarget; updateDraft(draft.slice(0, el.selectionStart) + text + draft.slice(el.selectionEnd), el.selectionStart + text.length) }

  return <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-admin-bg/30">
    <header className="relative z-30 flex min-h-12 shrink-0 items-center gap-3 border-b border-admin-outline bg-white px-4">
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-admin-on-surface">{name}</p><p className="text-[9px] font-bold uppercase tracking-widest text-admin-secondary">Markdown · {saved ? 'Saved locally' : 'Saving…'}</p></div>
      <ModeSwitch mode={mode} setMode={setMode}/>
    </header>
    <div className="relative z-20 flex h-11 shrink-0 items-center border-b border-admin-outline bg-white/95 px-2 backdrop-blur">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ToolGroup><label className="flex h-7 items-center gap-1 rounded-full px-2 text-admin-secondary hover:bg-white hover:text-uml-blue" title="Text style"><Heading size={14}/><select defaultValue="0" onChange={event => { const level = Number(event.target.value); level ? heading(level) : transformLines(line => line.replace(/^#{1,6}\s+/, '')); event.target.value = '0' }} className="max-w-20 bg-transparent text-[10px] font-bold outline-none"><option value="0">Style</option><option value="1">Heading 1</option><option value="2">Heading 2</option><option value="3">Heading 3</option><option value="4">Heading 4</option></select><ChevronDown size={10}/></label><Tool title="Bold (Ctrl+B)" onClick={() => wrap('**')}><Type size={14}/></Tool><Tool title="Italic (Ctrl+I)" onClick={() => wrap('_')}><Italic size={14}/></Tool><Tool title="Strikethrough" onClick={() => wrap('~~')}><Strikethrough size={14}/></Tool><Tool title="Inline code (Ctrl+E)" onClick={() => wrap('`')}><Code2 size={14}/></Tool></ToolGroup>
        <ToolGroup><Tool title="Bullet list" onClick={() => prefix('- ')}><List size={14}/></Tool><Tool title="Numbered list" onClick={() => transformLines((line, index) => `${index + 1}. ${line.replace(/^\d+\.\s+/, '')}`)}><ListOrdered size={14}/></Tool><Tool title="Task list" onClick={() => prefix('- [ ] ')}><ListChecks size={14}/></Tool><Tool title="Quote" onClick={() => prefix('> ')}><Quote size={14}/></Tool></ToolGroup>
        <ToolGroup><Tool title="Link (Ctrl+K)" onClick={() => wrap('[', '](https://)', 'link text')}><Link size={14}/></Tool><Tool title="Code block" onClick={() => insert('```text\n\n```', 8)}><Code2 size={14}/></Tool><Tool title="Table" onClick={() => insert('| Column | Type | Notes |\n|---|---|---|\n| Value | Text | Description |\n')}><Table2 size={14}/></Tool><Tool title="Horizontal rule" onClick={() => insert('\n---\n')}><Minus size={14}/></Tool></ToolGroup>
      </div>
      <div className="relative ml-2 shrink-0"><button onClick={() => setAppearanceOpen(value => !value)} className="flex h-8 items-center gap-1.5 rounded-full border border-admin-outline bg-white px-3 text-[11px] font-bold text-admin-secondary hover:border-uml-blue hover:text-uml-blue"><Palette size={14}/>Appearance</button>{appearanceOpen && <Appearance prefs={prefs} setPrefs={setPrefs} onClose={() => setAppearanceOpen(false)}/>}</div>
    </div>
    <div ref={splitRef} className="flex min-h-0 flex-1 overflow-hidden">
      {(mode === 'edit' || mode === 'split') && <div className="min-w-0 bg-white" style={{ width: mode === 'split' ? `${prefs.split}%` : '100%' }}><textarea ref={textarea} autoFocus value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={onEditorKey} onPaste={pastePlain} spellCheck={false} placeholder="# Project notes\n\nStart writing…" className="h-full w-full resize-none bg-white px-8 py-7 font-mono text-[14px] leading-7 text-admin-on-surface outline-none"/></div>}
      {mode === 'split' && <div onPointerDown={() => { resizing.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none' }} className="relative w-1.5 shrink-0 cursor-col-resize bg-admin-outline/20 hover:bg-uml-blue/40"><span className="absolute left-1/2 top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded bg-admin-outline"/></div>}
      {(mode === 'preview' || mode === 'split') && <Preview markdown={draft} prefs={prefs} headings={headings}/>} 
    </div>
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-admin-outline bg-white px-4 text-[9px] font-medium text-admin-secondary"><span>{saved ? 'Saved locally' : 'Saving locally…'}</span><span>{stats.lines} lines · {stats.words} words · {stats.chars} characters · Markdown</span></footer>
  </section>
}

function ModeSwitch({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) { return <div className="flex rounded-lg border border-admin-outline bg-admin-bg p-0.5">{([{ id: 'edit', icon: Pilcrow }, { id: 'split', icon: SplitSquareHorizontal }, { id: 'preview', icon: Eye }] as const).map(item => { const Icon = item.icon; return <button key={item.id} title={item.id} onClick={() => setMode(item.id)} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-bold capitalize ${mode === item.id ? 'bg-white text-uml-blue shadow-sm' : 'text-admin-secondary'}`}><Icon size={13}/>{item.id}</button> })}</div> }
function ToolGroup({ children }: { children: React.ReactNode }) { return <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-admin-outline/80 bg-admin-bg/60 p-0.5">{children}</div> }
function Tool({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) { return <button title={title} onMouseDown={event => event.preventDefault()} onClick={onClick} className="flex h-7 min-w-7 items-center justify-center gap-0.5 rounded-full px-1.5 text-admin-secondary hover:bg-white hover:text-uml-blue hover:shadow-sm">{children}</button> }

function Appearance({ prefs, setPrefs, onClose }: { prefs: Preferences; setPrefs: React.Dispatch<React.SetStateAction<Preferences>>; onClose: () => void }) { return <div className="absolute right-0 top-10 z-[80] w-72 rounded-xl border border-admin-outline bg-white p-4 shadow-2xl"><div className="mb-3 flex items-center justify-between"><b className="text-xs">Reading appearance</b><button onClick={onClose}>×</button></div><Label>Font</Label><div className="grid grid-cols-3 gap-1">{(['sans','serif','mono'] as Font[]).map(font => <Choice key={font} active={prefs.font === font} onClick={() => setPrefs(previous => ({ ...previous, font }))}>{font}</Choice>)}</div><Label>Text size · {prefs.fontSize}px</Label><input type="range" min="13" max="22" value={prefs.fontSize} onChange={event => setPrefs(previous => ({ ...previous, fontSize: Number(event.target.value) }))} className="w-full"/><Label>Line height · {prefs.lineHeight.toFixed(2)}</Label><input type="range" min="1.4" max="2.1" step="0.05" value={prefs.lineHeight} onChange={event => setPrefs(previous => ({ ...previous, lineHeight: Number(event.target.value) }))} className="w-full"/><Label>Content width · {prefs.width}px</Label><input type="range" min="680" max="1100" step="20" value={prefs.width} onChange={event => setPrefs(previous => ({ ...previous, width: Number(event.target.value) }))} className="w-full"/><Label>Theme</Label><div className="grid grid-cols-3 gap-1">{(['white','soft','contrast'] as Theme[]).map(theme => <Choice key={theme} active={prefs.theme === theme} onClick={() => setPrefs(previous => ({ ...previous, theme }))}>{theme}</Choice>)}</div><label className="mt-4 flex items-center gap-2 text-xs"><input type="checkbox" checked={prefs.showToc} onChange={event => setPrefs(previous => ({ ...previous, showToc: event.target.checked }))}/>Show table of contents</label></div> }
function Label({ children }: { children: React.ReactNode }) { return <label className="mb-1 mt-3 block text-[9px] font-black uppercase tracking-widest text-admin-secondary">{children}</label> }
function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={`rounded-lg border px-2 py-2 text-[10px] font-bold capitalize ${active ? 'border-uml-blue bg-uml-blue/5 text-uml-blue' : 'border-admin-outline hover:bg-admin-bg'}`}>{children}{active && <Check size={10} className="ml-1 inline"/>}</button> }

function Preview({ markdown, prefs, headings }: { markdown: string; prefs: Preferences; headings: Array<{ level: number; text: string; id: string }> }) {
  const font = prefs.font === 'serif' ? 'Georgia, Cambria, serif' : prefs.font === 'mono' ? 'ui-monospace, SFMono-Regular, monospace' : 'Inter, ui-sans-serif, system-ui, sans-serif'
  const outer = prefs.theme === 'soft' ? 'bg-[#f4f2ed]' : prefs.theme === 'contrast' ? 'bg-zinc-200' : 'bg-admin-bg/40'
  return <div className={`min-w-0 flex-1 overflow-auto ${outer}`}><div className="flex min-h-full justify-center gap-6 p-6 lg:p-10"><article className="h-fit min-w-0 rounded-sm border border-admin-outline/70 bg-white px-8 py-10 text-zinc-800 shadow-[0_2px_12px_rgba(15,23,42,.04)] sm:px-12" style={{ width: '100%', maxWidth: prefs.width, fontFamily: font, fontSize: prefs.fontSize, lineHeight: prefs.lineHeight }}><MarkdownBody markdown={markdown}/></article>{prefs.showToc && headings.length >= 3 && <aside className="sticky top-6 hidden h-fit w-52 shrink-0 rounded-lg border border-admin-outline bg-white p-3 xl:block"><div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-admin-secondary"><Rows3 size={12}/>On this page</div>{headings.map((heading, index) => <a key={`${heading.id}-${index}`} href={`#${heading.id}`} className="block truncate rounded px-2 py-1 text-[10px] text-admin-secondary hover:bg-admin-bg hover:text-uml-blue" style={{ paddingLeft: 8 + (heading.level - 1) * 10 }}>{heading.text}</a>)}</aside>}</div></div>
}

function MarkdownBody({ markdown }: { markdown: string }) { return <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
  h1: ({children}) => <h1 id={slug(textOf(children))} className="mb-5 mt-1 scroll-mt-20 border-b border-zinc-200 pb-3 text-[2em] font-black leading-tight tracking-tight text-zinc-950">{children}</h1>,
  h2: ({children}) => <h2 id={slug(textOf(children))} className="mb-3 mt-9 scroll-mt-20 border-b border-zinc-100 pb-2 text-[1.5em] font-bold leading-tight text-zinc-950">{children}</h2>,
  h3: ({children}) => <h3 id={slug(textOf(children))} className="mb-2 mt-7 scroll-mt-20 text-[1.2em] font-bold text-zinc-900">{children}</h3>,
  h4: ({children}) => <h4 id={slug(textOf(children))} className="mb-2 mt-5 scroll-mt-20 text-[1em] font-bold uppercase tracking-wide text-zinc-800">{children}</h4>,
  p: ({children}) => <p className="my-3">{children}</p>, strong: ({children}) => <strong className="font-bold text-zinc-950">{children}</strong>, em: ({children}) => <em className="italic">{children}</em>, del: ({children}) => <del className="text-zinc-500">{children}</del>,
  ul: ({children}) => <ul className="my-3 list-disc space-y-1 pl-6">{children}</ul>, ol: ({children}) => <ol className="my-3 list-decimal space-y-1 pl-6">{children}</ol>, li: ({children}) => <li className="pl-1">{children}</li>,
  blockquote: ({children}) => <blockquote className="my-5 border-l-4 border-uml-blue bg-blue-50/60 px-5 py-2 text-zinc-700">{children}</blockquote>,
  a: ({href, children}) => <a href={href} target="_blank" rel="noreferrer" className="font-medium text-uml-blue underline decoration-blue-200 underline-offset-2 hover:decoration-uml-blue">{children}</a>,
  hr: () => <hr className="my-8 border-zinc-200"/>,
  table: ({children}) => <div className="my-6 max-w-full overflow-x-auto rounded-lg border border-zinc-200"><table className="w-full min-w-[580px] border-collapse text-left text-[.86em]">{children}</table></div>,
  thead: ({children}) => <thead className="bg-zinc-100 text-zinc-900">{children}</thead>, tbody: ({children}) => <tbody className="divide-y divide-zinc-100">{children}</tbody>, tr: ({children}) => <tr className="even:bg-zinc-50/60">{children}</tr>, th: ({children}) => <th className="border-r border-zinc-200 px-4 py-2.5 font-bold last:border-r-0">{children}</th>, td: ({children}) => <td className="border-r border-zinc-100 px-4 py-2.5 align-top last:border-r-0">{children}</td>,
  input: props => <input {...props} disabled className="mr-2 accent-uml-blue"/>,
  code: ({className, children}) => className ? <code className={className}>{children}</code> : <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[.88em] text-rose-700">{children}</code>,
  pre: ({children}) => <CodeBlock>{children}</CodeBlock>,
  img: ({src, alt}) => <img src={src || ''} alt={alt || ''} className="my-6 max-h-[560px] max-w-full rounded-lg border border-zinc-200 object-contain"/>,
}}>{markdown || '*Nothing to preview yet.*'}</ReactMarkdown> }

function CodeBlock({ children }: { children: React.ReactNode }) { const child = Children.only(children); const props = isValidElement(child) ? child.props as { className?: string; children?: React.ReactNode } : {}; const code = String(props.children ?? '').replace(/\n$/, ''); const language = props.className?.replace('language-', '') || 'text'; const [copied, setCopied] = useState(false); return <div className="my-6 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-100"><div className="flex items-center justify-between border-b border-zinc-700 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400"><span>{language}</span><button onClick={() => { void navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1200) }} className="flex items-center gap-1 rounded px-2 py-1 hover:bg-zinc-800">{copied ? <Check size={12}/> : <Copy size={12}/>} {copied ? 'Copied' : 'Copy'}</button></div><pre className="overflow-x-auto p-4"><code className="font-mono text-[.82em] leading-6">{code}</code></pre></div> }
function slug(value: string) { return value.toLowerCase().trim().replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-').replace(/-+/g, '-') || 'section' }
function textOf(value: React.ReactNode): string { if (typeof value === 'string' || typeof value === 'number') return String(value); if (Array.isArray(value)) return value.map(textOf).join(''); if (isValidElement(value)) return textOf((value.props as { children?: React.ReactNode }).children); return '' }
