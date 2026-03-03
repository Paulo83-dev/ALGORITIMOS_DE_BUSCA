import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import type { GraphModel } from "../graph/types";
import type { RunnerSnapshot, SearchRunner } from "../graph/algorithms/types";
import type { OverlayToggles } from "./ControlsBar";
import { drawGraph, getGraphLayout } from "../render/drawGraph";

type EditAction = "start" | "goal";

type Props = {
  title: string;
  graph: GraphModel;
  runner: SearchRunner;
  snapshot: RunnerSnapshot;
  toggles: OverlayToggles;
  onSelect?: () => void;
  onNodeEdit?: (nodeId: number, action: EditAction) => void;
  editMode?: EditAction | null;
  nodeScale?: number;
  viewportHeightPx?: number;
};

export function GraphCard({
  title,
  graph,
  runner,
  snapshot,
  toggles,
  onSelect,
  onNodeEdit,
  editMode,
  nodeScale = 1,
  viewportHeightPx,
}: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewport, setViewport] = useState<{ widthPx: number; heightPx: number } | null>(null);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const CANVAS_BORDER_PX = 2;
    const update = () => {
      const widthPx = Math.max(0, el.clientWidth - CANVAS_BORDER_PX);
      const heightPx = Math.max(0, el.clientHeight - CANVAS_BORDER_PX);
      setViewport({ widthPx, heightPx });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!viewport) return;
    drawGraph(canvas, graph, runner.overlay(), toggles, viewport, nodeScale);
  }, [graph, runner, snapshot, toggles, viewport, nodeScale]);

  const it = snapshot.iterationInfo;
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onSelect) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect();
  };

  const handleCanvasClick = (event: MouseEvent<HTMLCanvasElement>) => {
    if (!onNodeEdit) return;
    const action =
      editMode ?? (event.shiftKey ? "goal" : event.altKey || event.ctrlKey || event.metaKey ? "start" : null);
    if (!action) return;
    if (!viewport) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const { positions, radius } = getGraphLayout(graph, viewport, nodeScale);
    const hitRadius = Math.max(6, radius + 4);

    let bestId: number | null = null;
    let bestDist = Infinity;
    for (const p of positions) {
      const dx = x - p.x;
      const dy = y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= hitRadius * hitRadius && d2 < bestDist) {
        bestDist = d2;
        bestId = p.node.id;
      }
    }

    if (bestId === null) return;
    event.preventDefault();
    event.stopPropagation();
    onNodeEdit(bestId, action);
  };

  const viewportStyle = viewportHeightPx ? { height: `${viewportHeightPx}px` } : undefined;

  return (
    <div
      className={`card${onSelect ? " cardClickable" : ""}`}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="cardHeader">
        <div className="cardTitle">{title}</div>
        <div className={`status status-${snapshot.status}`}>{snapshot.status}</div>
      </div>

      <div className="mazeViewport" ref={viewportRef} style={viewportStyle}>
        <canvas ref={canvasRef} onClick={handleCanvasClick} />
      </div>

      <div className="metrics">
        <div className="metric">
          <span>Tempo real</span>
          <span className="mono">{Math.round(snapshot.elapsedMs)} ms</span>
        </div>
        <div className="metric">
          <span>Tempo alg.</span>
          <span className="mono">{snapshot.algoSteps} steps</span>
        </div>
        {it?.depthLimit !== undefined && (
          <div className="metric">
            <span>IDDFS</span>
            <span className="mono">
              it {it.iteration ?? 0} lim {it.depthLimit}
            </span>
          </div>
        )}

        <div className="metric">
          <span>Expanded</span>
          <span className="mono">{snapshot.expandedCount}</span>
        </div>
        <div className="metric">
          <span>Visited</span>
          <span className="mono">{snapshot.visitedCount}</span>
        </div>
        <div className="metric">
          <span>Frontier</span>
          <span className="mono">
            {snapshot.frontierSize} (max {snapshot.frontierMaxSize})
          </span>
        </div>

        <div className="metric">
          <span>Path len</span>
          <span className="mono">{snapshot.pathLength ?? "-"}</span>
        </div>
        <div className="metric">
          <span>Path cost</span>
          <span className="mono">{snapshot.pathCost ?? "-"}</span>
        </div>
      </div>
    </div>
  );
}
