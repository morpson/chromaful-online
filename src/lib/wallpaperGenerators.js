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

// ---- AUTHENTIC FILM GRAIN ENGINE ----
// Simulates organic 35mm silver-halide film emulsion grain.
// Uses Gaussian-distributed luminance centered on neutral 128 gray with
// micro-crystal clustering, eliminating digital sensor noise and LCG lattice artifacts.

const GRAIN_TILE_SIZE = 512;
const GRAIN_FRAMES_COUNT = 4;
let _grainFrames = null;
let _grainAnimIndex = 0;

// High-quality xorshift128+ PRNG for artifact-free stochastic sampling
function createRng(seed) {
  let s0 = (seed ^ 0x9e3779b9) >>> 0;
  let s1 = (Math.imul(seed, 0x85ebca6b) ^ 0xc2b2ae35) >>> 0;
  return function nextFloat() {
    let x = s0;
    const y = s1;
    s0 = y;
    x ^= x << 23;
    x ^= x >>> 17;
    x ^= y ^ (y >>> 26);
    s1 = x;
    return ((s0 + s1) >>> 0) / 4294967296;
  };
}

function initGrainFrames() {
  if (typeof document === "undefined") return null;
  if (_grainFrames) return _grainFrames;

  _grainFrames = [];
  const rng = createRng(0xdeadbeef);

  for (let f = 0; f < GRAIN_FRAMES_COUNT; f++) {
    const canvas = document.createElement("canvas");
    canvas.width = GRAIN_TILE_SIZE;
    canvas.height = GRAIN_TILE_SIZE;
    const ctx = canvas.getContext("2d");
    const imgData = ctx.createImageData(GRAIN_TILE_SIZE, GRAIN_TILE_SIZE);
    const data = imgData.data;

    // Pass 1: Fine-grain layer with Gaussian distribution (Box-Muller)
    const fine = new Float32Array(GRAIN_TILE_SIZE * GRAIN_TILE_SIZE);
    for (let i = 0; i < fine.length; i += 2) {
      const u1 = Math.max(1e-6, rng());
      const u2 = rng();
      const radius = Math.sqrt(-2.0 * Math.log(u1));
      const theta = 2.0 * Math.PI * u2;
      fine[i] = radius * Math.cos(theta);
      if (i + 1 < fine.length) {
        fine[i + 1] = radius * Math.sin(theta);
      }
    }

    // Pass 2: Coarse organic clump layer (simulates emulsion crystal clusters)
    const coarseSize = GRAIN_TILE_SIZE >> 1;
    const coarse = new Float32Array(coarseSize * coarseSize);
    for (let i = 0; i < coarse.length; i += 2) {
      const u1 = Math.max(1e-6, rng());
      const u2 = rng();
      const radius = Math.sqrt(-2.0 * Math.log(u1));
      const theta = 2.0 * Math.PI * u2;
      coarse[i] = radius * Math.cos(theta);
      if (i + 1 < coarse.length) {
        coarse[i + 1] = radius * Math.sin(theta);
      }
    }

    // Combine fine + coarse layers into 50% neutral gray overlay
    for (let y = 0; y < GRAIN_TILE_SIZE; y++) {
      const cy = y >> 1;
      for (let x = 0; x < GRAIN_TILE_SIZE; x++) {
        const cx = x >> 1;
        const fineVal = fine[y * GRAIN_TILE_SIZE + x] * 32;
        const coarseVal = coarse[cy * coarseSize + cx] * 20;
        
        // Summed deviation from 128 (neutral mid-gray)
        const val = Math.round(128 + fineVal + coarseVal);
        const clamped = Math.max(0, Math.min(255, val));

        const idx = (y * GRAIN_TILE_SIZE + x) * 4;
        data[idx] = clamped;
        data[idx + 1] = clamped;
        data[idx + 2] = clamped;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    _grainFrames.push(canvas);
  }

  return _grainFrames;
}

function applyGrain(ctx, w, h, intensity) {
  if (typeof document === "undefined" || intensity <= 0) return;

  const frames = initGrainFrames();
  if (!frames || frames.length === 0) return;

  // Cycle through precomputed analog grain frames for dynamic jitter
  const frameCanvas = frames[_grainAnimIndex % frames.length];
  _grainAnimIndex++;

  const pattern = ctx.createPattern(frameCanvas, "repeat");
  if (!pattern) return;

  // Pseudo-random subpixel jitter per frame so grain never feels static or grid-locked
  const ox = ((_grainAnimIndex * 197) % GRAIN_TILE_SIZE);
  const oy = ((_grainAnimIndex * 283) % GRAIN_TILE_SIZE);
  if (typeof DOMMatrix !== "undefined") {
    pattern.setTransform(new DOMMatrix().translateSelf(ox, oy));
  }

  // Smooth perceptual curve: subtle at lower values, rich and cinematic at high
  const normalized = intensity / 100;
  const alpha = Math.min(0.75, normalized * 0.42);

  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = alpha;
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

// ---- 3D GRADIENT RENDER ----
// Renders a large gradient sphere with Phong shading, specular highlight, and
// an atmospheric halo — looks like a proper 3D render without WebGL.
function drawGradient3D(ctx, w, h, rgbColors, time = 0) {
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;

  // Background: deep radial space gradient using first and last color, very dark
  const bgInner = rgbColors[0];
  const bgOuter = rgbColors[rgbColors.length - 1];
  const cx = w / 2, cy = h / 2;
  const diag = Math.sqrt(cx * cx + cy * cy);

  // Sphere params: fills ~68% of the shorter dimension
  const sphereR = Math.min(w, h) * 0.34;

  // Slow rotation of the sphere's color axis
  const rotY = time * 0.18;

  // Light direction (normalized) — gently orbiting above-right
  const lightAngle = time * 0.09;
  const lx = Math.cos(lightAngle) * 0.6;
  const ly = -0.55; // slightly above
  const lz = Math.sin(lightAngle) * 0.6 + 0.8;
  const lLen = Math.sqrt(lx * lx + ly * ly + lz * lz);
  const nlx = lx / lLen, nly = ly / lLen, nlz = lz / lLen;

  // Specular shininess exponent
  const shininess = 48;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy;
      const dist2D = Math.sqrt(dx * dx + dy * dy);

      const bgT = Math.min(1, dist2D / diag);
      // Smooth background blend (quadratic ease-in)
      const bgBlend = bgT * bgT;
      const bgR = lerp(bgInner[0], bgOuter[0], bgBlend) * (1 - bgBlend * 0.7);
      const bgG = lerp(bgInner[1], bgOuter[1], bgBlend) * (1 - bgBlend * 0.7);
      const bgB = lerp(bgInner[2], bgOuter[2], bgBlend) * (1 - bgBlend * 0.7);

      const idx = (y * w + x) * 4;

      // Outside sphere: background only
      if (dist2D > sphereR) {
        // Atmospheric halo: soft glow just outside the sphere edge
        const haloWidth = sphereR * 0.25;
        const haloOuter = sphereR + haloWidth;
        if (dist2D < haloOuter) {
          const haloT = 1 - (dist2D - sphereR) / haloWidth;
          const haloFade = haloT * haloT * haloT;
          // Sample dominant halo color from palette midpoint
          const [hr, hg, hb] = sampleRgbColors(rgbColors, 0.5);
          const haloAlpha = haloFade * 0.35;
          data[idx]     = Math.round(lerp(bgR, hr, haloAlpha));
          data[idx + 1] = Math.round(lerp(bgG, hg, haloAlpha));
          data[idx + 2] = Math.round(lerp(bgB, hb, haloAlpha));
        } else {
          data[idx]     = Math.round(Math.max(0, bgR));
          data[idx + 1] = Math.round(Math.max(0, bgG));
          data[idx + 2] = Math.round(Math.max(0, bgB));
        }
        data[idx + 3] = 255;
        continue;
      }

      // On the sphere: compute 3D surface normal
      const nx3 = dx / sphereR;
      const ny3 = dy / sphereR;
      const nz3 = Math.sqrt(Math.max(0, 1 - nx3 * nx3 - ny3 * ny3));

      // Rotate normal around Y axis for the color sampling (longitude)
      const cosR = Math.cos(rotY), sinR = Math.sin(rotY);
      const rnx = nx3 * cosR + nz3 * sinR;
      const rnz = -nx3 * sinR + nz3 * cosR;

      // Map spherical longitude+latitude to palette t in [0,1]
      const lon = (Math.atan2(rnx, rnz) / (Math.PI * 2) + 0.5); // 0..1
      const lat = (Math.asin(Math.max(-1, Math.min(1, ny3))) / Math.PI + 0.5); // 0..1
      const colorT = (lon * 0.7 + lat * 0.3) % 1;
      const [sr, sg, sb] = sampleRgbColors(rgbColors, colorT);

      // Diffuse lighting (Lambertian)
      const diffuse = Math.max(0, nx3 * nlx + ny3 * nly + nz3 * nlz);
      const ambient = 0.15;
      const diffuseTerm = ambient + (1 - ambient) * diffuse;

      // Specular (Blinn-Phong)
      // Half-vector between light and view (view = (0,0,1) looking at screen)
      const hx = nlx, hy = nly, hz = nlz + 1;
      const hLen = Math.sqrt(hx * hx + hy * hy + hz * hz);
      const spec = Math.pow(Math.max(0, (nx3 * hx + ny3 * hy + nz3 * hz) / hLen), shininess);
      const specIntensity = spec * 0.85;

      // Rim lighting — brightens edges facing away from light
      const rimFactor = Math.pow(1 - Math.abs(nz3), 3) * 0.25;
      const [rimR, rimG, rimB] = sampleRgbColors(rgbColors, (colorT + 0.5) % 1);

      let finalR = sr * diffuseTerm + 255 * specIntensity + rimR * rimFactor;
      let finalG = sg * diffuseTerm + 255 * specIntensity + rimG * rimFactor;
      let finalB = sb * diffuseTerm + 255 * specIntensity + rimB * rimFactor;

      // Soft edge fade at sphere boundary (anti-aliased feel)
      const edgeDist = sphereR - dist2D;
      if (edgeDist < 1.5) {
        const edgeFade = edgeDist / 1.5;
        finalR = lerp(bgR, finalR, edgeFade);
        finalG = lerp(bgG, finalG, edgeFade);
        finalB = lerp(bgB, finalB, edgeFade);
      }

      data[idx]     = Math.round(Math.max(0, Math.min(255, finalR)));
      data[idx + 1] = Math.round(Math.max(0, Math.min(255, finalG)));
      data[idx + 2] = Math.round(Math.max(0, Math.min(255, finalB)));
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
      case 'solid':       drawSolid(ctx, w, h, safeColors); break;
      case 'linear':      drawLinear(ctx, w, h, safeColors, time); break;
      case 'radial':      drawRadial(ctx, w, h, safeColors, time); break;
      case 'conic':       drawConic(ctx, w, h, rgbColors, time); break;
      case 'bilinear':    drawBilinear(ctx, w, h, rgbColors, time); break;
      case 'plasma':      drawPlasma(ctx, w, h, rgbColors, clampedTwist, time); break;
      case 'noise':       drawNoise(ctx, w, h, rgbColors, time); break;
      case 'voronoi':     drawVoronoi(ctx, w, h, rgbColors, time); break;
      case 'stripes':     drawStripes(ctx, w, h, safeColors, time); break;
      case 'isolines':    drawIsolines(ctx, w, h, safeColors, clampedTwist, time); break;
      case 'flowfield':   drawFlowField(ctx, w, h, safeColors, clampedTwist, time); break;
      case 'twisted':     drawTwisted(ctx, w, h, rgbColors, clampedTwist, time); break;
      case 'gradient3d':  drawGradient3D(ctx, w, h, rgbColors, time); break;
      default:            drawLinear(ctx, w, h, safeColors, time);
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

// Smart dark overlay — pure luminance darkening, no color tinting.
// Two neutral source-over passes:
//   1. Uniform dim: a flat semi-transparent black that evenly reduces brightness.
//   2. Edge vignette: a quadratic radial gradient from transparent center to
//      soft black edges — gives depth without color banding or godray artifacts.
function applyDarkify(ctx, w, h) {
  // Pass 1: uniform luminance reduction
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(0, 0, 0, 0.30)";
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Pass 2: smooth edge vignette using a radial gradient (neutral black only,
  // no blue/indigo tinting that caused the "godray" color fringing before).
  const cx = w / 2, cy = h / 2;
  const radius = Math.sqrt(cx * cx + cy * cy); // corner-to-center distance
  const vignette = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  // Center is fully transparent — no effect on the middle of the image
  vignette.addColorStop(0.0, "rgba(0, 0, 0, 0.00)");
  vignette.addColorStop(0.55, "rgba(0, 0, 0, 0.00)");
  // Quadratic ramp toward edges — no abrupt bands
  vignette.addColorStop(0.75, "rgba(0, 0, 0, 0.18)");
  vignette.addColorStop(0.90, "rgba(0, 0, 0, 0.38)");
  vignette.addColorStop(1.0,  "rgba(0, 0, 0, 0.52)");

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}