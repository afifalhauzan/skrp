"use client";
import dynamic from "next/dynamic";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { cn } from "@/lib/utils";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => <div className="h-64 rounded-xl bg-zinc-950" />,
});

const extensions = [python(), EditorView.lineWrapping];

/** Syntax-highlighted code editor. Fully controlled: replacing `value` (e.g. an AI draft) updates it. */
export function CodeEditor({
  value,
  onChange,
  language = "python",
  minHeight = "260px",
  readOnly,
  ariaLabel,
  className,
}: {
  value: string;
  onChange?: (value: string) => void;
  language?: "python" | "text";
  minHeight?: string;
  readOnly?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={oneDark}
      extensions={
        language === "python" ? extensions : [EditorView.lineWrapping]
      }
      readOnly={readOnly}
      minHeight={minHeight}
      maxHeight="520px"
      basicSetup={{ foldGutter: false, highlightActiveLine: !readOnly }}
      aria-label={ariaLabel}
      className={cn(
        "overflow-hidden rounded-xl border border-zinc-800 text-sm [&_.cm-editor]:outline-none [&_.cm-editor.cm-focused]:ring-2 [&_.cm-editor.cm-focused]:ring-primary/50 [&_.cm-scroller]:font-mono",
        className,
      )}
    />
  );
}
