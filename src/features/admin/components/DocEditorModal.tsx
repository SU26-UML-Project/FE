import { useRef, useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import { Button } from "./ui";
import { Modal } from "./Modal";
import { MarkdownEditor } from "./MarkdownView";
import SmartSelect from "../../../shared/ui/SmartSelect";

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100";

type DocEditorState = {
  mode: "create" | "edit";
  name: string;
  workspace: string;
  content: string;
  originalDocpath?: string;
};

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-2 text-[12.5px] font-medium text-slate-700">
        {label}
        {hint && <span className="font-normal text-slate-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export default function DocEditorModal({
  open,
  editor,
  uploading,
  workspaces,
  onSave,
  onClose,
  onChange,
}: {
  open: boolean;
  editor: DocEditorState | null;
  uploading: boolean;
  workspaces: string[];
  onSave: (editor: DocEditorState) => void;
  onClose: () => void;
  onChange: (patch: Partial<DocEditorState>) => void;
}) {
  const [confirmClose, setConfirmClose] = useState(false);
  const initialContent = useRef("");

  if (open && editor && !initialContent.current)
    initialContent.current = editor.content;

  const handleClose = () => {
    if (editor && editor.content !== initialContent.current) {
      setConfirmClose(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setConfirmClose(false);
    initialContent.current = "";
    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title={editor?.mode === "create" ? "Tạo tài liệu Markdown" : "Chỉnh sửa tài liệu"}
        desc="Hỗ trợ duy nhất định dạng Markdown (.md)"
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={handleClose} disabled={uploading}>
              <X className="h-4 w-4" /> Huỷ
            </Button>
            <Button onClick={() => editor && onSave(editor)} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {uploading ? "Đang tải lên…" : "Lưu tài liệu"}
            </Button>
          </>
        }
      >
        {editor && (
          <div className="space-y-3">
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
              <Field label="Tên tệp">
                <input
                  value={editor.name}
                  onChange={(e) => onChange({ name: e.target.value })}
                  placeholder="vd: payment-flow"
                  className={inputCls}
                />
              </Field>
              <Field label="Workspace">
                <SmartSelect
                  value={editor.workspace}
                  onChange={(v) => onChange({ workspace: v })}
                  options={workspaces}
                />
              </Field>
            </div>
            <Field label="Nội dung (Markdown)">
              <MarkdownEditor
                value={editor.content}
                onChange={(v) => onChange({ content: v })}
              />
            </Field>
          </div>
        )}
      </Modal>

      <Modal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Đóng trình soạn thảo?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmClose(false)}>Tiếp tục chỉnh sửa</Button>
            <Button onClick={handleConfirmClose}>
              <X className="h-4 w-4" /> Đóng không lưu
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-slate-600">
          Nội dung chưa được lưu sẽ bị mất nếu bạn đóng trình soạn thảo.
        </p>
      </Modal>
    </>
  );
}
