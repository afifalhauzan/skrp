"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  addEdge,
  Background,
  ConnectionMode,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { FlowNode, FlowNodeKind, Flowchart } from "@/lib/types";

type FlowData = { kind: FlowNodeKind; label: string; origin: "ai" | "student" };
type RfNode = Node<FlowData, "flow">;

const kindLabels: Record<FlowNodeKind, string> = {
  start: "Mulai",
  end: "Selesai",
  process: "Proses",
  io: "Input/Output",
  decision: "Keputusan",
};
const arrow = { type: MarkerType.ArrowClosed };

const toRf = (f: Flowchart): { nodes: RfNode[]; edges: Edge[] } => ({
  nodes: f.nodes.map((n) => ({
    id: n.id,
    type: "flow",
    position: { x: n.x, y: n.y },
    data: { kind: n.kind, label: n.label, origin: n.origin },
  })),
  edges: f.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    label: e.label,
    type: "smoothstep",
    markerEnd: arrow,
  })),
});
const fromRf = (nodes: RfNode[], edges: Edge[]): Flowchart => ({
  nodes: nodes.map((n): FlowNode => ({
    id: n.id,
    kind: n.data.kind,
    label: n.data.label,
    origin: n.data.origin,
    x: Math.round(n.position.x),
    y: Math.round(n.position.y),
  })),
  edges: edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    label: typeof e.label === "string" ? e.label : undefined,
  })),
});

export function validateFlowchart(f: Flowchart): string[] {
  const issues: string[] = [];
  if (!f.nodes.some((n) => n.kind === "start")) issues.push("Belum ada Mulai.");
  if (!f.nodes.some((n) => n.kind === "end")) issues.push("Belum ada Selesai.");
  for (const n of f.nodes) {
    const out = f.edges.filter((e) => e.source === n.id).length;
    const inn = f.edges.filter((e) => e.target === n.id).length;
    if (f.nodes.length > 1 && out + inn === 0)
      issues.push(`"${n.label}" belum terhubung.`);
    else if (n.kind === "decision" && out < 2)
      issues.push(`"${n.label}" butuh dua cabang (Ya/Tidak).`);
  }
  return issues;
}

const handleCls = "!h-2.5 !w-2.5 !border-foreground !bg-background";
const sides = [
  ["t", Position.Top],
  ["r", Position.Right],
  ["b", Position.Bottom],
  ["l", Position.Left],
] as const;

function FlowNodeView({ id, data, selected }: NodeProps<RfNode>) {
  const { updateNodeData } = useReactFlow();
  const [editing, setEditing] = useState(false);
  const shaped = data.kind === "io" || data.kind === "decision";
  const points =
    data.kind === "decision" ? "50,2 98,50 50,98 2,50" : "12,2 98,2 88,98 2,98";
  const box = `relative flex items-center justify-center px-3 text-center text-xs font-semibold text-foreground ${
    data.kind === "decision" ? "h-24 w-44" : "h-14 w-44"
  } ${shaped ? "" : "border-2 bg-background"} ${
    data.kind === "start" || data.kind === "end" ? "rounded-full" : ""
  } ${
    selected
      ? "border-primary"
      : data.origin === "ai"
        ? "border-dashed border-primary/70"
        : "border-foreground"
  }`;
  return (
    <div className={box} onDoubleClick={() => setEditing(true)}>
      {shaped && (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polygon
            points={points}
            fill="white"
            strokeWidth={selected ? 3 : 2}
            vectorEffect="non-scaling-stroke"
            className={selected ? "stroke-primary" : "stroke-foreground"}
            strokeDasharray={data.origin === "ai" ? "5 3" : undefined}
          />
        </svg>
      )}
      {editing ? (
        <input
          autoFocus
          defaultValue={data.label}
          aria-label="Label node"
          className="nodrag relative z-10 w-full bg-transparent text-center outline-none"
          onBlur={(e) => {
            const label = e.target.value.trim() || data.label;
            if (label !== data.label)
              updateNodeData(id, { label, origin: "student" });
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      ) : (
        <span className="relative z-10 break-words">{data.label}</span>
      )}
      {data.origin === "ai" && (
        <span className="absolute -top-2 right-2 z-10 bg-primary px-1 rounded text-[9px] font-semibold text-primary-foreground">
          AI
        </span>
      )}
      {sides.map(([hid, pos]) => (
        <Handle
          key={hid}
          id={hid}
          type="source"
          position={pos}
          className={handleCls}
        />
      ))}
    </div>
  );
}
const nodeTypes = { flow: FlowNodeView };

function Canvas({
  value,
  draft,
  onChange,
}: {
  value?: Flowchart;
  draft: Flowchart;
  onChange: (value: Flowchart) => void;
}) {
  const initial = value ?? draft;
  const [nodes, setNodes, onNodesChange] = useNodesState<RfNode>(
    toRf(initial).nodes,
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    toRf(initial).edges,
  );
  const { screenToFlowPosition, getNodes } = useReactFlow<RfNode>();
  const last = useRef(
    JSON.stringify(fromRf(toRf(initial).nodes, toRf(initial).edges)),
  );
  const counter = useRef(0);

  // Student edits flow up; a different `value` from outside (e.g. a BE/AI draft) flows in.
  useEffect(() => {
    const json = JSON.stringify(fromRf(nodes, edges));
    if (json !== last.current) {
      last.current = json;
      onChange(JSON.parse(json));
    }
  }, [nodes, edges, onChange]);
  useEffect(() => {
    if (!value) return;
    const rf = toRf(value);
    const json = JSON.stringify(fromRf(rf.nodes, rf.edges));
    if (json === last.current) return;
    last.current = json;
    setNodes(rf.nodes);
    setEdges(rf.edges);
  }, [value, setNodes, setEdges]);

  const onConnect = useCallback(
    (c: Connection) =>
      setEdges((eds) => {
        const from = getNodes().find((n) => n.id === c.source);
        const siblings = eds.filter((e) => e.source === c.source).length;
        const label =
          from?.data.kind === "decision" && siblings < 2
            ? siblings === 0
              ? "Ya"
              : "Tidak"
            : undefined;
        return addEdge(
          { ...c, type: "smoothstep", markerEnd: arrow, label },
          eds,
        );
      }),
    [setEdges, getNodes],
  );
  const addNode = (kind: FlowNodeKind) => {
    counter.current += 1;
    const offset = (counter.current % 6) * 24;
    setNodes((ns) => [
      ...ns,
      {
        id: `n${Date.now()}${counter.current}`,
        type: "flow",
        position: screenToFlowPosition({ x: 260 + offset, y: 120 + offset }),
        data: { kind, label: kindLabels[kind], origin: "student" },
      },
    ]);
  };
  const removeSelected = () => {
    setNodes((ns) => ns.filter((n) => !n.selected));
    setEdges((es) => es.filter((e) => !e.selected));
  };
  const reset = () => {
    if (!confirm("Kembalikan flowchart ke draf awal? Perubahanmu akan hilang."))
      return;
    const rf = toRf(draft);
    setNodes(rf.nodes);
    setEdges(rf.edges);
  };

  return (
    <>
      <div className="mb-2 flex flex-wrap gap-1">
        {(Object.keys(kindLabels) as FlowNodeKind[]).map((kind) => (
          <Button
            key={kind}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addNode(kind)}
          >
            + {kindLabels[kind]}
          </Button>
        ))}
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={removeSelected}
        >
          Hapus terpilih
        </Button>
      </div>
      <div
        className="h-[460px] rounded-xl border bg-background"
        data-testid="flowchart-canvas"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeDoubleClick={(_, edge) => {
            const label = prompt(
              "Label cabang (mis. Ya / Tidak):",
              String(edge.label ?? ""),
            );
            if (label !== null)
              setEdges((es) =>
                es.map((e) =>
                  e.id === edge.id ? { ...e, label: label || undefined } : e,
                ),
              );
          }}
          connectionMode={ConnectionMode.Loose}
          deleteKeyCode={["Backspace", "Delete"]}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs leading-5 text-muted-foreground">
          Seret node · tarik dari titik tepi untuk menyambung · klik dua kali
          node/panah untuk ubah label · node &quot;AI&quot; = draf awal
        </p>
        <Button type="button" variant="link" size="sm" onClick={reset}>
          Reset ke draf
        </Button>
      </div>
    </>
  );
}

export function FlowchartEditor(props: {
  value?: Flowchart;
  draft: Flowchart;
  onChange: (value: Flowchart) => void;
}) {
  const issues = validateFlowchart(props.value ?? props.draft);
  return (
    <div>
      <Label>Flowchart</Label>
      <ReactFlowProvider>
        <Canvas {...props} />
      </ReactFlowProvider>
      {issues.length > 0 && (
        <ul className="mt-3 list-disc rounded-xl bg-destructive/10 py-2 pl-7 pr-3 text-xs leading-5 text-destructive">
          {issues.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
