import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';

const NODE_RADIUS = 26;
const REPULSION = 12000;
const ATTRACTION = 0.002;
const SPRING_REST = 80;
const DAMPING = 0.91;
const ENERGY_THRESHOLD = 0.01;

export default function GraphView({ onNavigateToNote }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [simulating, setSimulating] = useState(true);

  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const loadedRef = useRef(false);

  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const [viewTransform, setViewTransform] = useState('translate(0,0) scale(1)');

  const nodesRef = useRef([]);
  const nodeMapRef = useRef(new Map());
  const adjRef = useRef(new Map());
  const rafRef = useRef(null);
  const animStartRef = useRef(0);
  const opacityRef = useRef(0);

  const dragNodeRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panStartPosRef = useRef({ x: 0, y: 0 });
  const startSimRef = useRef(null);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    (window.api?.notes?.getGraph?.() || Promise.resolve({ nodes: [], edges: [] }))
      .then(res => { setData(res); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!data || !dims.w || !dims.h) return;
    const cx = dims.w / 2;
    const cy = dims.h / 2;
    nodesRef.current = data.nodes.map(n => ({
      id: n.id,
      x: cx + (Math.random() - 0.5) * 30,
      y: cy + (Math.random() - 0.5) * 30,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
    }));
    nodeMapRef.current = new Map(nodesRef.current.map(n => [n.id, n]));
    adjRef.current = new Map();
    for (const e of data.edges) {
      if (!adjRef.current.has(e.source_id)) adjRef.current.set(e.source_id, new Set());
      adjRef.current.get(e.source_id).add(e.target_id);
      if (!adjRef.current.has(e.target_id)) adjRef.current.set(e.target_id, new Set());
      adjRef.current.get(e.target_id).add(e.source_id);
    }
    panRef.current = { x: dims.w / 2, y: dims.h / 2 };
    zoomRef.current = 1;
    setViewTransform(`translate(${dims.w / 2}, ${dims.h / 2}) scale(1)`);
    animStartRef.current = 0;
    opacityRef.current = 0;
    setSimulating(true);
    startSimulation();
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  }, [data, dims.w, dims.h]);

  useLayoutEffect(() => { syncDom(); });

  function qs(sel) { return svgRef.current?.querySelector(sel); }

  function syncDom() {
    const svg = svgRef.current;
    if (!svg) return;
    for (const n of nodesRef.current) {
      const g = qs(`[data-nid="${n.id}"]`);
      if (!g) continue;
      const c = g.querySelector('.nc');
      if (c) { c.setAttribute('cx', n.x); c.setAttribute('cy', n.y); }
      const tb = g.querySelector('.ntt');
      if (tb) { tb.setAttribute('x', n.x); tb.setAttribute('y', n.y - NODE_RADIUS - 12); }
    }
    if (data) {
      for (let i = 0; i < data.edges.length; i++) {
        const l = qs(`[data-eid="${i}"]`);
        if (!l) continue;
        const e = data.edges[i];
        const s = nodeMapRef.current.get(e.source_id);
        const t = nodeMapRef.current.get(e.target_id);
        if (s && t) { l.setAttribute('x1', s.x); l.setAttribute('y1', s.y); l.setAttribute('x2', t.x); l.setAttribute('y2', t.y); }
      }
    }
  }

  function startSimulation() {
    setSimulating(true);
    const step = (ts) => {
      if (!animStartRef.current) animStartRef.current = ts;
      const elapsed = ts - animStartRef.current;
      opacityRef.current = Math.min(1, elapsed / 700);
      const nodes = nodesRef.current;
      const nMap = nodeMapRef.current;
      if (!nodes.length) { rafRef.current = requestAnimationFrame(step); return; }
      for (let i = 0; i < nodes.length; i++) {
        let fx = 0, fy = 0;
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const dx = nodes[i].x - nodes[j].x || 0.1;
          const dy = nodes[i].y - nodes[j].y || 0.1;
          const dsq = dx * dx + dy * dy;
          const d = Math.sqrt(dsq) || 1;
          fx += (dx / d) * REPULSION / Math.max(dsq, 100);
          fy += (dy / d) * REPULSION / Math.max(dsq, 100);
        }
        const connected = adjRef.current.get(nodes[i].id);
        if (connected) {
          for (let j = 0; j < nodes.length; j++) {
            if (i === j) continue;
            if (connected.has(nodes[j].id)) {
              const dx = nodes[j].x - nodes[i].x;
              const dy = nodes[j].y - nodes[i].y;
              const d = Math.sqrt(dx * dx + dy * dy) || 1;
              const pull = (d - SPRING_REST) * ATTRACTION;
              fx += (dx / d) * pull;
              fy += (dy / d) * pull;
            }
          }
        }
        if (dragNodeRef.current !== nodes[i]) {
          nodes[i].vx = (nodes[i].vx + fx) * DAMPING;
          nodes[i].vy = (nodes[i].vy + fy) * DAMPING;
          nodes[i].x += nodes[i].vx;
          nodes[i].y += nodes[i].vy;
        }
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x || 0.1;
          const dy = nodes[j].y - nodes[i].y || 0.1;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const minD = NODE_RADIUS * 2 + 4;
          if (d < minD) {
            const ov = minD - d;
            const nx = dx / d;
            const ny = dy / d;
            if (dragNodeRef.current !== nodes[i] && dragNodeRef.current !== nodes[j]) {
              nodes[i].x -= nx * ov * 0.5;
              nodes[i].y -= ny * ov * 0.5;
              nodes[j].x += nx * ov * 0.5;
              nodes[j].y += ny * ov * 0.5;
              const rvn = (nodes[j].vx - nodes[i].vx) * nx + (nodes[j].vy - nodes[i].vy) * ny;
              if (rvn < 0) {
                const imp = -(1 + 0.4) * rvn * 0.5;
                nodes[i].vx -= imp * nx;
                nodes[i].vy -= imp * ny;
                nodes[j].vx += imp * nx;
                nodes[j].vy += imp * ny;
              }
            } else if (dragNodeRef.current === nodes[i]) {
              nodes[j].x += nx * ov;
              nodes[j].y += ny * ov;
            } else {
              nodes[i].x -= nx * ov;
              nodes[i].y -= ny * ov;
            }
          }
        }
      }
      const svg = svgRef.current;
      if (svg) {
        for (const n of nodes) {
          const g = qs(`[data-nid="${n.id}"]`);
          if (!g) continue;
          g.setAttribute('opacity', opacityRef.current);
          const c = g.querySelector('.nc');
          if (c) { c.setAttribute('cx', n.x); c.setAttribute('cy', n.y); }
          const tb = g.querySelector('.ntt');
          if (tb) { tb.setAttribute('x', n.x); tb.setAttribute('y', n.y - NODE_RADIUS - 12); }
        }
        if (data) {
          for (let i = 0; i < data.edges.length; i++) {
            const l = qs(`[data-eid="${i}"]`);
            if (!l) continue;
            const e = data.edges[i];
            const s = nMap.get(e.source_id);
            const t = nMap.get(e.target_id);
            if (s && t) {
              l.setAttribute('x1', s.x); l.setAttribute('y1', s.y);
              l.setAttribute('x2', t.x); l.setAttribute('y2', t.y);
            }
          }
        }
      }
      let energy = 0;
      for (const n of nodes) energy += n.vx * n.vx + n.vy * n.vy;
      energy /= nodes.length;
      if (energy > ENERGY_THRESHOLD || elapsed < 3000) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setSimulating(false);
        rafRef.current = null;
      }
    };
    startSimRef.current = step;
    rafRef.current = requestAnimationFrame(step);
  }

  const updateTransform = useCallback(() => {
    setViewTransform(`translate(${panRef.current.x}, ${panRef.current.y}) scale(${zoomRef.current})`);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const nz = Math.max(0.2, Math.min(5, zoomRef.current * delta));
    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const wx = (mx - panRef.current.x) / zoomRef.current;
    const wy = (my - panRef.current.y) / zoomRef.current;
    panRef.current.x = mx - wx * nz;
    panRef.current.y = my - wy * nz;
    zoomRef.current = nz;
    updateTransform();
  }, [updateTransform]);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0 || dragNodeRef.current) return;
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY };
    panStartPosRef.current = { ...panRef.current };
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (dragNodeRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const svg = { x: (sx - panRef.current.x) / zoomRef.current, y: (sy - panRef.current.y) / zoomRef.current };
      const node = dragNodeRef.current;
      node.x = svg.x - dragOffsetRef.current.x;
      node.y = svg.y - dragOffsetRef.current.y;
      node.vx = 0;
      node.vy = 0;
      return;
    }
    if (isPanningRef.current) {
      panRef.current.x = panStartPosRef.current.x + (e.clientX - panStartRef.current.x);
      panRef.current.y = panStartPosRef.current.y + (e.clientY - panStartRef.current.y);
      updateTransform();
    }
  }, [updateTransform]);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
    if (dragNodeRef.current) {
      const wasDragging = dragNodeRef.current;
      dragNodeRef.current = null;
      if (!rafRef.current && wasDragging && startSimRef.current) {
        animStartRef.current = performance.now() - 2000;
        setSimulating(true);
        startSimRef.current();
      }
    }
  }, []);

  const handleNodeMouseDown = useCallback((e, node) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const svg = { x: (sx - panRef.current.x) / zoomRef.current, y: (sy - panRef.current.y) / zoomRef.current };
    dragNodeRef.current = node;
    dragOffsetRef.current = { x: svg.x - node.x, y: svg.y - node.y };
  }, []);

  const handleNodeClick = useCallback((nodeId) => {
    if (dragNodeRef.current) return;
    setSelected(prev => prev === nodeId ? null : nodeId);
  }, []);

  const handleNodeDoubleClick = useCallback((nodeId) => {
    if (onNavigateToNote) onNavigateToNote(nodeId);
  }, [onNavigateToNote]);

  const fitToScreen = useCallback(() => {
    const nodes = nodesRef.current;
    if (!nodes.length) return;
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y));
    const gw = maxX - minX + NODE_RADIUS * 6;
    const gh = maxY - minY + NODE_RADIUS * 6;
    const scale = Math.min(dims.w / gw, dims.h / gh, 2.5);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    panRef.current = { x: dims.w / 2 - cx * scale, y: dims.h / 2 - cy * scale };
    zoomRef.current = scale;
    updateTransform();
  }, [dims, updateTransform]);

  if (loading) {
    return (
      <div className="graph-loading">
        <div className="spinner" />
        <span>Загрузка графа...</span>
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="graph-empty">
        <div className="graph-empty-icon">◉</div>
        <div className="graph-empty-text">Нет связей для отображения</div>
        <div className="graph-empty-hint">Создайте заметки и используйте [[wiki-ссылки]]</div>
      </div>
    );
  }

  const connectedSet = selected
    ? new Set(data.edges.filter(e => e.source_id === selected || e.target_id === selected).flatMap(e => [e.source_id, e.target_id]))
    : null;

  return (
    <div className="graph-container" ref={containerRef}>
      <div className="graph-header">
        <span className="graph-title">Граф связей</span>
        <span className="graph-count">
          {data.nodes.length} узлов, {data.edges.length} связей
          {simulating && <span className="graph-sim-badge">симуляция...</span>}
        </span>
        <button className="graph-fit-btn" onClick={fitToScreen}>⊡ По размеру</button>
      </div>
      <svg
        ref={svgRef}
        className="graph-svg"
        width={dims.w}
        height={dims.h}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanningRef.current ? 'grabbing' : 'grab' }}
      >
        <defs>
          <marker id="gh-arrow" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
            <polygon points="0 0, 7 2.5, 0 5" fill="var(--border)" />
          </marker>
          <filter id="node-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.18)" />
          </filter>
        </defs>
        <g transform={viewTransform}>
          {data.edges.map((e, i) => {
            const src = nodeMapRef.current.get(e.source_id);
            const tgt = nodeMapRef.current.get(e.target_id);
            const hl = !selected || (e.source_id === selected || e.target_id === selected);
            return (
              <line
                key={i} data-eid={i}
                x1={src?.x ?? 0} y1={src?.y ?? 0}
                x2={tgt?.x ?? 0} y2={tgt?.y ?? 0}
                stroke={hl ? 'var(--accent-primary)' : 'var(--border)'}
                strokeWidth={hl ? 1.5 / zoomRef.current : 0.5 / zoomRef.current}
                opacity={hl ? 0.5 : 0.12}
                markerEnd="url(#gh-arrow)"
              />
            );
          })}
          {data.nodes.map(n => {
            const pos = nodeMapRef.current.get(n.id);
            const isSel = selected === n.id;
            const isConn = !selected || n.id === selected || (connectedSet?.has(n.id));
            return (
              <g
                key={n.id} data-nid={n.id}
                className={`graph-node ${isSel ? 'gs' : ''}`}
                opacity={opacityRef.current}
                style={{ cursor: 'pointer' }}
                onClick={() => handleNodeClick(n.id)}
                onDoubleClick={() => handleNodeDoubleClick(n.id)}
                onMouseDown={(e) => handleNodeMouseDown(e, pos)}
              >
                <circle
                  className="nc"
                  cx={pos?.x ?? dims.w / 2} cy={pos?.y ?? dims.h / 2}
                  r={NODE_RADIUS}
                  fill={isSel ? 'var(--accent-primary)' : 'var(--bg-card)'}
                  stroke={isSel ? 'var(--accent-primary)' : 'rgba(0,0,0,0.2)'}
                  strokeWidth={isSel ? 2.5 : 2}
                  filter={isSel ? 'none' : 'url(#node-shadow)'}
                  opacity={isConn ? 1 : 0.2}
                />
                <text
                  className="ntt"
                  x={pos?.x ?? dims.w / 2} y={(pos?.y ?? dims.h / 2) - NODE_RADIUS - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fill="white"
                  fontWeight="600"
                  stroke="#1f2937"
                  strokeWidth="3"
                  paintOrder="stroke"
                  opacity={0}
                  style={{ pointerEvents: 'none', fontFamily: 'Outfit, sans-serif' }}
                >
                  {n.title}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="graph-controls">
        <button className="graph-ctrl-btn" onClick={() => { zoomRef.current = Math.min(5, zoomRef.current * 1.3); updateTransform(); }} title="Приблизить">+</button>
        <button className="graph-ctrl-btn" onClick={() => { zoomRef.current = Math.max(0.2, zoomRef.current / 1.3); updateTransform(); }} title="Отдалить">−</button>
        <button className="graph-ctrl-btn" onClick={fitToScreen} title="По размеру">⊡</button>
      </div>
      {selected && (
        <div className="graph-tooltip">
          <span>Выбрано: {nodeMapRef.current.get(selected)?.title ?? selected}</span>
          <button className="graph-tooltip-close" onClick={() => setSelected(null)}>✕</button>
        </div>
      )}
    </div>
  );
}
