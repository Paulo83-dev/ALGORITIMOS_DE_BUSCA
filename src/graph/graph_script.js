/**
 * Graph Generator and Visualizer
 */

class Node {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 10;
        this.color = '#2196F3';
    }

    applyForce(fx, fy) {
        this.vx += fx;
        this.vy += fy;
    }

    update(dragNode) {
        // Simple friction
        this.vx *= 0.90;
        this.vy *= 0.90;

        // If dragging, don't update position
        if (this !== dragNode) {
            this.x += this.vx;
            this.y += this.vy;
        }
    }
}

class Edge {
    constructor(source, target, weight = 1, directed = false) {
        this.source = source;
        this.target = target;
        this.weight = weight;
        this.directed = directed;
    }
}

class GraphVisualizer {
    constructor(canvasId, statusId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.statusEl = document.getElementById(statusId);

        this.nodes = [];
        this.edges = [];
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.animating = false;
        this.physicsEnabled = true;
        this.dragNode = null;

        // Mouse interactions
        this.setupInteractions();
    }

    setupInteractions() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', () => this.handleMouseUp());
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        // Find clicked node
        for (let node of this.nodes) {
            const dx = pos.x - node.x;
            const dy = pos.y - node.y;
            if (dx * dx + dy * dy < node.radius * node.radius) {
                this.dragNode = node;
                break;
            }
        }
    }

    handleMouseMove(e) {
        if (this.dragNode) {
            const pos = this.getMousePos(e);
            this.dragNode.x = pos.x;
            this.dragNode.y = pos.y;
            this.dragNode.vx = 0;
            this.dragNode.vy = 0;
            if (!this.animating && !this.physicsEnabled) this.draw(); // Redraw if paused
        }
    }

    handleMouseUp() {
        this.dragNode = null;
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = window.innerHeight * 0.6;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    generate(params) {
        this.resizeCanvas();
        this.nodes = [];
        this.edges = [];

        const N = params.nodes;

        // Random placement initially
        for (let i = 0; i < N; i++) {
            this.nodes.push(new Node(i, Math.random() * this.width, Math.random() * this.height));
        }

        // Generate Edges based on Algo
        if (params.algo === 'random') {
            const p = params.density / 100;
            for (let i = 0; i < N; i++) {
                for (let j = i + 1; j < N; j++) { // Undirected logic base
                    if (Math.random() < p) {
                        this.createEdge(i, j, params);
                    }
                    if (params.directed && Math.random() < p) {
                        this.createEdge(j, i, params);
                    }
                }
            }
        } else if (params.algo === 'geometric') {
            const threshold = (params.density / 100) * (Math.min(this.width, this.height) / 2);
            for (let i = 0; i < N; i++) {
                for (let j = 0; j < N; j++) {
                    if (i === j) continue;
                    const dx = this.nodes[i].x - this.nodes[j].x;
                    const dy = this.nodes[i].y - this.nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < threshold) {
                        // Avoid duplicates in undirected
                        if (!params.directed && i > j) continue;
                        this.createEdge(i, j, params);
                    }
                }
            }
        } else if (params.algo === 'star') {
            // Center node 0
            this.nodes[0].x = this.width / 2;
            this.nodes[0].y = this.height / 2;
            this.nodes[0].color = '#FF5722';

            for (let i = 1; i < N; i++) {
                this.createEdge(0, i, params);
                // Maybe add some random connections between leaves
                if (Math.random() < (params.density / 100) * 0.2) {
                    const target = 1 + Math.floor(Math.random() * (N - 1));
                    if (target !== i) this.createEdge(i, target, params);
                }
            }
        } else if (params.algo === 'circular') {
            // Arrange positions
            const cx = this.width / 2;
            const cy = this.height / 2;
            const r = Math.min(this.width, this.height) / 3;
            for (let i = 0; i < N; i++) {
                const angle = (i / N) * Math.PI * 2;
                this.nodes[i].x = cx + Math.cos(angle) * r;
                this.nodes[i].y = cy + Math.sin(angle) * r;

                // Connect to next
                this.createEdge(i, (i + 1) % N, params);

                // Random chords
                if (Math.random() < params.density / 100) {
                    const target = Math.floor(Math.random() * N);
                    if (target !== i && target !== (i + 1) % N) this.createEdge(i, target, params);
                }
            }
        }

        this.statusEl.textContent = `Gerado: ${this.nodes.length} nós, ${this.edges.length} arestas.`;
        if (!this.animating) this.animate();
    }

    createEdge(srcIdx, tgtIdx, params) {
        const weight = params.weighted ? Math.floor(Math.random() * 9) + 1 : 1;
        this.edges.push(new Edge(this.nodes[srcIdx], this.nodes[tgtIdx], weight, params.directed));
    }

    updatePhysics() {
        if (!this.physicsEnabled) return;

        // "Soft Repulsion" - Only repel if too close.
        // This prevents the "explosion" to the corners.
        const interactionRadius = 350; // Only interact if closer than this
        const maxForce = 2.0; // Max repulsion force

        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = 0; j < this.nodes.length; j++) {
                if (i === j) continue;
                const n1 = this.nodes[i];
                const n2 = this.nodes[j];
                const dx = n1.x - n2.x;
                const dy = n1.y - n2.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist === 0) { dist = 0.1; }

                if (dist < interactionRadius) {
                    // Linear repulsion: Strongest at 0, 0 at interactionRadius
                    const force = maxForce * (1 - (dist / interactionRadius));
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;
                    n1.applyForce(fx, fy);
                }
            }
        }

        // Weak Center Gravity to keep them generally centered
        // Much weaker now since repulsion isn't infinite
        const cx = this.width / 2;
        const cy = this.height / 2;
        for (let n of this.nodes) {
            const dx = cx - n.x;
            const dy = cy - n.y;

            // Very subtle pull to center
            n.applyForce(dx * 0.001, dy * 0.001);

            n.update(this.dragNode);

            // Hard Bounds: Keep inside canvas
            n.x = Math.max(n.radius, Math.min(this.width - n.radius, n.x));
            n.y = Math.max(n.radius, Math.min(this.height - n.radius, n.y));
        }
    }

    draw() {
        this.ctx.fillStyle = '#1a1a1a'; // Bg logic from CSS but canvas needs clear
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw Edges
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 1;
        for (let edge of this.edges) {
            this.ctx.beginPath();
            this.ctx.moveTo(edge.source.x, edge.source.y);
            this.ctx.lineTo(edge.target.x, edge.target.y);
            this.ctx.stroke();

            // Weight label
            if (edge.weight > 1) {
                const mx = (edge.source.x + edge.target.x) / 2;
                const my = (edge.source.y + edge.target.y) / 2;
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '10px Arial';
                this.ctx.fillText(edge.weight, mx, my);
            }

            // Arrow if directed
            if (edge.directed) {
                this.drawArrow(edge.source.x, edge.source.y, edge.target.x, edge.target.y);
            }
        }

        // Draw Nodes
        for (let node of this.nodes) {
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = node.color;
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.stroke();

            // ID
            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.font = '10px Arial';
            this.ctx.fillText(node.id, node.x, node.y);
        }
    }

    drawArrow(x1, y1, x2, y2) {
        const headlen = 10;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const angle = Math.atan2(dy, dx);

        // Offset by radius
        const endX = x2 - 10 * Math.cos(angle);
        const endY = y2 - 10 * Math.sin(angle);

        this.ctx.beginPath();
        this.ctx.moveTo(endX, endY);
        this.ctx.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
        this.ctx.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
        this.ctx.fill();
    }

    animate() {
        this.animating = true;
        this.updatePhysics();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }

    exportMatrix() {
        const N = this.nodes.length;
        // Init matrix
        let mat = Array(N).fill(null).map(() => Array(N).fill(0));

        for (let edge of this.edges) {
            const s = edge.source.id;
            const t = edge.target.id;
            mat[s][t] = edge.weight;
            if (!edge.directed) {
                mat[t][s] = edge.weight;
            }
        }

        return mat.map(row => row.join(' ')).join('\n');
    }
}

// App Logic
const visualizer = new GraphVisualizer('graph-canvas', 'status');

document.getElementById('btn-gen-graph').addEventListener('click', () => {
    const params = {
        algo: document.getElementById('algo').value,
        nodes: parseInt(document.getElementById('nodes').value),
        density: parseInt(document.getElementById('density').value),
        directed: document.getElementById('directed').checked,
        weighted: document.getElementById('weighted').checked
    };
    visualizer.generate(params);
});

document.getElementById('density').addEventListener('input', (e) => {
    document.getElementById('density-val').textContent = e.target.value + '%';
});

document.getElementById('physics').addEventListener('change', (e) => {
    visualizer.physicsEnabled = e.target.checked;
});

document.getElementById('btn-show-matrix').addEventListener('click', () => {
    const matStr = visualizer.exportMatrix();
    const container = document.getElementById('matrix-output');
    container.querySelector('textarea').value = matStr;
    container.style.display = 'flex';
    container.scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('btn-close-matrix').addEventListener('click', () => {
    document.getElementById('matrix-output').style.display = 'none';
});

// Initial generation
document.getElementById('btn-gen-graph').click();
