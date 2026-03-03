/**
 * Maze Generator with Weighted Traffic Propagation
 */

const CELL_WALL = 0;
const CELL_PATH = 1;
const CELL_TRAFFIC_MAX = 7;

class MazeGenerator {
    constructor(canvasId, statusId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.statusEl = document.getElementById(statusId);

        this.grid = [];
        this.width = 0;
        this.height = 0;
        this.cellSize = 20; // Default cell size in pixels
    }

    updateStatus(msg) {
        if (this.statusEl) {
            this.statusEl.textContent = msg;
        }
    }

    // Initialize grid with walls (0)
    initGrid(w, h) {
        // Ensure dimensions are odd for better maze walls
        this.width = w % 2 === 0 ? w + 1 : w;
        this.height = h % 2 === 0 ? h + 1 : h;

        this.grid = new Array(this.height).fill(0).map(() => new Array(this.width).fill(CELL_WALL));
    }

    generate(w, h, braidFactor) {
        this.initGrid(w, h);
        this.updateStatus("Gerando labirinto...");

        // Recursive Backtracker
        const startX = 1;
        const startY = 1;
        this.grid[startY][startX] = CELL_PATH;

        const stack = [{ x: startX, y: startY }];

        const directions = [
            { dx: 0, dy: -2 }, // North
            { dx: 2, dy: 0 },  // East
            { dx: 0, dy: 2 },  // South
            { dx: -2, dy: 0 }  // West
        ];

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            // Fisher-Yates shuffle for true randomness
            this.shuffle(directions);

            let found = false;
            for (let dir of directions) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;

                if (nx > 0 && nx < this.width - 1 && ny > 0 && ny < this.height - 1 && this.grid[ny][nx] === CELL_WALL) {
                    this.grid[ny][nx] = CELL_PATH;
                    // Carve the wall between
                    this.grid[current.y + dir.dy / 2][current.x + dir.dx / 2] = CELL_PATH;

                    stack.push({ x: nx, y: ny });
                    found = true;
                    break;
                }
            }

            if (!found) {
                stack.pop();
            }
        }

        this.applyBraiding(braidFactor);
        this.draw();
        this.updateStatus("Labirinto base gerado.");
    }

    applyBraiding(factor) {
        // Find all dead ends (cells with only 1 visited neighbor)
        // A dead end in our 1-based path grid means it has 3 wall neighbors.
        // We iterate over odd coordinates where we carve rooms.

        for (let y = 1; y < this.height; y += 2) {
            for (let x = 1; x < this.width; x += 2) {
                if (this.grid[y][x] !== CELL_PATH) continue;

                // Check neighbors
                let neighbors = [];
                const dirs = [
                    { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
                ];

                // Count open paths
                let openCount = 0;
                dirs.forEach(d => {
                    if (this.grid[y + d.dy][x + d.dx] !== CELL_WALL) openCount++;
                });

                // If it's a dead end (only 1 way out)
                if (openCount === 1) {
                    // Randomly decide to open it based on factor
                    if (Math.random() < factor) {
                        // Find a closed neighbor that is valid to open connecting to another path
                        // Ideally connect to another separate path, but opening to any valid neighbor is "braiding"

                        // Valid neighbors to carve into are ones that are not current 0 (outer bounds)
                        // Actually, we just need to find a wall neighbor that leads to a visited cell (Loop) 
                        // or just any wall if we want to extend (but we want loops).
                        // Simple braiding: Connect to any neighbor that is currently a path but separated by a wall?
                        // Actually in grid logic, we just carve through a wall to another cell.

                        this.shuffle(dirs);
                        for (let d of dirs) {
                            const nx = x + d.dx * 2;
                            const ny = y + d.dy * 2;
                            const wx = x + d.dx;
                            const wy = y + d.dy;

                            if (nx > 0 && nx < this.width - 1 && ny > 0 && ny < this.height - 1) {
                                // If the destination is already a path, carving to it creates a loop
                                if (this.grid[ny][nx] !== CELL_WALL && this.grid[wy][wx] === CELL_WALL) {
                                    this.grid[wy][wx] = CELL_PATH;
                                    break; // Only open one per dead end
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    injectTraffic(probabilityPercent) {
        this.updateStatus("Inserindo tráfego...");

        // Find all path candidates (ignore 0s)
        let candidates = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] === CELL_PATH) {
                    candidates.push({ x, y });
                }
            }
        }

        // Number of sources
        const sourcesCount = Math.floor(candidates.length * (probabilityPercent / 100));

        // Shuffle candidates to pick formatting
        this.shuffle(candidates);

        // Top N become sources (7)
        let sources = candidates.slice(0, sourcesCount);
        let queue = [];

        sources.forEach(p => {
            this.grid[p.y][p.x] = 7;
            queue.push({ x: p.x, y: p.y, val: 7 });
        });

        // Propagate
        this.propagateTrafficBFS(queue);

        this.draw();
        this.updateStatus(`Tráfego inserido com ${sourcesCount} focos.`);
    }

    propagateTrafficBFS(queue) {
        // We use a specific logic: P6 > P5 > P4...
        // When processing a cell with value V (e.g., 7), its neighbors can become V-1, or V-2, etc.
        // BUT the user asked for a probability distribution. 
        // "A 7 has a higher chance to have a neighbor 5" - Wait. "P6>P5>P4" usually means 6 is most likely neighbor of 7.
        // "7 tem uma chance maior de ter um vizinho 5 mas ter um vizinho 5, ou 4 ou 3 mas quanto menor o número, menor a propoabiliadde"
        // Let's re-read: "P6 > P5 > P4". This means P(neighbor=6) > P(neighbor=5).
        // So strict linear decay 7->6 is most common.

        // Logic:
        // Pop node V.
        // For each neighbor N:
        //   If N is a path (>=1) and N < V (meaning we can increase it):
        //     Determine new value NewFromV.
        //         Probabilistic decay:
        //         - Chance to be V-1: High (e.g. 50%)
        //         - Chance to be V-2: Med (e.g. 30%)
        //         - Chance to be V-3: Low (e.g. 20%)
        //     If NewFromV > N:
        //        Update N = NewFromV
        //        Add N to queue

        while (queue.length > 0) {
            // Sort queue? No, standard BFS is fine, but since costs vary, maybe we want higher values to process first?
            // Yes, a priority queue would be better to ensure high traffic dominates.
            // Simple sort for now:
            queue.sort((a, b) => b.val - a.val);
            const curr = queue.shift();

            const dirs = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];

            dirs.forEach(d => {
                const nx = curr.x + d.dx;
                const ny = curr.y + d.dy;

                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                    const neighborVal = this.grid[ny][nx];

                    if (neighborVal !== CELL_WALL) {
                        // Calculate potential value
                        const decayedVal = this.getDecayedValue(curr.val);

                        if (decayedVal > neighborVal && decayedVal > 1) { // Apply only if it increases traffic and is > 1
                            this.grid[ny][nx] = decayedVal;
                            queue.push({ x: nx, y: ny, val: decayedVal });
                        }
                    }
                }
            });
        }
    }

    getDecayedValue(sourceVal) {
        if (sourceVal <= 2) return 1; // Can't decay below 2 effectively (since 1 is base)

        // User rule: P6>P5>P4 (for source 7)
        // Implies we prefer -1 step.
        // Let's use a simple weighted random.
        // Decay by 1: 60%
        // Decay by 2: 25%
        // Decay by 3: 10%
        // Decay by 4+: 5%

        const r = Math.random();
        let drop = 1;
        if (r < 0.6) drop = 1;
        else if (r < 0.85) drop = 2;
        else if (r < 0.95) drop = 3;
        else drop = 4;

        return Math.max(1, sourceVal - drop);
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    draw() {
        // Auto scale cell size to fit canvas or stick to fixed?
        // Let's maximize canvas filling.
        const container = this.canvas.parentElement;
        const maxWidth = container.clientWidth;

        // Calculate max cell size that fits
        const sizeX = Math.floor(maxWidth / this.width);
        const sizeY = Math.floor(window.innerHeight * 0.7 / this.height);
        this.cellSize = Math.min(sizeX, sizeY, 40);
        this.cellSize = Math.max(this.cellSize, 5); // Minimum 5px

        this.canvas.width = this.width * this.cellSize;
        this.canvas.height = this.height * this.cellSize;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const val = this.grid[y][x];
                this.ctx.fillStyle = this.getColor(val);
                this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
            }
        }
    }

    getColor(val) {
        if (val === 0) return '#000000'; // Wall
        if (val === 1) return '#FFFFFF'; // Path

        // Gradient 2-7
        // 2: Blue-ish
        // 7: Red
        const colors = {
            2: '#81C784', // Light Green
            3: '#4CAF50', // Green
            4: '#FFEB3B', // Yellow
            5: '#FFC107', // Amber
            6: '#FF5722', // Deep Orange
            7: '#D50000'  // Red
        };
        return colors[val] || '#FFFFFF';
    }

    exportMatrix() {
        return this.grid.map(row => row.join(' ')).join('\n');
    }
}

// App Logic
const maze = new MazeGenerator('maze-canvas', 'status');

document.getElementById('btn-gen-maze').addEventListener('click', () => {
    const w = parseInt(document.getElementById('width').value);
    const h = parseInt(document.getElementById('height').value);
    const braid = parseFloat(document.getElementById('braid').value);

    maze.generate(w, h, braid);
    document.getElementById('btn-add-traffic').disabled = false;
});

document.getElementById('btn-add-traffic').addEventListener('click', () => {
    const prob = parseFloat(document.getElementById('traffic-prob').value);
    maze.injectTraffic(prob);
});

document.getElementById('btn-show-matrix').addEventListener('click', () => {
    const matrixStr = maze.exportMatrix();
    const container = document.getElementById('matrix-output');
    const textarea = container.querySelector('textarea');

    textarea.value = matrixStr;
    container.style.display = 'flex';

    // Auto-scroll to visualize
    container.scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('btn-close-matrix').addEventListener('click', () => {
    document.getElementById('matrix-output').style.display = 'none';
});
