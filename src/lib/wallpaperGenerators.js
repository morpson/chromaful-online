// Wallpaper generation utilities

// Validate hex color format
function isValidHex(hex) {
  return /^#[0-9A-F]{6}$/i.test(hex);
}

// Safely convert hex to RGB
function hexToRgb(hex) {
  if (!isValidHex(hex)) {
    console.warn(`Invalid hex color: ${hex}, using fallback #000000`);
    return [0, 0, 0];
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

function sampleColors(colors, t) {
  const n = colors.length;
  if (n === 1) return hexToRgb(colors[0]);
  const scaled = t * (n - 1);
  const idx = Math.min(Math.floor(scaled), n - 2);
  const local = scaled - idx;
  return lerpColor(hexToRgb(colors[idx]), hexToRgb(colors[idx + 1]), local);
}

// Optimized sampleColors working directly on pre-converted RGB array triples
function sampleRgbColors(rgbColors, t) {
  const n = rgbColors.length;
  if (n === 1) return rgbColors[0];
  const scaled = t * (n - 1);
  const idx = Math.min(Math.floor(scaled), n - 2);
  const local = scaled - idx;
  return lerpColor(rgbColors[idx], rgbColors[idx + 1], local);
}

// Cache for the noise pattern canvas to avoid rebuilding it on every frame
let noisePatternCanvas = null;

function getNoisePatternCanvas() {
  if (noisePatternCanvas) return noisePatternCanvas;
  if (typeof document === "undefined") return null;

  noisePatternCanvas = document.createElement("canvas");
  noisePatternCanvas.width = 256;
  noisePatternCanvas.height = 256;
  const ctx = noisePatternCanvas.getContext("2d");
  const imgData = ctx.createImageData(256, 256);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const val = Math.floor(Math.random() * 255);
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 255; // fully opaque in the pattern itself
  }
  ctx.putImageData(imgData, 0, 0);
  return noisePatternCanvas;
}

// Hardware-accelerated film grain overlay using GPU blending
function applyGrain(ctx, w, h, intensity) {
  const patternCanvas = getNoisePatternCanvas();
  if (!patternCanvas) return;

  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = (intensity / 100) * 0.12; // subtle grain blend
  const pattern = ctx.createPattern(patternCanvas, "repeat");
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ---- GENERATORS ----

function drawSolid(ctx, w, h, colors) {
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, w, h);
}

function drawLinear(ctx, w, h, colors, time = 0) {
  const angle = time * 0.15; // Slow rotation
  const dx = Math.cos(angle) * w * 0.5;
  const dy = Math.sin(angle) * h * 0.5;
  const cx = w / 2;
  const cy = h / 2;
  const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawRadial(ctx, w, h, colors, time = 0) {
  const cx = w / 2 + Math.cos(time * 0.2) * w * 0.12;
  const cy = h / 2 + Math.sin(time * 0.25) * h * 0.12;
  const r = Math.max(w, h) * (0.65 + Math.sin(time * 0.15) * 0.05); // Pulsate radius
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, cx, cy, r);
  colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawConic(ctx, w, h, rgbColors, time = 0) {
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;
  const cx = w / 2, cy = h / 2;
  const angleOffset = time * 0.15; // Slow rotation
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const angle = Math.atan2(y - cy, x - cx) + angleOffset;
      const t = ((angle / (2 * Math.PI)) % 1 + 1) % 1;
      const [r, g, b] = sampleRgbColors(rgbColors, t);
      const idx = (y * w + x) * 4;
      data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function drawBilinear(ctx, w, h, rgbColors, time = 0) {
  // Expects 4 colors: top-left, top-right, bottom-left, bottom-right
  const tl = rgbColors[0] || [0, 0, 0];
  const tr = rgbColors[1] || tl;
  const bl = rgbColors[2] || tl;
  const br = rgbColors[3] || tl;
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;

  // Perturb color mappings slowly
  const shiftX = Math.sin(time * 0.2) * 0.08;
  const shiftY = Math.cos(time * 0.15) * 0.08;

  for (let y = 0; y < h; y++) {
    const fy = Math.max(0, Math.min(1, y / (h - 1) + shiftY));
    for (let x = 0; x < w; x++) {
      const fx = Math.max(0, Math.min(1, x / (w - 1) + shiftX));
      const top = lerpColor(tl, tr, fx);
      const bot = lerpColor(bl, br, fx);
      const [r, g, b] = lerpColor(top, bot, fy);
      const idx = (y * w + x) * 4;
      data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function drawPlasma(ctx, w, h, rgbColors, complexity = 100, time = 0) {
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;
  const scale = 3 + (complexity / 100) * 5;
  const tOffset = time * 0.3;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (x / w) * scale;
      const ny = (y / h) * scale;
      const v =
        Math.sin(nx + tOffset) +
        Math.sin(ny - tOffset * 1.2) +
        Math.sin(nx + ny + tOffset * 0.8) +
        Math.sin(Math.sqrt(nx * nx + ny * ny + 1) + tOffset * 0.5);
      const t = (v + 4) / 8;
      const [r, g, b] = sampleRgbColors(rgbColors, t % 1);
      const idx = (y * w + x) * 4;
      data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function drawNoise(ctx, w, h, rgbColors, time = 0) {
  const sFactor = Math.max(0.1, w / 1000);
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;
  const scale = 0.005 / sFactor;
  const dx = Math.sin(time * 0.08) * 15 * sFactor;
  const dy = time * 4.0 * sFactor; // Slow continuous drifting downwards
  function pseudoNoise(x, y) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }
  function smoothNoise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const a = pseudoNoise(ix, iy);
    const b = pseudoNoise(ix + 1, iy);
    const c = pseudoNoise(ix, iy + 1);
    const d = pseudoNoise(ix + 1, iy + 1);
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
  }
  for (let y = 0; y < h; y++) {
    const py = y + dy;
    for (let x = 0; x < w; x++) {
      const px = x + dx;
      let sum = 0, amp = 1, freq = 1, max = 0;
      for (let o = 0; o < 5; o++) { // reduced octave count from 6 to 5 for speed boost while animating
        sum += smoothNoise(px * scale * freq, py * scale * freq) * amp;
        max += amp;
        amp *= 0.5;
        freq *= 2.1;
      }
      const t = sum / max;
      const [r, g, b] = sampleRgbColors(rgbColors, t);
      const idx = (y * w + x) * 4;
      data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  ctx.filter = `blur(${Math.max(0.5, 2 * sFactor)}px)`;
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = "none";
}

function drawVoronoi(ctx, w, h, rgbColors, time = 0) {
  const n = 12 + rgbColors.length * 2;
  // To make points consistent, we seed them but add a time-based drift
  const points = Array.from({ length: n }, (_, i) => {
    // Seeded pseudo-random coordinates
    const seedX = Math.abs(Math.sin(i * 437.58 + 0.1));
    const seedY = Math.abs(Math.cos(i * 713.91 + 0.2));

    // Drift trajectory
    const r = 0.05 + 0.05 * Math.sin(i * 12.3);
    const speed = 0.15 + 0.2 * Math.cos(i * 45.6);
    const driftX = Math.cos(time * speed + i) * r;
    const driftY = Math.sin(time * speed + i * 1.5) * r;

    return {
      x: Math.max(0, Math.min(1, seedX + driftX)) * w,
      y: Math.max(0, Math.min(1, seedY + driftY)) * h,
      rgb: rgbColors[i % rgbColors.length],
    };
  });
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let minDist = Infinity, nearest = null;
      for (const p of points) {
        const d = (x - p.x) ** 2 + (y - p.y) ** 2;
        if (d < minDist) { minDist = d; nearest = p; }
      }
      const [r, g, b] = nearest.rgb;
      const idx = (y * w + x) * 4;
      data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function drawStripes(ctx, w, h, colors, time = 0) {
  const sFactor = Math.max(0.1, w / 1000);
  const stripeCount = 8;
  const yOffset = Math.sin(time * 0.4) * (h / stripeCount);
  for (let i = -1; i <= stripeCount; i++) {
    const color = colors[((i % colors.length) + colors.length) % colors.length];
    ctx.fillStyle = color;
    ctx.fillRect(0, (i / stripeCount) * h + yOffset, w, h / stripeCount + 2);
  }
  ctx.filter = `blur(${Math.max(0.5, 3 * sFactor)}px)`;
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = "none";
}

function drawIsolines(ctx, w, h, colors, complexity = 100, time = 0) {
  const sFactor = Math.max(0.1, w / 1000);
  const scale = (0.003 + (complexity / 100) * 0.005) / sFactor;
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;
  const bgColor = hexToRgb(colors[0]);
  // Fill background
  for (let i = 0; i < data.length; i += 4) {
    data[i] = bgColor[0]; data[i + 1] = bgColor[1]; data[i + 2] = bgColor[2]; data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  // Draw contour lines
  const bands = 15;
  const step = Math.max(1, Math.round(5 * sFactor));
  for (let b = 0; b < bands; b++) {
    const threshold = b / bands;
    ctx.beginPath();
    ctx.strokeStyle = colors[1 + (b % (colors.length - 1))] || colors[colors.length - 1];
    ctx.lineWidth = 1.5 * sFactor;
    ctx.globalAlpha = 0.6;
    for (let x = 0; x < w; x += step) {
      for (let y = 0; y < h; y += step) {
        const nx = x * scale, ny = y * scale;
        const v = (Math.sin(nx * 3 + time * 0.4) + Math.sin(ny * 2 + nx + time * 0.2) + Math.sin(Math.sqrt(nx * nx + ny * ny) - time * 0.15)) / 3;
        const t = (v + 1) / 2;
        if (Math.abs(t - threshold) < 0.03) {
          ctx.lineTo(x, y);
        } else {
          ctx.moveTo(x, y);
        }
      }
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawFlowField(ctx, w, h, colors, complexity = 100, time = 0) {
  const sFactor = Math.max(0.1, w / 1000);
  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(1, colors[colors.length - 1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const scale = (0.002 + (complexity / 100) * 0.003) / sFactor;
  const numLines = 150;
  const stepLen = 5 * sFactor;
  const steps = 60;

  ctx.lineWidth = 0.8 * sFactor;
  ctx.globalAlpha = 0.5;

  for (let i = 0; i < numLines; i++) {
    // Seed coordinates so lines persist but shift
    const seedX = Math.abs(Math.sin(i * 123.45 + 0.1));
    const seedY = Math.abs(Math.cos(i * 678.9 + 0.2));

    let x = seedX * w;
    let y = seedY * h;
    const colorIdx = i % colors.length;
    ctx.strokeStyle = colors[colorIdx];
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < steps; s++) {
      const angle = Math.sin(x * scale + time * 0.08) * Math.cos(y * scale - time * 0.06) * Math.PI * 2;
      x += Math.cos(angle) * stepLen;
      y += Math.sin(angle) * stepLen;
      if (x < 0 || x > w || y < 0 || y > h) break;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawTwisted(ctx, w, h, rgbColors, twist = 100, time = 0) {
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;
  const cx = w / 2, cy = h / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);
  const currentTwist = twist + Math.sin(time * 0.15) * 12; // slow pulsating twist
  const twistAmount = (currentTwist / 100) * Math.PI * 4;
  const angleOffset = time * 0.08; // slow continuous rotate

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy) / maxR;
      const angle = Math.atan2(dy, dx) + r * twistAmount + angleOffset;
      const t = ((angle / (Math.PI * 2)) % 1 + 1) % 1;
      const mix = 0.5 + 0.5 * Math.sin(r * Math.PI * 6 + time * 0.25);
      const [r1, g1, b1] = sampleRgbColors(rgbColors, t);
      const [r2, g2, b2] = sampleRgbColors(rgbColors, (t + 0.5) % 1);
      const idx = (y * w + x) * 4;
      data[idx] = lerp(r1, r2, mix);
      data[idx + 1] = lerp(g1, g2, mix);
      data[idx + 2] = lerp(b1, b2, mix);
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

// ---- MAIN EXPORT ----

export function generateWallpaper(ctx, w, h, type, colors, options = {}) {
  try {
    // Validate inputs
    if (!ctx || typeof ctx.fillRect !== 'function') {
      throw new Error('Invalid canvas context');
    }
    if (w <= 0 || h <= 0 || !Number.isFinite(w) || !Number.isFinite(h)) {
      throw new Error('Invalid canvas dimensions');
    }
    if (!Array.isArray(colors) || colors.length === 0) {
      throw new Error('No colors provided');
    }

    const { addGrain = false, grainIntensity = 30, twist = 100, time = 0, darkify = false } = options;

    // Clamp slider values
    const clampedTwist = Math.max(0, Math.min(200, twist));
    const clampedGrainIntensity = Math.max(0, Math.min(100, grainIntensity));

    const safeColors = colors.filter(isValidHex).length > 0 
      ? colors.filter(isValidHex) 
      : ['#000000'];

    // Pre-convert colors to RGB once per frame to optimize pixel loops
    const rgbColors = safeColors.map(hexToRgb);

    switch (type) {
      case 'solid':     drawSolid(ctx, w, h, safeColors); break;
      case 'linear':    drawLinear(ctx, w, h, safeColors, time); break;
      case 'radial':    drawRadial(ctx, w, h, safeColors, time); break;
      case 'conic':     drawConic(ctx, w, h, rgbColors, time); break;
      case 'bilinear':  drawBilinear(ctx, w, h, rgbColors, time); break;
      case 'plasma':    drawPlasma(ctx, w, h, rgbColors, clampedTwist, time); break;
      case 'noise':     drawNoise(ctx, w, h, rgbColors, time); break;
      case 'voronoi':   drawVoronoi(ctx, w, h, rgbColors, time); break;
      case 'stripes':   drawStripes(ctx, w, h, safeColors, time); break;
      case 'isolines':  drawIsolines(ctx, w, h, safeColors, clampedTwist, time); break;
      case 'flowfield': drawFlowField(ctx, w, h, safeColors, clampedTwist, time); break;
      case 'twisted':   drawTwisted(ctx, w, h, rgbColors, clampedTwist, time); break;
      default:          drawLinear(ctx, w, h, safeColors, time);
    }

    if (darkify) {
      applyDarkify(ctx, w, h);
    }

    if (addGrain && clampedGrainIntensity > 0) {
      applyGrain(ctx, w, h, clampedGrainIntensity);
    }
  } catch (error) {
    console.error('Wallpaper generation error:', error);
    // Fallback: draw solid color
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);
  }
}

// Smart dark overlay utilizing radial gradient and multiply blending
function applyDarkify(ctx, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.sqrt(w*w + h*h)/2);
  grad.addColorStop(0, "rgba(20, 20, 35, 0.45)");
  grad.addColorStop(0.5, "rgba(10, 10, 22, 0.75)");
  grad.addColorStop(1, "rgba(5, 5, 12, 0.96)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(8, 8, 12, 0.28)";
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}