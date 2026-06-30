import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { 
  Shuffle, 
  Sliders, 
  Palette, 
  Grid, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Plus, 
  Minimize2, 
  Maximize2,
  Undo2
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---- COLOR CONVERSION HELPERS ----

// Hex to HSL
function hexToHsl(hex) {
  hex = hex.replace(/^#/, '');
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;
  
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

// HSL to Hex
function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs((h / 60) % 2 - 1));
  let m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  let rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  let gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  let bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`.toUpperCase();
}

// Generate 6 colors with HSL shifts that make a beautiful gradient.
function generate6ColorPalette(baseHex) {
  const { h, s, l } = hexToHsl(baseHex);
  const result = [];
  
  for (let i = 0; i < 6; i++) {
    // Hue shift: shift hue, centered around base hue
    const newH = (h - 45 + i * 18 + 360) % 360;
    // Saturation shift: soft peak in the middle
    const satOffset = -Math.abs(2.5 - i) * 4;
    const newS = Math.max(20, Math.min(100, s + satOffset));
    // Lightness gradient: progressive change from darker to lighter
    const newL = Math.max(10, Math.min(90, l - 18 + i * 7));
    
    result.push(hslToHex(newH, newS, newL));
  }
  return result;
}



const MAX_COLORS = {
  solid: 1, linear: 6, radial: 6, conic: 6,
  bilinear: 4, plasma: 6, noise: 6, voronoi: 6,
  stripes: 6, isolines: 6, flowfield: 6, twisted: 6,
};
const MIN_COLORS = {
  solid: 1, linear: 2, radial: 2, conic: 2,
  bilinear: 4, plasma: 2, noise: 2, voronoi: 2,
  stripes: 2, isolines: 2, flowfield: 2, twisted: 2,
};

const TYPE_DOT_COLORS = {
  solid:     "text-blue-400",
  linear:    "text-purple-400",
  radial:    "text-red-400",
  twisted:   "text-orange-400",
  bilinear:  "text-slate-400",
  plasma:    "text-cyan-400",
  noise:     "text-blue-300",
  conic:     "text-green-400",
  voronoi:   "text-green-500",
  stripes:   "text-red-400",
  isolines:  "text-slate-300",
  flowfield: "text-teal-400",
  random:    "text-pink-400",
};

const TYPE_ICON_SHAPE = {
  solid:     "■",
  linear:    "▬",
  radial:    "●",
  twisted:   "◉",
  bilinear:  "⊞",
  plasma:    "∿",
  noise:     "▒",
  conic:     "▲",
  voronoi:   "⬡",
  stripes:   "≡",
  isolines:  "≈",
  flowfield: "⟳",
  random:    "✕",
};

const TYPE_LABELS = {
  solid: "solid color", linear: "linear gradient", radial: "radial gradient",
  conic: "conic gradient", bilinear: "bilinear gradient", plasma: "plasma",
  noise: "blurred noise", voronoi: "voronoi", stripes: "stripes",
  isolines: "isolines", flowfield: "flow field", twisted: "twisted gradient",
};

function randomHex() {
  return "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
}

export default function UnifiedControlPanel({
  wallpaperType,
  setWallpaperType,
  colors,
  setColors,
  resolution,
  setResolution,
  addGrain,
  setAddGrain,
  grainIntensity,
  setGrainIntensity,
  twist,
  setTwist,
  presets,
  resolutions,
  applyPreset,
  recentColors,
  addRecentColor,
  onDownload,
  isGenerating,
  animateBg,
  setAnimateBg,
  animationSpeed,
  setAnimationSpeed,
  wallpaperTypes,
  onResetMotion,
  darkify,
  setDarkify
}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeColorIdx, setActiveColorIdx] = useState(0);
  
  // Accordion section states
  const [stylesOpen, setStylesOpen] = useState(true);
  const [colorsOpen, setColorsOpen] = useState(true);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(true);

  const maxColors = MAX_COLORS[wallpaperType] ?? 5;
  const minColors = MIN_COLORS[wallpaperType] ?? 2;

  const clampedColors = (() => {
    if (wallpaperType === "bilinear") {
      const c = [...colors];
      while (c.length < 4) c.push(randomHex());
      return c.slice(0, 4);
    }
    const c = [...colors].slice(0, maxColors);
    while (c.length < minColors) c.push(randomHex());
    return c;
  })();

  // Keep active color index inside bounds when list size shrinks
  useEffect(() => {
    if (activeColorIdx >= clampedColors.length) {
      setActiveColorIdx(Math.max(0, clampedColors.length - 1));
    }
  }, [clampedColors.length, activeColorIdx]);



  const updateColor = (idx, val) => {
    const next = [...clampedColors];
    next[idx] = val;
    setColors(next);
    addRecentColor(val);
  };

  const addColor = () => {
    if (clampedColors.length < maxColors) {
      const newCol = randomHex();
      setColors([...clampedColors, newCol]);
      setActiveColorIdx(clampedColors.length); // Select new color
    }
  };

  const removeColor = (idx) => {
    if (clampedColors.length > minColors) {
      const next = clampedColors.filter((_, i) => i !== idx);
      setColors(next);
      setActiveColorIdx(Math.max(0, idx - 1));
    }
  };

  const randomize = () => {
    const nextColors = clampedColors.map(() => randomHex());
    setColors(nextColors);
  };

  // Color picker slider handler
  const activeColor = clampedColors[activeColorIdx] || "#FFFFFF";
  const { h, s, l } = hexToHsl(activeColor);

  const handleHslChange = (hue, sat, light) => {
    const newHex = hslToHex(hue, sat, light);
    updateColor(activeColorIdx, newHex);
  };

  const handleRecentOrPresetClick = (color) => {
    updateColor(activeColorIdx, color);
  };

  const showTwist = ["twisted", "plasma", "flowfield", "isolines"].includes(wallpaperType);

  return (
    <div className="fixed top-3 right-3 md:top-6 md:right-6 z-30 pointer-events-none flex flex-col items-end">
      <AnimatePresence mode="wait">
        
        {/* MINIMIZED LOGO BUBBLE */}
        {isMinimized ? (
          <motion.div
            key="minimized"
            initial={{ scale: 0.7, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.7, opacity: 0, y: -20 }}
            className="pointer-events-auto flex items-center gap-2 p-2.5 rounded-full border border-white/20 shadow-2xl cursor-pointer hover:border-white/35 transition-all select-none"
            style={{
              background: "rgba(15, 15, 15, 0.65)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
            onClick={() => setIsMinimized(false)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-black/20 shadow-inner">
              <img src="/logo.png" className="w-8 h-8 object-contain" alt="Logo" />
            </div>
            <div className="pr-4 pl-1 flex flex-col">
              <span className="text-white text-xs font-bold font-sans">chromaful</span>
              <span className="text-[9px] text-white/40 font-mono">tap to expand</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 mr-1 shadow-sm">
              <Maximize2 className="w-3.5 h-3.5" />
            </div>
          </motion.div>
        ) : (

          /* EXPANDED UNIFIED PANEL */
          <motion.div
            key="expanded"
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="pointer-events-auto w-[320px] md:w-[350px] rounded-[20px] md:rounded-[24px] border border-white/20 shadow-2xl flex flex-col overflow-hidden select-none max-h-[calc(100dvh-1.5rem)] md:max-h-[calc(100dvh-3rem)]"
            style={{
              background: "rgba(15, 15, 15, 0.55)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              boxShadow: "0 16px 48px rgba(0, 0, 0, 0.35)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/8 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-black/15 shadow-inner">
                  <img src="/logo.png" className="w-7 h-7 object-contain" alt="Logo" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm tracking-tight">chromaful</h2>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMinimized(true)}
                className="w-7 h-7 rounded-full bg-white/10 text-white/70 hover:bg-white/15 hover:text-white flex items-center justify-center transition-colors"
                title="minimize panel"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </motion.button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 divide-y divide-white/6 custom-scrollbar pr-0.5">
              
              {/* SECTION 1: WALLPAPER STYLE */}
              <div className="p-4">
                <button
                  onClick={() => setStylesOpen(!stylesOpen)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-white/80 uppercase tracking-wider hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Grid className="w-3.5 h-3.5 text-orange-400" />
                    1. wallpaper style
                  </span>
                  {stylesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <AnimatePresence initial={false}>
                  {stylesOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden mt-3"
                    >
                      <div className="grid grid-cols-3 gap-1.5">
                        {wallpaperTypes.map((type) => {
                          const isSelected = wallpaperType === type.id;
                          return (
                            <button
                              key={type.id}
                              onClick={() => setWallpaperType(type.id)}
                              className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all min-h-[56px] relative select-none",
                                isSelected
                                  ? "bg-orange-500/20 border-orange-500/80 text-white font-medium shadow-md shadow-orange-500/5"
                                  : "bg-white/5 border-white/5 hover:bg-white/10 text-white/60 active:scale-95"
                              )}
                            >
                              <span className={cn("text-sm mb-0.5 block", TYPE_DOT_COLORS[type.id] || "text-white")}>
                                {TYPE_ICON_SHAPE[type.id] || "◉"}
                              </span>
                              <span className="text-[9px] font-medium tracking-wide truncate w-full">{type.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* SECTION 2: GRADIENT COLORS */}
              <div className="p-4">
                <button
                  onClick={() => setColorsOpen(!colorsOpen)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-white/80 uppercase tracking-wider hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-orange-400" />
                    2. palette & custom colors
                  </span>
                  {colorsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <AnimatePresence initial={false}>
                  {colorsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden mt-3 space-y-4"
                    >
                      {/* Active Swatches Row */}
                      <div>
                        <span className="text-[9px] text-white/40 uppercase font-mono tracking-wider">select swatch to edit</span>
                        <div className="flex items-center gap-2.5 overflow-x-auto py-2 px-1 mt-1.5 scrollbar-none min-h-[56px]">
                          {clampedColors.map((color, idx) => {
                            const isActive = activeColorIdx === idx;
                            return (
                              <div key={idx} className="flex flex-col items-center shrink-0 relative group">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setActiveColorIdx(idx)}
                                  className={cn(
                                    "w-10 h-10 rounded-full border-2 transition-all shadow-md relative flex items-center justify-center",
                                    isActive ? "border-orange-500 scale-105 shadow-lg shadow-orange-500/20" : "border-white/10 hover:border-white/30"
                                  )}
                                  style={{ backgroundColor: color }}
                                >
                                  {isActive && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-white shadow-md border border-black/10" />
                                  )}
                                </motion.button>
                                
                                {/* Delete swatch indicator */}
                                {clampedColors.length > minColors && wallpaperType !== "bilinear" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeColor(idx);
                                    }}
                                    className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow shadow-black/30 border border-white/10 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-90"
                                  >
                                    <Trash2 className="w-2.5 h-2.5 text-white" />
                                  </button>
                                )}
                                <span className="text-[9px] text-white/30 font-mono mt-0.5">{idx + 1}</span>
                              </div>
                            );
                          })}
                          
                          {/* Add swatch */}
                          {clampedColors.length < maxColors && wallpaperType !== "bilinear" && (
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={addColor}
                              className="w-10 h-10 rounded-full border border-dashed border-white/20 flex items-center justify-center text-white/40 hover:border-white/40 hover:text-white transition-colors shrink-0"
                            >
                              <Plus className="w-4 h-4" />
                            </motion.button>
                          )}
                        </div>
                      </div>

                      {/* FULL HSL COLOR PICKER PANEL */}
                      <div className="bg-white/5 border border-white/5 p-3 rounded-xl space-y-3">
                        {/* Preview and Hex Input */}
                        <div className="flex items-center justify-between pb-2 border-b border-white/5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg shadow border border-white/10" style={{ backgroundColor: activeColor }} />
                            <span className="text-white text-xs font-semibold">swatch {activeColorIdx + 1}</span>
                            {clampedColors.length > minColors && wallpaperType !== "bilinear" && (
                              <button
                                onClick={() => removeColor(activeColorIdx)}
                                className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors"
                                title="Remove Swatch"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          
                          {/* Hex text input */}
                          <input
                            type="text"
                            value={activeColor}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (!val.startsWith("#")) val = "#" + val;
                              if (/^#[0-9A-F]{6}$/i.test(val)) {
                                updateColor(activeColorIdx, val);
                              }
                            }}
                            className="w-20 bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[10px] text-white font-mono uppercase focus:outline-none focus:border-orange-500/80 text-center"
                            maxLength={7}
                            placeholder="#hex"
                          />
                        </div>

                        {/* Sliders container */}
                        <div className="space-y-2.5">
                          {/* 1. Hue Slider */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] text-white/45 font-mono">
                              <span>hue</span>
                              <span>{h}°</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="360"
                              value={h}
                              onChange={(e) => handleHslChange(Number(e.target.value), s, l)}
                              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer outline-none bg-transparent"
                              style={{
                                background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                                WebkitAppearance: "none"
                              }}
                            />
                          </div>

                          {/* 2. Saturation Slider */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] text-white/45 font-mono">
                              <span>saturation</span>
                              <span>{s}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={s}
                              onChange={(e) => handleHslChange(h, Number(e.target.value), l)}
                              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer outline-none bg-transparent"
                              style={{
                                background: `linear-gradient(to right, #808080, ${hslToHex(h, 100, 50)})`,
                                WebkitAppearance: "none"
                              }}
                            />
                          </div>

                          {/* 3. Lightness Slider */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] text-white/45 font-mono">
                              <span>lightness</span>
                              <span>{l}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={l}
                              onChange={(e) => handleHslChange(h, s, Number(e.target.value))}
                              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer outline-none bg-transparent"
                              style={{
                                background: `linear-gradient(to right, #000000, ${hslToHex(h, s, 50)}, #ffffff)`,
                                WebkitAppearance: "none"
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Control row */}
                      <div className="flex justify-between items-center mt-1 select-none">
                        {wallpaperType !== "solid" && wallpaperType !== "bilinear" ? (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              const newPalette = generate6ColorPalette(activeColor);
                              setColors(newPalette);
                              setActiveColorIdx(0);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/35 hover:bg-orange-500/20 text-[10px] text-orange-300 font-semibold"
                            title="generate 6-color gradient based on this color"
                          >
                            <Palette className="w-3 h-3" />
                            <span>auto-gen 6 colors</span>
                          </motion.button>
                        ) : <div />}

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={randomize}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[10px] text-white/80 hover:bg-white/15 font-medium"
                        >
                          <Shuffle className="w-3 h-3" />
                          <span>randomize all</span>
                        </motion.button>
                      </div>

                      {/* Presets Grid */}
                      <div>
                        <span className="text-[9px] text-white/40 uppercase font-mono tracking-wider">preset themes</span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5 max-h-[88px] overflow-y-auto pr-1">
                          {Object.entries(presets).map(([name, themeColors]) => (
                            <button
                              key={name}
                              onClick={() => applyPreset(name)}
                              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/15 transition-all text-[10px] text-white/70"
                            >
                              <div className="flex">
                                {themeColors.slice(0, 3).map((c, i) => (
                                  <div
                                    key={i}
                                    className="w-2 h-2 rounded-full border border-black/20 shrink-0"
                                    style={{ backgroundColor: c, marginLeft: i > 0 ? "-3px" : 0 }}
                                  />
                                ))}
                              </div>
                              <span className="truncate max-w-[65px]">{name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Recents (Edit Active Swatch) */}
                      {recentColors.length > 0 && (
                        <div>
                          <span className="text-[9px] text-white/40 uppercase font-mono tracking-wider">quick select recents</span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {recentColors.map((color, i) => (
                              <button
                                key={i}
                                onClick={() => handleRecentOrPresetClick(color)}
                                className="w-6 h-6 rounded-full border border-transparent hover:border-white/50 transition-all shadow-sm shrink-0"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* SECTION 3: PERFORMANCE & MOTION */}
              <div className="p-4">
                <button
                  onClick={() => setTweaksOpen(!tweaksOpen)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-white/80 uppercase tracking-wider hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-orange-400" />
                    3. performance & motion
                  </span>
                  {tweaksOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <AnimatePresence initial={false}>
                  {tweaksOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden mt-3 space-y-4"
                    >
                      {/* Smart Dark Overlay Toggle */}
                      <div className="flex items-center justify-between bg-white/5 p-2.5 rounded-xl border border-white/5">
                        <div className="flex flex-col">
                          <span className="text-white text-xs font-semibold">smart dark overlay</span>
                          <span className="text-[9px] text-white/40">apply rich indigo vignette overlay</span>
                        </div>
                        <Switch
                          checked={darkify}
                          onCheckedChange={setDarkify}
                          className="data-[state=checked]:bg-orange-500"
                        />
                      </div>

                      {/* Live Animation Toggle */}
                      <div className="flex items-center justify-between bg-white/5 p-2.5 rounded-xl border border-white/5">
                        <div className="flex flex-col">
                          <span className="text-white text-xs font-semibold">continuous movement</span>
                          <span className="text-[9px] text-white/40">drifts wallpaper dynamically</span>
                        </div>
                        <Switch
                          checked={animateBg}
                          onCheckedChange={setAnimateBg}
                          className="data-[state=checked]:bg-orange-500"
                        />
                      </div>

                      {/* Animation Speed */}
                      {animateBg && (
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-white/60">motion speed</span>
                            <span className="text-xs text-orange-400 font-mono font-semibold">{animationSpeed.toFixed(1)}x</span>
                          </div>
                          <Slider
                            min={0.1}
                            max={2.0}
                            step={0.1}
                            value={[animationSpeed]}
                            onValueChange={([v]) => setAnimationSpeed(v)}
                          />
                        </div>
                      )}

                      {/* Reset Motion Position */}
                      <div className="flex items-center justify-between bg-white/5 p-2.5 rounded-xl border border-white/5">
                        <span className="text-xs text-white/60 font-semibold">reset animation position</span>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={onResetMotion}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 text-[10px] text-white/90"
                        >
                          <Undo2 className="w-3 h-3" />
                          <span>reset position</span>
                        </motion.button>
                      </div>

                      {/* Twist / Complexity */}
                      {showTwist && (
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-white/60">
                              {wallpaperType === "twisted" ? "twist amount" : "complexity"}
                            </span>
                            <span className="text-xs text-orange-400 font-mono font-semibold">{twist}</span>
                          </div>
                          <Slider
                            min={0}
                            max={200}
                            step={1}
                            value={[twist]}
                            onValueChange={([v]) => setTwist(v)}
                          />
                        </div>
                      )}

                      {/* Film Grain */}
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-xs text-white/60 font-semibold">film grain</span>
                            <span className="text-[9px] text-white/30">add static texture</span>
                          </div>
                          <Switch
                            checked={addGrain}
                            onCheckedChange={setAddGrain}
                            className="data-[state=checked]:bg-orange-500"
                          />
                        </div>

                        {addGrain && (
                          <div className="space-y-2 pt-2 border-t border-white/5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-white/40 font-semibold">grain intensity</span>
                              <span className="text-xs text-white/60 font-mono">{grainIntensity}%</span>
                            </div>
                            <Slider
                              min={0}
                              max={100}
                              step={1}
                              value={[grainIntensity]}
                              onValueChange={([v]) => setGrainIntensity(v)}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* SECTION 4: EXPORT OPTIONS */}
              <div className="p-4">
                <button
                  onClick={() => setExportOpen(!exportOpen)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-white/80 uppercase tracking-wider hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-orange-400" />
                    4. export options
                  </span>
                  {exportOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <AnimatePresence initial={false}>
                  {exportOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden mt-3 space-y-4.5"
                    >
                      <div>
                        <span className="text-[9px] text-white/40 uppercase font-mono tracking-wider">resolution</span>
                        <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                          {resolutions.map((res) => (
                            <button
                              key={res}
                              onClick={() => setResolution(res)}
                              className={cn(
                                "py-1.5 rounded-lg text-[10px] transition-all border select-none",
                                resolution === res
                                  ? "bg-orange-500/20 border-orange-500/80 text-white font-semibold shadow-inner"
                                  : "bg-white/5 border-white/5 hover:bg-white/10 text-white/50 active:scale-95"
                              )}
                            >
                              {res}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Download Button */}
                      <div className="pt-1">
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={onDownload}
                          disabled={isGenerating}
                          className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>generate & download</span>
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
