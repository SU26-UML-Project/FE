import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { Eye, Pencil } from "lucide-react";
import { cn } from "@/utils/cn";

const components: Components = {
  h1: ({ node, ...p }) => <h1 className="mb-3 mt-1 text-[17px] font-bold text-ink" {...p} />,
  h2: ({ node, ...p }) => <h2 className="mb-2 mt-4 text-[14.5px] font-bold text-ink" {...p} />,
  h3: ({ node, ...p }) => <h3 className="mb-1.5 mt-3 text-[13.5px] font-semibold text-ink" {...p} />,
  p: ({ node, ...p }) => <p className="mb-2 text-[13px] leading-relaxed text-gray-600" {...p} />,
  ul: ({ node, ...p }) => <ul className="mb-2 ml-5 list-disc space-y-1 text-[13px] text-gray-600" {...p} />,
  ol: ({ node, ...p }) => <ol className="mb-2 ml-5 list-decimal space-y-1 text-[13px] text-gray-600" {...p} />,
  li: ({ node, ...p }) => <li className="leading-relaxed" {...p} />,
  strong: ({ node, ...p }) => <strong className="font-semibold text-ink" {...p} />,
  em: ({ node, ...p }) => <em className="italic text-gray-700" {...p} />,
  a: ({ node, ...p }) => <a className="text-golddk underline" target="_blank" rel="noreferrer" {...p} />,
  blockquote: ({ node, ...p }) => (
    <blockquote className="my-2 rounded-lg border-l-2 border-gold bg-gold/10 px-3 py-1.5 text-[12.5px] text-gray-600" {...p} />
  ),
  hr: () => <hr className="my-3 border-black/5" />,
  pre: ({ children }) => <>{children}</>,
  code: ({ node, className, children, ...props }) => {
    const isBlock = /language-/.test(className || "") || String(children).includes("\n");
    if (isBlock) {
      return (
        <pre className="my-2 overflow-x-auto rounded-xl bg-ink p-3">
          <code className={cn("font-mono text-[12px] leading-relaxed text-emerald-50", className)} {...props}>
            {children}
          </code>
        </pre>
      );
    }
    return <code className="rounded bg-gold/15 px-1 py-0.5 font-mono text-[12px] text-golddk">{children}</code>;
  },
};

export function MarkdownView({ content }: { content: string }) {
  return (
    <div className="text-gray-600">
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
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white/70">
      <div className="flex items-center justify-between border-b border-black/5 bg-surface px-2 py-1.5">
        <div className="inline-flex rounded-full border border-white/60 bg-white p-0.5">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold transition",
                tab === t ? "bg-ink text-white" : "text-gray-500 hover:text-ink"
              )}
            >
              {t === "write" ? <Pencil className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {t === "write" ? "Soạn thảo" : "Xem trước"}
            </button>
          ))}
        </div>
        <span className="pr-1 font-mono text-[10.5px] text-gray-400">Markdown (.md)</span>
      </div>
      {tab === "write" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="h-64 w-full resize-none bg-white/70 px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-ink outline-none"
          placeholder="# Tên tài liệu&#10;&#10;Mô tả nội dung..."
        />
      ) : (
        <div className="scroll-slim h-64 overflow-y-auto bg-white/70 px-3 py-2.5">
          {value.trim() ? (
            <MarkdownView content={value} />
          ) : (
            <p className="text-[13px] text-gray-400">Chưa có nội dung để xem trước.</p>
          )}
        </div>
      )}
    </div>
  );
}
