/* ============================================================
   Hellenika — Relationship graph

   A small force-directed layout on canvas. Three forces:
     · repulsion between all nodes (Coulomb-ish, capped)
     · spring attraction along links
     · weak pull toward the centre so the graph stays framed
   The root node is pinned at the centre, which keeps the layout
   stable and readable rather than drifting.
   ============================================================ */

import { clamp, fitCanvas, hashRand } from '../util.js';

const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';

export function createGraph(canvas, { nodes, links, rootId, onNodeClick, onHover }) {
  const ctx = canvas.getContext('2d', { alpha: false });
  let W = 0, H = 0, raf = null, ticks = 0;
  let hot = null, dragNode = null;
  let panX = 0, panY = 0;

  // Layout state — start on a jittered ring so the first tick is stable.
  const P = new Map();
  nodes.forEach((n, i) => {
    const a = (i / Math.max(1, nodes.length)) * Math.PI * 2;
    const r = n.id === rootId ? 0 : 120 + hashRand(n.id) * 60;
    P.set(n.id, {
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      vx: 0, vy: 0,
      pinned: n.id === rootId,
      node: n,
    });
  });

  const adjacency = new Map();
  for (const l of links) {
    if (!adjacency.has(l.source)) adjacency.set(l.source, new Set());
    if (!adjacency.has(l.target)) adjacency.set(l.target, new Set());
    adjacency.get(l.source).add(l.target);
    adjacency.get(l.target).add(l.source);
  }

  const radiusOf = (n) => (n.id === rootId ? 26 : n.depth === 1 ? 15 : 10);

  /* ---------- Simulation ---------- */
  function step() {
    const REPEL = 5200;
    const SPRING = 0.012;
    const REST = 118;
    const CENTRE = 0.004;
    const DAMP = 0.86;

    const arr = [...P.values()];

    for (let i = 0; i < arr.length; i++) {
      const a = arr[i];
      if (a.pinned) { a.x = 0; a.y = 0; a.vx = a.vy = 0; continue; }

      let fx = -a.x * CENTRE, fy = -a.y * CENTRE;

      for (let j = 0; j < arr.length; j++) {
        if (i === j) continue;
        const b = arr[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) { dx = (hashRand(a.node.id + j) - 0.5) * 2; dy = (hashRand(b.node.id + i) - 0.5) * 2; d2 = 4; }
        const d = Math.sqrt(d2);
        const f = Math.min(REPEL / d2, 40);
        fx += (dx / d) * f;
        fy += (dy / d) * f;
      }

      a.vx = (a.vx + fx) * DAMP;
      a.vy = (a.vy + fy) * DAMP;
    }

    for (const l of links) {
      const a = P.get(l.source), b = P.get(l.target);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const f = (d - REST) * SPRING;
      const ux = (dx / d) * f, uy = (dy / d) * f;
      if (!a.pinned) { a.vx += ux; a.vy += uy; }
      if (!b.pinned) { b.vx -= ux; b.vy -= uy; }
    }

    // Keep every node (plus its label, drawn below it) inside the visible
    // canvas -- half the canvas dimension, minus margin for the node radius
    // and label text, not the full W/H (which let nodes drift off-screen
    // on graphs with enough connections to push the layout wide/tall).
    const boundX = W / 2 - 40;
    const boundY = H / 2 - 40;
    for (const p of arr) {
      if (p.pinned || p === dragNode) continue;
      p.x = clamp(p.x + p.vx, -boundX, boundX);
      p.y = clamp(p.y + p.vy, -boundY, boundY);
    }
  }

  /* ---------- Draw ---------- */
  function draw() {
    raf = null;
    ({ w: W, h: H } = fitCanvas(canvas, ctx));

    if (ticks < 320) { step(); ticks++; }

    const cx = W / 2 + panX, cy = H / 2 + panY;
    const surface = cssVar('--surface');
    const border = cssVar('--border-strong');
    const text = cssVar('--text');
    const text3 = cssVar('--text-3');

    ctx.fillStyle = surface;
    ctx.fillRect(0, 0, W, H);

    const near = hot ? adjacency.get(hot.node.id) : null;

    /* --- links --- */
    for (const l of links) {
      const a = P.get(l.source), b = P.get(l.target);
      if (!a || !b) continue;
      const active = hot && (l.source === hot.node.id || l.target === hot.node.id);
      ctx.save();
      ctx.strokeStyle = active ? cssVar('--accent') : border;
      ctx.globalAlpha = hot ? (active ? 0.9 : 0.18) : 0.5;
      ctx.lineWidth = active ? 1.8 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + a.x, cy + a.y);
      ctx.lineTo(cx + b.x, cy + b.y);
      ctx.stroke();

      // Relationship label on hovered edges only — otherwise it is noise.
      if (active && l.rel) {
        const mx = cx + (a.x + b.x) / 2, my = cy + (a.y + b.y) / 2;
        ctx.globalAlpha = 1;
        ctx.font = `600 9px ${cssVar('--font-ui') || 'system-ui'}`;
        ctx.textAlign = 'center';
        const w = ctx.measureText(l.rel).width + 8;
        ctx.fillStyle = surface;
        ctx.fillRect(mx - w / 2, my - 7, w, 14);
        ctx.fillStyle = text3;
        ctx.fillText(l.rel, mx, my + 3);
        ctx.textAlign = 'left';
      }
      ctx.restore();
    }

    /* --- nodes --- */
    for (const p of P.values()) {
      const n = p.node;
      const r = radiusOf(n);
      const x = cx + p.x, y = cy + p.y;
      const colour = cssVar(`--p-${n.entity.tint}`);
      const dim = hot && n.id !== hot.node.id && !near?.has(n.id);

      ctx.save();
      ctx.globalAlpha = dim ? 0.25 : 1;

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = colour;
      ctx.fill();
      ctx.lineWidth = n.id === rootId ? 3 : 2;
      ctx.strokeStyle = surface;
      ctx.stroke();

      if (hot?.node.id === n.id) {
        ctx.beginPath();
        ctx.arc(x, y, r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = cssVar('--accent');
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Label
      const label = n.entity.name;
      ctx.font = `${n.id === rootId ? '650 12px' : '500 11px'} ${cssVar('--font-ui') || 'system-ui'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const w = ctx.measureText(label).width;
      ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark'
        ? 'rgba(18,17,15,.8)' : 'rgba(255,255,255,.82)';
      ctx.fillRect(x - w / 2 - 3, y + r + 3, w + 6, 14);
      ctx.fillStyle = text;
      ctx.fillText(label, x, y + r + 4);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }

    if (ticks < 320) schedule();
  }

  function schedule() { if (raf == null) raf = requestAnimationFrame(draw); }

  /* ---------- Interaction ---------- */
  const at = (px, py) => {
    const cx = W / 2 + panX, cy = H / 2 + panY;
    for (const p of P.values()) {
      const r = radiusOf(p.node) + 6;
      if (Math.hypot(cx + p.x - px, cy + p.y - py) <= r) return p;
    }
    return null;
  };

  let dragging = false, moved = 0, lastX = 0, lastY = 0;

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const p = at(e.clientX - rect.left, e.clientY - rect.top);
    moved = 0; lastX = e.clientX; lastY = e.clientY;
    if (p && !p.pinned) { dragNode = p; }
    else { dragging = true; canvas.classList.add('dragging'); }
  });

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);

    if (dragNode) {
      dragNode.x += dx; dragNode.y += dy;
      dragNode.vx = dragNode.vy = 0;
      ticks = Math.min(ticks, 280);   // let the layout settle again
      schedule();
      return;
    }
    if (dragging) { panX += dx; panY += dy; schedule(); return; }

    const p = at(px, py);
    if (p?.node.id !== hot?.node.id) {
      hot = p;
      canvas.style.cursor = p ? 'pointer' : 'grab';
      onHover?.(p?.node.entity || null);
      schedule();
    }
  });

  const end = () => {
    dragNode = null;
    dragging = false;
    canvas.classList.remove('dragging');
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => {
    if (hot) { hot = null; onHover?.(null); schedule(); }
  });

  canvas.addEventListener('click', (e) => {
    if (moved > 6) return;
    const rect = canvas.getBoundingClientRect();
    const p = at(e.clientX - rect.left, e.clientY - rect.top);
    if (p && p.node.id !== rootId) onNodeClick?.(p.node.entity);
  });

  const ro = new ResizeObserver(() => { ticks = Math.min(ticks, 300); schedule(); });
  ro.observe(canvas);

  schedule();

  return {
    reheat() { ticks = 0; schedule(); },
    destroy() { ro.disconnect(); if (raf) cancelAnimationFrame(raf); },
  };
}
