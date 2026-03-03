import { useEffect, useMemo, useRef, useState } from "react";
import { createRunners as createMazeRunners } from "./algorithms/createRunners";
import type { RunnerSnapshot } from "./algorithms/types";
import { createRunners as createGraphRunners } from "./graph/algorithms/createRunners";
import type { RunnerSnapshot as GraphRunnerSnapshot } from "./graph/algorithms/types";
import { ControlsBar, type OverlayToggles, type ViewMode } from "./components/ControlsBar";
import { GraphCard } from "./components/GraphCard";
import { MazeCard } from "./components/MazeCard";
import { generateGraph, updateGraphWeights } from "./graph/generator";
import { stepGraphPhysics } from "./graph/physics";
import type { GraphLayout, GraphModel } from "./graph/types";
import { addTraffic, generateMaze } from "./maze/generator";
import type { MazeModel, Pos } from "./maze/types";

const STEPS_PER_TICK_OPTIONS = [1, 2, 5, 10, 30, 100] as const;
const DETAIL_BASE_HEIGHT = 420;
const DETAIL_ZOOM_MIN = 1;
const DETAIL_ZOOM_MAX = 2.5;
const DETAIL_ZOOM_STEP = 0.1;
const DEFAULT_ROWS = 61;
const DEFAULT_COLS = 61;
const DEFAULT_BRAID = 0.2;
const DEFAULT_TRAFFIC = 12;
const DEFAULT_GRAPH_LAYOUT: GraphLayout = "geometric";
const DEFAULT_GRAPH_NODES = 40;
const DEFAULT_GRAPH_DENSITY = 25;
const DEFAULT_GRAPH_DIRECTED = false;
const DEFAULT_GRAPH_WEIGHTED = false;
const DEFAULT_GRAPH_NODE_SCALE = 1;
const DEFAULT_GRAPH_PHYSICS = true;
const DEFAULT_GRAPH_EDGE_SPRING = 0.004;
const DEFAULT_GRAPH_EDGE_LENGTH = 0.18;
const DEFAULT_GRAPH_DEGREE_REPEL = 0.8;

type GlobalMode = "IDLE" | "RUNNING" | "PAUSED";

export function App() {
  const mazeRunners = useMemo(() => createMazeRunners(), []);
  const graphRunners = useMemo(() => createGraphRunners(), []);
  const [mode, setMode] = useState<ViewMode>("maze");

  const [maze, setMaze] = useState<MazeModel>(() =>
    generateMaze({ rows: DEFAULT_ROWS, cols: DEFAULT_COLS, braidFactor: DEFAULT_BRAID }),
  );
  const [mazeRows, setMazeRows] = useState(DEFAULT_ROWS);
  const [mazeCols, setMazeCols] = useState(DEFAULT_COLS);
  const [braidFactor, setBraidFactor] = useState(DEFAULT_BRAID);
  const [trafficPercent, setTrafficPercent] = useState(DEFAULT_TRAFFIC);
  const [mazeEditMode, setMazeEditMode] = useState<"start" | "goal" | null>(null);

  const [graph, setGraph] = useState<GraphModel>(() =>
    generateGraph({
      layout: DEFAULT_GRAPH_LAYOUT,
      nodes: DEFAULT_GRAPH_NODES,
      density: DEFAULT_GRAPH_DENSITY,
      directed: DEFAULT_GRAPH_DIRECTED,
      weighted: DEFAULT_GRAPH_WEIGHTED,
    }),
  );
  const [graphLayout, setGraphLayout] = useState<GraphLayout>(DEFAULT_GRAPH_LAYOUT);
  const [graphNodes, setGraphNodes] = useState(DEFAULT_GRAPH_NODES);
  const [graphDensity, setGraphDensity] = useState(DEFAULT_GRAPH_DENSITY);
  const [graphDirected, setGraphDirected] = useState(DEFAULT_GRAPH_DIRECTED);
  const [graphWeighted, setGraphWeighted] = useState(DEFAULT_GRAPH_WEIGHTED);
  const [graphNodeScale, setGraphNodeScale] = useState(DEFAULT_GRAPH_NODE_SCALE);
  const [graphPhysicsEnabled, setGraphPhysicsEnabled] = useState(DEFAULT_GRAPH_PHYSICS);
  const [graphEdgeSpring, setGraphEdgeSpring] = useState(DEFAULT_GRAPH_EDGE_SPRING);
  const [graphEdgeLength, setGraphEdgeLength] = useState(DEFAULT_GRAPH_EDGE_LENGTH);
  const [graphDegreeRepel, setGraphDegreeRepel] = useState(DEFAULT_GRAPH_DEGREE_REPEL);
  const [graphEditMode, setGraphEditMode] = useState<"start" | "goal" | null>(null);

  const [mazeGlobalMode, setMazeGlobalMode] = useState<GlobalMode>("IDLE");
  const [graphGlobalMode, setGraphGlobalMode] = useState<GlobalMode>("IDLE");
  const [speedIndex, setSpeedIndex] = useState(2); // 5 steps/tick
  const stepsPerTick = STEPS_PER_TICK_OPTIONS[Math.min(Math.max(speedIndex, 0), STEPS_PER_TICK_OPTIONS.length - 1)]!;

  const [toggles, setToggles] = useState<OverlayToggles>({
    showVisited: true,
    showFrontier: true,
    showCurrent: true,
    showPath: true,
  });

  const [mazeSnapshots, setMazeSnapshots] = useState<RunnerSnapshot[]>(() => {
    mazeRunners.forEach((r) => r.reset(maze));
    return mazeRunners.map((r) => r.snapshot());
  });
  const [graphSnapshots, setGraphSnapshots] = useState<GraphRunnerSnapshot[]>(() => {
    graphRunners.forEach((r) => r.reset(graph));
    return graphRunners.map((r) => r.snapshot());
  });

  const [mazeSelectedRunnerName, setMazeSelectedRunnerName] = useState<string | null>(null);
  const [graphSelectedRunnerName, setGraphSelectedRunnerName] = useState<string | null>(null);
  const [detailZoom, setDetailZoom] = useState(1.5);

  const mazeLastTickRef = useRef<number | null>(null);
  const graphLastTickRef = useRef<number | null>(null);

  const applyMaze = (nextMaze: MazeModel) => {
    setMaze(nextMaze);
    setMazeRows(nextMaze.rows);
    setMazeCols(nextMaze.cols);
    mazeRunners.forEach((r) => r.reset(nextMaze));
    setMazeGlobalMode("IDLE");
    mazeLastTickRef.current = null;
    setMazeEditMode(null);
    setMazeSnapshots(mazeRunners.map((r) => r.snapshot()));
  };

  const applyGraph = (nextGraph: GraphModel) => {
    setGraph(nextGraph);
    setGraphNodes(nextGraph.nodes.length);
    setGraphWeighted(nextGraph.weighted);
    setGraphDirected(nextGraph.directed);
    graphRunners.forEach((r) => r.reset(nextGraph));
    setGraphGlobalMode("IDLE");
    graphLastTickRef.current = null;
    setGraphEditMode(null);
    setGraphSnapshots(graphRunners.map((r) => r.snapshot()));
  };

  const refreshMazeSnapshots = () => setMazeSnapshots(mazeRunners.map((r) => r.snapshot()));
  const refreshGraphSnapshots = () => setGraphSnapshots(graphRunners.map((r) => r.snapshot()));

  const resetAll = () => {
    if (mode === "maze") {
      mazeRunners.forEach((r) => r.reset(maze));
      setMazeGlobalMode("IDLE");
      mazeLastTickRef.current = null;
      refreshMazeSnapshots();
      return;
    }
    graphRunners.forEach((r) => r.reset(graph));
    setGraphGlobalMode("IDLE");
    graphLastTickRef.current = null;
    refreshGraphSnapshots();
  };

  const startAll = () => {
    if (mode === "maze") {
      mazeRunners.forEach((r) => r.reset(maze));
      mazeRunners.forEach((r) => r.start());
      setMazeGlobalMode("RUNNING");
      mazeLastTickRef.current = performance.now();
      refreshMazeSnapshots();
      return;
    }
    graphRunners.forEach((r) => r.reset(graph));
    graphRunners.forEach((r) => r.start());
    setGraphGlobalMode("RUNNING");
    graphLastTickRef.current = performance.now();
    refreshGraphSnapshots();
  };

  const pauseAll = () => {
    if (mode === "maze") {
      mazeRunners.forEach((r) => r.pause());
      setMazeGlobalMode("PAUSED");
      mazeLastTickRef.current = null;
      refreshMazeSnapshots();
      return;
    }
    graphRunners.forEach((r) => r.pause());
    setGraphGlobalMode("PAUSED");
    graphLastTickRef.current = null;
    refreshGraphSnapshots();
  };

  const resumeAll = () => {
    if (mode === "maze") {
      mazeRunners.forEach((r) => r.resume());
      setMazeGlobalMode("RUNNING");
      mazeLastTickRef.current = performance.now();
      refreshMazeSnapshots();
      return;
    }
    graphRunners.forEach((r) => r.resume());
    setGraphGlobalMode("RUNNING");
    graphLastTickRef.current = performance.now();
    refreshGraphSnapshots();
  };

  const stepOnceAll = () => {
    if (mode === "maze") {
      mazeRunners.forEach((r) => {
        const status = r.snapshot().status;
        if (status === "IDLE") r.start();
        if (status === "PAUSED") r.resume();
      });
      mazeRunners.forEach((r) => r.step());
      mazeRunners.forEach((r) => {
        const status = r.snapshot().status;
        if (status === "RUNNING") r.pause();
      });
      setMazeGlobalMode("PAUSED");
      refreshMazeSnapshots();
      return;
    }
    graphRunners.forEach((r) => {
      const status = r.snapshot().status;
      if (status === "IDLE") r.start();
      if (status === "PAUSED") r.resume();
    });
    graphRunners.forEach((r) => r.step());
    graphRunners.forEach((r) => {
      const status = r.snapshot().status;
      if (status === "RUNNING") r.pause();
    });
    setGraphGlobalMode("PAUSED");
    refreshGraphSnapshots();
  };

  const generateNewMaze = () => {
    const nextMaze = generateMaze({ rows: mazeRows, cols: mazeCols, braidFactor });
    applyMaze(nextMaze);
  };

  const addMazeTraffic = () => {
    const nextMaze = addTraffic(maze, trafficPercent);
    applyMaze(nextMaze);
  };

  const generateNewGraph = () => {
    const nextGraph = generateGraph({
      layout: graphLayout,
      nodes: graphNodes,
      density: graphDensity,
      directed: graphDirected,
      weighted: graphWeighted,
    });
    applyGraph(nextGraph);
  };

  const handleGraphWeightedChange = (value: boolean) => {
    setGraphWeighted(value);
    applyGraph(updateGraphWeights(graph, value));
  };

  const updateMazeStartGoal = (pos: Pos, action: "start" | "goal") => {
    if ((maze.grid[pos.r]?.[pos.c] ?? 0) === 0) return;
    if (action === "start" && pos.r === maze.start.r && pos.c === maze.start.c) return;
    if (action === "goal" && pos.r === maze.goal.r && pos.c === maze.goal.c) return;

    const nextMaze = {
      ...maze,
      start: action === "start" ? pos : maze.start,
      goal: action === "goal" ? pos : maze.goal,
    };
    applyMaze(nextMaze);
    setMazeEditMode(null);
  };

  const updateGraphStartGoal = (nodeId: number, action: "start" | "goal") => {
    if (!graph.nodes[nodeId]) return;
    if (action === "start" && nodeId === graph.startId) return;
    if (action === "goal" && nodeId === graph.goalId) return;

    const nextGraph = {
      ...graph,
      startId: action === "start" ? nodeId : graph.startId,
      goalId: action === "goal" ? nodeId : graph.goalId,
    };
    applyGraph(nextGraph);
    setGraphEditMode(null);
  };

  useEffect(() => {
    if (mode !== "maze" || mazeGlobalMode !== "RUNNING") return;
    mazeLastTickRef.current = performance.now();
    const timerId = window.setInterval(() => {
      const now = performance.now();
      const last = mazeLastTickRef.current ?? now;
      const dt = now - last;
      mazeLastTickRef.current = now;

      mazeRunners.forEach((r) => r.addElapsedMs(dt));
      for (let i = 0; i < stepsPerTick; i++) mazeRunners.forEach((r) => r.step());
      setMazeSnapshots(mazeRunners.map((r) => r.snapshot()));
    }, 30);

    return () => {
      window.clearInterval(timerId);
    };
  }, [mode, mazeGlobalMode, mazeRunners, stepsPerTick]);

  useEffect(() => {
    if (mode !== "graph" || graphGlobalMode !== "RUNNING") return;
    graphLastTickRef.current = performance.now();
    const timerId = window.setInterval(() => {
      const now = performance.now();
      const last = graphLastTickRef.current ?? now;
      const dt = now - last;
      graphLastTickRef.current = now;

      graphRunners.forEach((r) => r.addElapsedMs(dt));
      for (let i = 0; i < stepsPerTick; i++) graphRunners.forEach((r) => r.step());
      setGraphSnapshots(graphRunners.map((r) => r.snapshot()));
    }, 30);

    return () => {
      window.clearInterval(timerId);
    };
  }, [mode, graphGlobalMode, graphRunners, stepsPerTick]);

  useEffect(() => {
    if (mode !== "graph" || !graphPhysicsEnabled || graphGlobalMode !== "IDLE") return;
    let rafId = 0;
    const tick = () => {
      setGraph((prev) =>
        stepGraphPhysics(prev, {
          edgeSpring: graphEdgeSpring,
          edgeLength: graphEdgeLength,
          degreeRepelBias: graphDegreeRepel,
        }),
      );
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [mode, graphPhysicsEnabled, graphGlobalMode, graphEdgeSpring, graphEdgeLength, graphDegreeRepel]);

  const mazeSelectedRunnerIndex = mazeSelectedRunnerName ? mazeRunners.findIndex((r) => r.name === mazeSelectedRunnerName) : -1;
  const isMazeSingleView = mazeSelectedRunnerIndex >= 0;
  const selectedMazeRunner = isMazeSingleView ? mazeRunners[mazeSelectedRunnerIndex]! : null;
  const selectedMazeSnapshot = isMazeSingleView ? mazeSnapshots[mazeSelectedRunnerIndex]! : null;

  const graphSelectedRunnerIndex = graphSelectedRunnerName
    ? graphRunners.findIndex((r) => r.name === graphSelectedRunnerName)
    : -1;
  const isGraphSingleView = graphSelectedRunnerIndex >= 0;
  const selectedGraphRunner = isGraphSingleView ? graphRunners[graphSelectedRunnerIndex]! : null;
  const selectedGraphSnapshot = isGraphSingleView ? graphSnapshots[graphSelectedRunnerIndex]! : null;

  const activeGlobalMode = mode === "maze" ? mazeGlobalMode : graphGlobalMode;
  const activeEditMode = mode === "maze" ? mazeEditMode : graphEditMode;
  const handleEditModeChange = (next: "start" | "goal" | null) => {
    if (mode === "maze") setMazeEditMode(next);
    else setGraphEditMode(next);
  };
  const detailHeightPx = Math.round(DETAIL_BASE_HEIGHT * detailZoom);

  return (
    <div className="app">
      {mode === "maze" ? (
        <ControlsBar
          mode="maze"
          globalMode={activeGlobalMode}
          stepsPerTick={stepsPerTick}
          speedIndex={speedIndex}
          onSpeedIndexChange={setSpeedIndex}
          toggles={toggles}
          onTogglesChange={setToggles}
          onStart={startAll}
          onPause={pauseAll}
          onResume={resumeAll}
          onReset={resetAll}
          onStep={stepOnceAll}
          onModeChange={setMode}
          editMode={activeEditMode}
          onEditModeChange={handleEditModeChange}
          mazeRows={mazeRows}
          mazeCols={mazeCols}
          braidFactor={braidFactor}
          trafficPercent={trafficPercent}
          onMazeRowsChange={setMazeRows}
          onMazeColsChange={setMazeCols}
          onBraidFactorChange={setBraidFactor}
          onTrafficPercentChange={setTrafficPercent}
          onGenerateMaze={generateNewMaze}
          onAddTraffic={addMazeTraffic}
        />
      ) : (
        <ControlsBar
          mode="graph"
          globalMode={activeGlobalMode}
          stepsPerTick={stepsPerTick}
          speedIndex={speedIndex}
          onSpeedIndexChange={setSpeedIndex}
          toggles={toggles}
          onTogglesChange={setToggles}
          onStart={startAll}
          onPause={pauseAll}
          onResume={resumeAll}
          onReset={resetAll}
          onStep={stepOnceAll}
          onModeChange={setMode}
          editMode={activeEditMode}
          onEditModeChange={handleEditModeChange}
          graphLayout={graphLayout}
          graphNodes={graphNodes}
          graphDensity={graphDensity}
          graphDirected={graphDirected}
          graphWeighted={graphWeighted}
          onGraphLayoutChange={setGraphLayout}
          onGraphNodesChange={setGraphNodes}
          onGraphDensityChange={setGraphDensity}
          onGraphDirectedChange={setGraphDirected}
          onGraphWeightedChange={handleGraphWeightedChange}
          graphNodeScale={graphNodeScale}
          onGraphNodeScaleChange={setGraphNodeScale}
          graphPhysicsEnabled={graphPhysicsEnabled}
          onGraphPhysicsChange={setGraphPhysicsEnabled}
          graphEdgeSpring={graphEdgeSpring}
          onGraphEdgeSpringChange={setGraphEdgeSpring}
          graphEdgeLength={graphEdgeLength}
          onGraphEdgeLengthChange={setGraphEdgeLength}
          graphDegreeRepel={graphDegreeRepel}
          onGraphDegreeRepelChange={setGraphDegreeRepel}
          onGenerateGraph={generateNewGraph}
        />
      )}

      <div className="appContent">
        {mode === "maze" ? (
          isMazeSingleView && selectedMazeRunner && selectedMazeSnapshot ? (
            <>
              <div className="detailHeader">
                <button type="button" onClick={() => setMazeSelectedRunnerName(null)}>
                  Voltar
                </button>
                <div className="detailTitle">{selectedMazeRunner.name}</div>
                <div className="detailControls">
                  <label htmlFor="detail-zoom">Zoom</label>
                  <input
                    id="detail-zoom"
                    type="range"
                    min={DETAIL_ZOOM_MIN}
                    max={DETAIL_ZOOM_MAX}
                    step={DETAIL_ZOOM_STEP}
                    value={detailZoom}
                    onChange={(event) => setDetailZoom(Number(event.target.value))}
                    aria-label="Zoom do labirinto"
                  />
                  <span className="detailZoomValue">{Math.round(detailZoom * 100)}%</span>
                </div>
              </div>
              <div className="grid gridSingle">
                <MazeCard
                  title={selectedMazeRunner.name}
                  maze={maze}
                  runner={selectedMazeRunner}
                  snapshot={selectedMazeSnapshot}
                  toggles={toggles}
                  onCellEdit={updateMazeStartGoal}
                  editMode={mazeEditMode}
                  viewportHeightPx={detailHeightPx}
                />
              </div>
            </>
          ) : (
            <div className="grid">
              {mazeRunners.map((runner, idx) => (
                <MazeCard
                  key={runner.name}
                  title={runner.name}
                  maze={maze}
                  runner={runner}
                  snapshot={mazeSnapshots[idx]!}
                  toggles={toggles}
                  onCellEdit={updateMazeStartGoal}
                  editMode={mazeEditMode}
                  onSelect={() => setMazeSelectedRunnerName(runner.name)}
                />
              ))}
            </div>
          )
        ) : isGraphSingleView && selectedGraphRunner && selectedGraphSnapshot ? (
          <>
            <div className="detailHeader">
              <button type="button" onClick={() => setGraphSelectedRunnerName(null)}>
                Voltar
              </button>
              <div className="detailTitle">{selectedGraphRunner.name}</div>
              <div className="detailControls">
                <label htmlFor="detail-zoom">Zoom</label>
                <input
                  id="detail-zoom"
                  type="range"
                  min={DETAIL_ZOOM_MIN}
                  max={DETAIL_ZOOM_MAX}
                  step={DETAIL_ZOOM_STEP}
                  value={detailZoom}
                  onChange={(event) => setDetailZoom(Number(event.target.value))}
                  aria-label="Zoom do grafo"
                />
                <span className="detailZoomValue">{Math.round(detailZoom * 100)}%</span>
              </div>
            </div>
            <div className="grid gridSingle">
              <GraphCard
                title={selectedGraphRunner.name}
                graph={graph}
                runner={selectedGraphRunner}
                snapshot={selectedGraphSnapshot}
                toggles={toggles}
                onNodeEdit={updateGraphStartGoal}
                editMode={graphEditMode}
                nodeScale={graphNodeScale}
                viewportHeightPx={detailHeightPx}
              />
            </div>
          </>
        ) : (
          <div className="grid">
            {graphRunners.map((runner, idx) => (
              <GraphCard
                key={runner.name}
                title={runner.name}
                graph={graph}
                runner={runner}
                snapshot={graphSnapshots[idx]!}
                toggles={toggles}
                onNodeEdit={updateGraphStartGoal}
                editMode={graphEditMode}
                nodeScale={graphNodeScale}
                onSelect={() => setGraphSelectedRunnerName(runner.name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
