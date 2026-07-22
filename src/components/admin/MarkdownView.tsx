import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { Eye, Pencil } from "lucide-react";
import { cn } from "../../shared/lib/cn";

const components: Components = {
  h1: ({ node, ...p }) => <h1 className="mb-3 mt-1 text-[17px] font-bold text-slate-900" {...p} />,
  h2: ({ node, ...p }) => <h2 className="mb-2 mt-4 text-[14.5px] font-semibold text-slate-900" {...p} />,
  h3: ({ node, ...p }) => <h3 className="mb-1.5 mt-3 text-[13.5px] font-semibold text-slate-800" {...p} />,
  p: ({ node, ...p }) => <p className="mb-2 text-[13px] leading-relaxed text-slate-600" {...p} />,
  ul: ({ node, ...p }) => <ul className="mb-2 ml-5 list-disc space-y-1 text-[13px] text-slate-600" {...p} />,
  ol: ({ node, ...p }) => <ol className="mb-2 ml-5 list-decimal space-y-1 text-[13px] text-slate-600" {...p} />,
  li: ({ node, ...p }) => <li className="leading-relaxed" {...p} />,
  strong: ({ node, ...p }) => <strong className="font-semibold text-slate-800" {...p} />,
  em: ({ node, ...p }) => <em className="italic text-slate-700" {...p} />,
  a: ({ node, ...p }) => <a className="text-indigo-600 underline" target="_blank" rel="noreferrer" {...p} />,
  blockquote: ({ node, ...p }) => (
    <blockquote className="my-2 border-l-2 border-indigo-300 bg-indigo-50/50 px-3 py-1.5 text-[12.5px] text-slate-600" {...p} />
  ),
  hr: () => <hr className="my-3 border-slate-100" />,
  // v9 không còn prop `inline`: tự xác định khối code qua className hoặc xuống dòng
  pre: ({ children }) => <>{children}</>,
  code: ({ node, className, children, ...props }) => {
    const isBlock = /language-/.test(className || "") || String(children).includes("\n");
    if (isBlock) {
      return (
        <pre className="my-2 overflow-x-auto rounded-lg bg-slate-900 p-3">
          <code className={cn("font-mono text-[12px] leading-relaxed text-slate-100", className)} {...props}>
            {children}
          </code>
        </pre>
      );
    }
    return <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-indigo-600">{children}</code>;
  },
};

export function MarkdownView({ content }: { content: string }) {
  return (
    <div className="text-slate-600">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}

export function MarkdownEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-2 py-1.5">
        <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "inline-flex items-center gap-1 rounded px-2.5 py-1 text-[12px] font-medium transition",
                tab === t ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
              )}
            >
              {t === "write" ? <Pencil className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {t === "write" ? "Soạn thảo" : "Xem trước"}
            </button>
          ))}
        </div>
        <span className="pr-1 font-mono text-[10.5px] text-slate-400">Markdown (.md)</span>
      </div>
      {tab === "write" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="h-64 w-full resize-none bg-white px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-slate-700 outline-none"
          placeholder="# Tên tài liệu&#10;&#10;Mô tả nội dung..."
        />
      ) : (
        <div className="scroll-slim h-64 overflow-y-auto bg-white px-3 py-2.5">
          {value.trim() ? (
            <MarkdownView content={value} />
          ) : (
            <p className="text-[13px] text-slate-400">Chưa có nội dung để xem trước.</p>
          )}
        </div>
      )}
    </div>
  );
}
