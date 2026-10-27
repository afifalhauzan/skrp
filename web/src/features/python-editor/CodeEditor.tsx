"use client";
import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";

/** Matches the app's existing dark code surface (#17252e). */
const surface = EditorView.theme(
  {
    "&": {
      backgroundColor: "#17252e",
      color: "#d8f5e5",
      borderRadius: "12px",
      fontSize: "14px",
    },
    ".cm-gutters": {
      backgroundColor: "#17252e",
      color: "#6f8f80",
      border: "none",
    },
    ".cm-content": {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      padding: "12px 0",
    },
    ".cm-scroller": {
      minHeight: "280px",
      maxHeight: "480px",
      overflow: "auto",
      borderRadius: "12px",
    },
    "&.cm-focused": { outline: "2px solid var(--ring)" },
  },
  { dark: true },
);

export function CodeEditor({
  value,
  onChange,
  label = "Editor Python",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          keymap.of([indentWithTab]),
          python(),
          oneDark,
          surface,
          EditorView.contentAttributes.of({ "aria-label": label }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged)
              onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
    // The editor is created once; `value` is synced by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply external changes (e.g. switching case or restoring saved work) without clobbering typing.
  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    const current = editor.state.doc.toString();
    if (current !== value) {
      editor.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={host} data-testid="code-editor" />;
}
