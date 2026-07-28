/* ============================================================
   Hellenika — Shared map drawing helpers

   Small, pure canvas-path utilities used by both the historical
   map (map-canvas.js) and the narrative journey maps
   (journey-map.js) — projecting a [lon,lat] path to screen space,
   walking along it, and drawing a directional arrowhead.
   ============================================================ */

/** Screen-space points for a [lon,lat] path, given a toScreen(lon,lat) projector. */
export function projectPath(path, toScreen) {
  return path.map(([lon, lat]) => toScreen(lon, lat));
}

export function pathLength(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return len;
}

/** Point + tangent angle at a fraction (0-1) along a projected polyline. */
export function pointAtFraction(pts, frac) {
  const total = pathLength(pts);
  if (total === 0) return { x: pts[0][0], y: pts[0][1], angle: 0 };
  let target = total * frac, acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const segLen = Math.hypot(bx - ax, by - ay);
    if (acc + segLen >= target) {
      const t = segLen === 0 ? 0 : (target - acc) / segLen;
      return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, angle: Math.atan2(by - ay, bx - ax) };
    }
    acc += segLen;
  }
  const [lx, ly] = pts[pts.length - 2] ?? pts[0], [ex, ey] = pts[pts.length - 1];
  return { x: ex, y: ey, angle: Math.atan2(ey - ly, ex - lx) };
}

export function drawArrowHead(ctx, x, y, angle, size, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.7, size * 0.55);
  ctx.lineTo(-size * 0.7, -size * 0.55);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.restore();
}
