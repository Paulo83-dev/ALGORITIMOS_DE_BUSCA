import type { ChangeEvent } from "react";
import { COST_PALETTE, costToColor } from "../render/palette";
import type { GraphLayout } from "../graph/types";

export type OverlayToggles = {
  showVisited: boolean;
  showFrontier: boolean;
  showCurrent: boolean;
  showPath: boolean;
};

export type ViewMode = "maze" | "graph";

type CommonProps = {
  globalMode: "IDLE" | "RUNNING" | "PAUSED";
  stepsPerTick: number;
  speedIndex: number;
  onSpeedIndexChange: (index: number) => void;
  toggles: OverlayToggles;
  onTogglesChange: (next: OverlayToggles) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onStep: () => void;
  onModeChange: (mode: ViewMode) => void;
  editMode: "start" | "goal" | null;
  onEditModeChange: (mode: "start" | "goal" | null) => void;
};

type MazeProps = {
  mode: "maze";
  mazeRows: number;
  mazeCols: number;
  braidFactor: number;
  trafficPercent: number;
  onMazeRowsChange: (rows: number) => void;
  onMazeColsChange: (cols: number) => void;
  onBraidFactorChange: (value: number) => void;
  onTrafficPercentChange: (value: number) => void;
  onGenerateMaze: () => void;
  onAddTraffic: () => void;
};

type GraphProps = {
  mode: "graph";
  graphLayout: GraphLayout;
  graphNodes: number;
  graphDensity: number;
  graphDirected: boolean;
  graphWeighted: boolean;
  graphNodeScale: number;
  graphPhysicsEnabled: boolean;
  graphEdgeSpring: number;
  graphEdgeLength: number;
  graphDegreeRepel: number;
  onGraphLayoutChange: (layout: GraphLayout) => void;
  onGraphNodesChange: (count: number) => void;
  onGraphDensityChange: (density: number) => void;
  onGraphDirectedChange: (value: boolean) => void;
  onGraphWeightedChange: (value: boolean) => void;
  onGraphNodeScaleChange: (value: number) => void;
  onGraphPhysicsChange: (value: boolean) => void;
  onGraphEdgeSpringChange: (value: number) => void;
  onGraphEdgeLengthChange: (value: number) => void;
  onGraphDegreeRepelChange: (value: number) => void;
  onGenerateGraph: () => void;
};

type Props = CommonProps & (MazeProps | GraphProps);

export function ControlsBar(props: Props) {
  const {
    mode,
    globalMode,
    stepsPerTick,
    speedIndex,
    onSpeedIndexChange,
    toggles,
    onTogglesChange,
    onStart,
    onPause,
    onResume,
    onReset,
    onStep,
    onModeChange,
    editMode,
    onEditModeChange,
  } = props;
  const onToggle =
    (key: keyof OverlayToggles) =>
    (e: ChangeEvent<HTMLInputElement>) =>
      onTogglesChange({ ...toggles, [key]: e.target.checked });

  return (
    <div className="controls">
      <div className="modeToggle">
        <button type="button" onClick={() => onModeChange("maze")} aria-pressed={mode === "maze"}>
          Labirinto
        </button>
        <button type="button" onClick={() => onModeChange("graph")} aria-pressed={mode === "graph"}>
          Grafo
        </button>
      </div>

      <div className="controlsRow">
        <div className="buttonRow">
          <button onClick={onStart} disabled={globalMode === "RUNNING"}>
            Iniciar
          </button>
          <button onClick={onPause} disabled={globalMode !== "RUNNING"}>
            Pausar
          </button>
          <button onClick={onResume} disabled={globalMode !== "PAUSED"}>
            Continuar
          </button>
          <button onClick={onReset}>Reset</button>
          <button onClick={onStep} disabled={globalMode === "RUNNING"}>
            Executar 1 passo
          </button>
        </div>

        <div className="speed">
          <label>
            Velocidade: <span className="mono">{stepsPerTick}</span> steps/tick
          </label>
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={speedIndex}
            onChange={(e) => onSpeedIndexChange(Number(e.target.value))}
          />
        </div>

        <div className="toggles">
          <label>
            <input type="checkbox" checked={toggles.showVisited} onChange={onToggle("showVisited")} /> Visitados
          </label>
          <label>
            <input type="checkbox" checked={toggles.showFrontier} onChange={onToggle("showFrontier")} /> Fronteira
          </label>
          <label>
            <input type="checkbox" checked={toggles.showCurrent} onChange={onToggle("showCurrent")} /> Nó atual
          </label>
          <label>
            <input type="checkbox" checked={toggles.showPath} onChange={onToggle("showPath")} /> Caminho final
          </label>
        </div>
      </div>

      {mode === "maze" ? (
        <div className="mazeControls">
          <div className="mazeFields">
            <div className="mazeField">
              <label htmlFor="maze-rows">Linhas</label>
              <input
                id="maze-rows"
                type="number"
                min={5}
                max={121}
                value={props.mazeRows}
                onChange={(e) => props.onMazeRowsChange(Number(e.target.value))}
              />
            </div>
            <div className="mazeField">
              <label htmlFor="maze-cols">Colunas</label>
              <input
                id="maze-cols"
                type="number"
                min={5}
                max={121}
                value={props.mazeCols}
                onChange={(e) => props.onMazeColsChange(Number(e.target.value))}
              />
            </div>
            <div className="mazeField mazeFieldRange">
              <label htmlFor="maze-braid">Ciclos</label>
              <div className="mazeRange">
                <input
                  id="maze-braid"
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={props.braidFactor}
                  onChange={(e) => props.onBraidFactorChange(Number(e.target.value))}
                  aria-label="Fator de ciclos"
                />
                <span className="mono">{props.braidFactor.toFixed(2)}</span>
              </div>
            </div>
            <div className="mazeField mazeFieldRange">
              <label htmlFor="maze-traffic">Trafego</label>
              <div className="mazeRange">
                <input
                  id="maze-traffic"
                  type="range"
                  min={0}
                  max={40}
                  step={1}
                  value={props.trafficPercent}
                  onChange={(e) => props.onTrafficPercentChange(Number(e.target.value))}
                  aria-label="Percentual de trafego"
                />
                <span className="mono">{props.trafficPercent}%</span>
              </div>
            </div>
          </div>
          <div className="mazeActions">
            <button onClick={props.onGenerateMaze} disabled={globalMode === "RUNNING"}>
              Gerar labirinto
            </button>
            <button onClick={props.onAddTraffic} disabled={globalMode === "RUNNING"}>
              Adicionar trafego
            </button>
          </div>
          <div className="mazeActions">
            <button
              onClick={() => onEditModeChange(editMode === "start" ? null : "start")}
              aria-pressed={editMode === "start"}
            >
              Definir inicio
            </button>
            <button
              onClick={() => onEditModeChange(editMode === "goal" ? null : "goal")}
              aria-pressed={editMode === "goal"}
            >
              Definir objetivo
            </button>
            <button onClick={() => onEditModeChange(null)} disabled={!editMode}>
              Cancelar
            </button>
          </div>
          <div className="mazeHint">
            Dimensoes pares sao ajustadas para impares. Use os botoes acima e clique no labirinto para aplicar.
          </div>
        </div>
      ) : (
        <div className="graphControls">
          <div className="mazeFields">
            <div className="mazeField">
              <label htmlFor="graph-layout">Layout</label>
              <select
                id="graph-layout"
                value={props.graphLayout}
                onChange={(e) => props.onGraphLayoutChange(e.target.value as GraphLayout)}
              >
                <option value="random">Aleatorio</option>
                <option value="geometric">Geometrico</option>
                <option value="star">Estrela</option>
                <option value="circular">Circular</option>
              </select>
            </div>
            <div className="mazeField">
              <label htmlFor="graph-nodes">Nos</label>
              <input
                id="graph-nodes"
                type="number"
                min={4}
                max={200}
                value={props.graphNodes}
                onChange={(e) => props.onGraphNodesChange(Number(e.target.value))}
              />
            </div>
            <div className="mazeField mazeFieldRange">
              <label htmlFor="graph-density">Densidade</label>
              <div className="mazeRange">
                <input
                  id="graph-density"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={props.graphDensity}
                  onChange={(e) => props.onGraphDensityChange(Number(e.target.value))}
                />
                <span className="mono">{props.graphDensity}%</span>
              </div>
            </div>
            <div className="mazeField mazeFieldRange">
              <label htmlFor="graph-node-scale">Tamanho dos nos</label>
              <div className="mazeRange">
                <input
                  id="graph-node-scale"
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={props.graphNodeScale}
                  onChange={(e) => props.onGraphNodeScaleChange(Number(e.target.value))}
                />
                <span className="mono">{props.graphNodeScale.toFixed(1)}x</span>
              </div>
            </div>
            <div className="mazeField mazeFieldRange">
              <label htmlFor="graph-edge-spring">Atracao das arestas</label>
              <div className="mazeRange">
                <input
                  id="graph-edge-spring"
                  type="range"
                  min={0}
                  max={0.02}
                  step={0.001}
                  value={props.graphEdgeSpring}
                  onChange={(e) => props.onGraphEdgeSpringChange(Number(e.target.value))}
                />
                <span className="mono">{props.graphEdgeSpring.toFixed(3)}</span>
              </div>
            </div>
            <div className="mazeField mazeFieldRange">
              <label htmlFor="graph-edge-length">Comprimento ideal</label>
              <div className="mazeRange">
                <input
                  id="graph-edge-length"
                  type="range"
                  min={0.05}
                  max={0.5}
                  step={0.01}
                  value={props.graphEdgeLength}
                  onChange={(e) => props.onGraphEdgeLengthChange(Number(e.target.value))}
                />
                <span className="mono">{props.graphEdgeLength.toFixed(2)}</span>
              </div>
            </div>
            <div className="mazeField mazeFieldRange">
              <label htmlFor="graph-degree-repel">Empurrar isolados</label>
              <div className="mazeRange">
                <input
                  id="graph-degree-repel"
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={props.graphDegreeRepel}
                  onChange={(e) => props.onGraphDegreeRepelChange(Number(e.target.value))}
                />
                <span className="mono">{props.graphDegreeRepel.toFixed(1)}</span>
              </div>
            </div>
            <div className="mazeField">
              <label>
                <input
                  type="checkbox"
                  checked={props.graphDirected}
                  onChange={(e) => props.onGraphDirectedChange(e.target.checked)}
                />{" "}
                Direcionado
              </label>
            </div>
            <div className="mazeField">
              <label>
                <input
                  type="checkbox"
                  checked={props.graphWeighted}
                  onChange={(e) => props.onGraphWeightedChange(e.target.checked)}
                />{" "}
                Ponderado (custos)
              </label>
            </div>
            <div className="mazeField">
              <label>
                <input
                  type="checkbox"
                  checked={props.graphPhysicsEnabled}
                  onChange={(e) => props.onGraphPhysicsChange(e.target.checked)}
                />{" "}
                Fisica (repulsao)
              </label>
            </div>
          </div>
          <div className="mazeActions">
            <button onClick={props.onGenerateGraph} disabled={globalMode === "RUNNING"}>
              Gerar grafo
            </button>
          </div>
          <div className="mazeActions">
            <button
              onClick={() => onEditModeChange(editMode === "start" ? null : "start")}
              aria-pressed={editMode === "start"}
            >
              Definir inicio
            </button>
            <button
              onClick={() => onEditModeChange(editMode === "goal" ? null : "goal")}
              aria-pressed={editMode === "goal"}
            >
              Definir objetivo
            </button>
            <button onClick={() => onEditModeChange(null)} disabled={!editMode}>
              Cancelar
            </button>
          </div>
          <div className="mazeHint">
            Use os botoes acima e clique em um no para aplicar. Pesos sao atualizados ao marcar "Ponderado".
          </div>
        </div>
      )}

      {mode === "maze" && (
        <div className="legend">
          <div className="legendTitle">Heatmap (custo)</div>
          <div className="legendItems">
            <LegendSwatch label="0" color={costToColor(0)} />
            {Object.entries(COST_PALETTE)
              .map(([k, v]) => ({ cost: Number(k), color: v }))
              .sort((a, b) => a.cost - b.cost)
              .map(({ cost, color }) => (
                <LegendSwatch key={cost} label={String(cost)} color={color} />
              ))}
            <LegendSwatch label="9+" color={costToColor(9)} />
          </div>
        </div>
      )}
    </div>
  );
}

function LegendSwatch({ label, color }: { label: string; color: string }) {
  return (
    <div className="swatch">
      <span className="box" style={{ background: color }} />
      <span className="mono">{label}</span>
    </div>
  );
}
