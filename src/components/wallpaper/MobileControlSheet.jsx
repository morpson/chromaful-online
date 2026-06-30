import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { 
  Play, 
  Pause, 
  Shuffle, 
  Sliders, 
  Palette, 
  Grid, 
  Download, 
  ChevronUp, 
  ChevronDown, 
  Trash2, 
  Plus, 
  Sparkles
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
  solid: "Solid Color", linear: "Linear", radial: "Radial",
  conic: "Conic", bilinear: "Bilinear", plasma: "Plasma",
  noise: "Noise", voronoi: "Voronoi", stripes: "Stripes",
  isolines: "Isolines", flowfield: "Flow Field", twisted: "Twisted",
};

function randomHex() {
  return "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
}

export default function MobileControlSheet({
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
  darkify,
  setDarkify
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("styles"); // styles, colors, adjust, export
  const [activeColorIdx, setActiveColorIdx] = useState(0);

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
    setColors(clampedColors.map(() => randomHex()));
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

  // Drag handler to collapse sheet
  const handleDragEnd = (event, info) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      setIsOpen(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 pointer-events-none flex flex-col items-center justify-end px-4 pb-6">
      
      {/* FLOATING COLLAPSED DOCK */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-full shadow-2xl border border-white/20 w-[92vw] max-w-sm"
            style={{
              background: "rgba(15, 15, 15, 0.65)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.25)",
            }}
          >
            {/* Play/Pause Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setAnimateBg(!animateBg)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                animateBg ? "bg-orange-500 text-white shadow-lg shadow-orange-500/35" : "bg-white/10 text-white"
              )}
            >
              {animateBg ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </motion.button>

            {/* Randomize Colors */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={randomize}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 text-white/90 flex items-center justify-center"
              title="Randomize Colors"
            >
              <Shuffle className="w-4 h-4" />
            </motion.button>

            {/* Active Wallpaper Info */}
            <div className="flex-1 flex flex-col items-start px-2">
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold font-mono">Current Style</span>
              <span className="text-white text-xs font-semibold truncate max-w-[120px]">
                {TYPE_LABELS[wallpaperType] || wallpaperType}
              </span>
            </div>

            {/* Expand / Settings Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsOpen(true)}
              className="px-4 h-10 rounded-full bg-white/15 hover:bg-white/20 text-white font-medium text-xs flex items-center gap-1.5 shadow-inner"
            >
              <span>Menu</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL EXPANDED BOTTOM SHEET */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-20 pointer-events-auto"
            />

            {/* Bottom Sheet */}
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.5 }}
              onDragEnd={handleDragEnd}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-x-0 bottom-0 rounded-t-[32px] border-t border-white/20 z-30 pointer-events-auto flex flex-col max-h-[82vh] overflow-hidden"
              style={{
                background: "rgba(15, 15, 15, 0.55)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                boxShadow: "0 -10px 40px rgba(0, 0, 0, 0.3)",
              }}
            >
              {/* Drag Handle Indicator */}
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto my-3 cursor-grab active:cursor-grabbing shrink-0" />

              {/* Title & Close Row */}
              <div className="flex items-center justify-between px-6 pb-2 shrink-0">
                <div>
                  <h3 className="text-white font-bold text-base tracking-tight flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    chromaful designer
                  </h3>
                  <p className="text-[10px] text-white/40 font-mono mt-0.5">customize your dynamic wallpaper</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 text-white/80 hover:bg-white/15 flex items-center justify-center font-medium"
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Tabs Navigation Header */}
              <div className="flex border-b border-white/10 px-4 py-1 shrink-0 gap-1">
                {[
                  { id: "styles", label: "styles", icon: Grid },
                  { id: "colors", label: "colors", icon: Palette },
                  { id: "adjust", label: "tweak", icon: Sliders },
                  { id: "export", label: "save", icon: Download },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all duration-200",
                        isActive ? "bg-white/10 text-orange-400 font-semibold" : "text-white/50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] uppercase tracking-wider">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Panel Content Container (Scrollable) */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                
                {/* 1. STYLES TAB */}
                {activeTab === "styles" && (
                  <div className="grid grid-cols-3 gap-2.5">
                    {wallpaperTypes.map((type) => {
                      const isSelected = wallpaperType === type.id;
                      return (
                        <motion.button
                          key={type.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setWallpaperType(type.id)}
                          className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all min-h-[72px] relative overflow-hidden",
                            isSelected
                              ? "bg-gradient-to-br from-orange-500/30 to-pink-500/20 border-orange-500/80 text-white shadow-lg shadow-orange-500/10"
                              : "bg-white/5 border-white/5 hover:bg-white/10 text-white/70"
                          )}
                        >
                          <span className={cn("text-lg mb-1 block", TYPE_DOT_COLORS[type.id] || "text-white")}>
                            {TYPE_ICON_SHAPE[type.id] || "◉"}
                          </span>
                          <span className="text-[10px] font-medium tracking-wide truncate w-full">{type.label}</span>
                          {isSelected && (
                            <div className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {/* 2. COLORS TAB */}
                {activeTab === "colors" && (
                  <div className="space-y-4">
                    {/* Active Colors Row */}
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono mb-2">select swatch to edit</p>
                      <div className="flex items-center gap-3 overflow-x-auto py-2 px-1 min-h-[60px] scrollbar-none">
                        {clampedColors.map((color, idx) => {
                          const isActive = activeColorIdx === idx;
                          return (
                            <div key={idx} className="flex flex-col items-center gap-1 shrink-0 relative">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setActiveColorIdx(idx)}
                                className={cn(
                                  "w-11 h-11 rounded-full border-2 transition-all shadow-md relative flex items-center justify-center",
                                  isActive ? "border-orange-500 scale-105 shadow-lg shadow-orange-500/25" : "border-white/10"
                                )}
                                style={{ backgroundColor: color }}
                              >
                                {isActive && (
                                  <div className="w-2.5 h-2.5 rounded-full bg-white shadow-md border border-black/10" />
                                )}
                              </motion.button>
                              
                              {/* Delete color circle overlay */}
                              {clampedColors.length > minColors && wallpaperType !== "bilinear" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeColor(idx);
                                  }}
                                  className="absolute top-0 right-0 w-4.5 h-4.5 bg-red-500 rounded-full flex items-center justify-center shadow-lg border border-white/10 z-10 active:scale-90"
                                >
                                  <Trash2 className="w-2.5 h-2.5 text-white" />
                                </button>
                              )}
                              <span className="text-[9px] text-white/30 font-mono mt-0.5">{idx + 1}</span>
                            </div>
                          );
                        })}
                        
                        {/* Add color button */}
                        {clampedColors.length < maxColors && wallpaperType !== "bilinear" && (
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={addColor}
                            className="w-11 h-11 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-white/40 active:border-white/60 active:text-white transition-all shrink-0"
                          >
                            <Plus className="w-5 h-5" />
                          </motion.button>
                        )}
                      </div>
                    </div>

                    {/* FULL HSL COLOR PICKER PANEL */}
                    <div className="bg-white/5 border border-white/5 p-3 rounded-2xl space-y-3">
                      {/* Preview and Hex Input */}
                      <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg shadow border border-white/10" style={{ backgroundColor: activeColor }} />
                          <span className="text-white text-xs font-semibold">Swatch {activeColorIdx + 1}</span>
                          {clampedColors.length > minColors && wallpaperType !== "bilinear" && (
                            <button
                              onClick={() => removeColor(activeColorIdx)}
                              className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors"
                              title="remove swatch"
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
                          className="w-20 bg-white/5 border border-white/10 rounded px-2 py-0.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-orange-500/80 text-center"
                          maxLength={7}
                          placeholder="#hex"
                        />
                      </div>

                      {/* Sliders container */}
                      <div className="space-y-3">
                        {/* 1. Hue Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-white/45 font-mono">
                            <span>hue</span>
                            <span>{h}°</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            value={h}
                            onChange={(e) => handleHslChange(Number(e.target.value), s, l)}
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer outline-none bg-transparent"
                            style={{
                              background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                              WebkitAppearance: "none"
                            }}
                          />
                        </div>

                        {/* 2. Saturation Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-white/45 font-mono">
                            <span>saturation</span>
                            <span>{s}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={s}
                            onChange={(e) => handleHslChange(h, Number(e.target.value), l)}
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer outline-none bg-transparent"
                            style={{
                              background: `linear-gradient(to right, #808080, ${hslToHex(h, 100, 50)})`,
                              WebkitAppearance: "none"
                            }}
                          />
                        </div>

                        {/* 3. Lightness Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-white/45 font-mono">
                            <span>lightness</span>
                            <span>{l}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={l}
                            onChange={(e) => handleHslChange(h, s, Number(e.target.value))}
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer outline-none bg-transparent"
                            style={{
                              background: `linear-gradient(to right, #000000, ${hslToHex(h, s, 50)}, #ffffff)`,
                              WebkitAppearance: "none"
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Control row */}
                    <div className="flex justify-between items-center mt-1.5 select-none">
                      {wallpaperType !== "solid" && wallpaperType !== "bilinear" ? (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            const newPalette = generate6ColorPalette(activeColor);
                            setColors(newPalette);
                            setActiveColorIdx(0);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/35 active:bg-orange-500/20 text-xs text-orange-300 font-semibold"
                          title="generate 6-color gradient based on this color"
                        >
                          <Palette className="w-3.5 h-3.5" />
                          <span>auto-gen 6 colors</span>
                        </motion.button>
                      ) : <div />}

                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={randomize}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-xs text-white/80 active:bg-white/15 font-medium"
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                        <span>randomize all</span>
                      </motion.button>
                    </div>

                    {/* Presets */}
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono mb-2">preset themes</p>
                      <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-1">
                        {Object.entries(presets).map(([name, themeColors]) => (
                          <motion.button
                            key={name}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => applyPreset(name)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5 active:border-white/20 active:bg-white/10 transition-all text-xs text-white/70"
                          >
                            <div className="flex">
                              {themeColors.slice(0, 3).map((c, i) => (
                                <div
                                  key={i}
                                  className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                                  style={{ backgroundColor: c, marginLeft: i > 0 ? "-4px" : 0 }}
                                />
                              ))}
                            </div>
                            <span className="truncate">{name}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Recent Colors (Edit Active Swatch) */}
                    {recentColors.length > 0 && (
                      <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono mb-2">quick select recents</p>
                        <div className="flex flex-wrap gap-2">
                          {recentColors.map((color, i) => (
                            <motion.button
                              key={i}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleRecentOrPresetClick(color)}
                              className="w-8 h-8 rounded-full border-2 border-transparent active:border-white/60 transition-all shadow-md shrink-0"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* 3. TWEAK TAB */}
                {activeTab === "adjust" && (
                  <div className="space-y-5">
                    {/* Smart Dark Overlay Toggle */}
                    <div className="flex items-center justify-between bg-white/5 p-3.5 rounded-2xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-white text-xs font-semibold">smart dark overlay</span>
                        <span className="text-[10px] text-white/40 mt-0.5">apply rich indigo vignette overlay</span>
                      </div>
                      <Switch
                        checked={darkify}
                        onCheckedChange={setDarkify}
                        className="data-[state=checked]:bg-orange-500"
                      />
                    </div>

                    {/* Live Motion Status */}
                    <div className="flex items-center justify-between bg-white/5 p-3.5 rounded-2xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-white text-xs font-semibold">continuous movement</span>
                        <span className="text-[10px] text-white/40 mt-0.5">let background drift dynamically</span>
                      </div>
                      <Switch
                        checked={animateBg}
                        onCheckedChange={setAnimateBg}
                        className="data-[state=checked]:bg-orange-500"
                      />
                    </div>

                    {/* Animation Speed Slider */}
                    {animateBg && (
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/60">movement speed</span>
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

                    {/* Twist/complexity slider */}
                    {showTwist && (
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
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
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs text-white/60 font-semibold">film grain</span>
                          <span className="text-[9px] text-white/30">add a textured analog feel</span>
                        </div>
                        <Switch
                          checked={addGrain}
                          onCheckedChange={setAddGrain}
                          className="data-[state=checked]:bg-orange-500"
                        />
                      </div>

                      {addGrain && (
                        <div className="space-y-3 pt-1 border-t border-white/5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-white/40">grain intensity</span>
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
                  </div>
                )}

                {/* 4. EXPORT TAB */}
                {activeTab === "export" && (
                  <div className="space-y-5">
                    {/* Resolution Selection */}
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono mb-3">target resolution</p>
                      <div className="grid grid-cols-2 gap-2">
                        {resolutions.map((res) => (
                          <button
                            key={res}
                            onClick={() => setResolution(res)}
                            className={cn(
                              "py-2.5 rounded-xl text-xs transition-all",
                              resolution === res
                                ? "bg-orange-500 text-white font-semibold shadow-lg shadow-orange-500/20"
                                : "bg-white/5 text-white/50 border border-white/5 active:bg-white/10"
                            )}
                          >
                            {res}
                          </button>
                        ))}
                      </div>
                      <p className="text-[9px] text-white/30 font-mono mt-2.5 text-center">
                        note: wallpaper will render at this high resolution on download.
                      </p>
                    </div>

                    {/* Big Action Download Button */}
                    <div className="pt-2">
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={onDownload}
                        disabled={isGenerating}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-semibold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-50"
                      >
                        <Download className="w-4.5 h-4.5" />
                        <span>save high-res wallpaper</span>
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
