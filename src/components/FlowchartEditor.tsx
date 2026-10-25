"use client";
import { useEffect, useId, useState } from "react";
import { Label } from "./Shell";

// Source of truth is a plain Mermaid string, so a BE/AI response can replace
// `value` (e.g. a scaffold draft) without any change to this component.
export function FlowchartEditor({
  value,
  template,
  onChange,
}: {
  value: string;
  template: string;
  onChange: (value: string) => void;
}) {
  const id = "mmd" + useId().replace(/\W/g, "");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!value.trim()) {
      setSvg("");
      setError("");
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
        const result = await mermaid.render(id, value);
        if (cancelled) return;
        setSvg(result.svg);
        setError("");
      } catch (e) {
        if (cancelled) return;
        document.getElementById("d" + id)?.remove();
        setError(e instanceof Error ? e.message : String(e));
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, id]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label>Flowchart (Mermaid)</Label>
        <button
          type="button"
          onClick={() => {
            if (!value.trim() || confirm("Ganti flowchart dengan template?"))
              onChange(template);
          }}
          className="font-mono text-[10px] uppercase tracking-widest text-teal underline"
        >
          Pakai template dasar
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <textarea
          aria-label="Flowchart Mermaid"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          placeholder={template}
          rows={14}
          className="w-full rounded-xl border border-[#d8e4dd] bg-[#17252e] p-4 font-mono text-sm leading-6 text-[#d8f5e5] outline-none focus:border-teal"
        />
        <div className="min-h-[200px] overflow-auto rounded-xl border border-[#d8e4dd] bg-white p-3">
          {error ? (
            <p className="whitespace-pre-wrap font-mono text-xs text-coral">
              Sintaks belum valid:{"\n"}
              {error}
            </p>
          ) : svg ? (
            <div dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <p className="text-sm text-muted">
              Pratinjau flowchart muncul di sini.
            </p>
          )}
        </div>
      </div>
      <p className="mt-2 font-mono text-[10px] text-muted">
        Contoh: A([Mulai]) --&gt; B[/Baca input/] --&gt; C{"{Kondisi?}"} -- Ya
        --&gt; D[Proses]
      </p>
    </div>
  );
}
