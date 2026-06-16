import React from "react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import ColorSwatch from "./ColorSwatch";
import { Shuffle, FolderOpen, Trash2, Eye, Zap, Loader } from "lucide-react";

const MAX_COLORS = {
  solid: 1, linear: 5, radial: 5, conic: 5,
  bilinear: 4, plasma: 4, noise: 3, voronoi: 5,
  stripes: 5, isolines: 3, flowfield: 3, twisted: 5,
};
const MIN_COLORS = {
  solid: 1, linear: 2, radial: 2, conic: 2,
  bilinear: 4, plasma: 2, noise: 2, voronoi: 2,
  stripes: 2, isolines: 2, flowfield: 2, twisted: 2,
};

function randomHex() {
  return "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
}

const TYPE_LABELS = {
  solid: "Solid Color", linear: "Linear Gradient", radial: "Radial Gradient",
  conic: "Conic Gradient", bilinear: "Bilinear Gradient", plasma: "Plasma",
  noise: "Blurred Noise", voronoi: "Voronoi", stripes: "Stripes",
  isolines: "Isolines", flowfield: "Flow Field", twisted: "Twisted Gradient",
};

export default function GradientControlPanel({
  wallpaperType, colors, setColors, resolution, setResolution,
  addGrain, setAddGrain, grainIntensity, setGrainIntensity,
  twist, setTwist, presets, resolutions, applyPreset,
  recentColors, addRecentColor, onGenerate, onDownload, isGenerating = false,
}) {
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

  const updateColor = (idx, val) => {
    const next = [...clampedColors];
    next[idx] = val;
    setColors(next);
    addRecentColor(val);
  };

  const addColor = () => {
    if (clampedColors.length < maxColors) setColors([...clampedColors, randomHex()]);
  };

  const removeColor = (idx) => {
    if (clampedColors.length > minColors) setColors(clampedColors.filter((_, i) => i !== idx));
  };

  const randomize = () => setColors(clampedColors.map(() => randomHex()));

  const showTwist = ["twisted", "plasma", "flowfield", "isolines"].includes(wallpaperType);
  const showColors = wallpaperType !== "solid";
  const colorLabel = wallpaperType === "solid" ? "Color" : `Gradient Colors (2-${maxColors} colors)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full md:w-[340px] rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "rgba(30, 22, 48, 0.75)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
      }}
    >
      {/* Top toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between px-4 py-3 border-b border-white/10 gap-2">
        <button className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10 w-full md:w-auto justify-center md:justify-start">
          <FolderOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Open</span>
        </button>
        <button className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/10 w-full md:w-auto justify-center md:justify-start">
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </button>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex items-center gap-1.5 text-xs text-white bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg font-medium w-full md:w-auto justify-center"
        >
          {isGenerating ? (
            <>
              <Loader className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Generating</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </>
          )}
        </button>
        <button
          onClick={onDownload}
          disabled={isGenerating}
          className="flex items-center gap-1.5 text-xs text-white bg-orange-500 hover:bg-orange-400 disabled:bg-orange-500/50 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg font-medium w-full md:w-auto justify-center"
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Generate</span>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto flex-1" style={{ maxHeight: "calc(100vh - 120px)" }}>
        {/* Color section */}
        <div className="p-4 border-b border-white/10">
          {/* Section header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-[8px]">✦</div>
            <span className="font-semibold text-white text-sm">{TYPE_LABELS[wallpaperType] || wallpaperType}</span>
          </div>

          <p className="text-xs text-white/40 mb-3">{colorLabel}</p>

          {/* Color swatches row - responsive grid */}
          <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-2">
            {clampedColors.map((color, idx) => (
              <motion.div
                key={idx}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-1 shrink-0"
              >
                <ColorSwatch
                  color={color}
                  index={idx}
                  canRemove={clampedColors.length > minColors && wallpaperType !== "bilinear"}
                  onRemove={() => removeColor(idx)}
                  onChange={(val) => updateColor(idx, val)}
                  large
                />
                <span className="text-[10px] text-white/30 font-mono">{idx + 1}</span>
              </motion.div>
            ))}
            {clampedColors.length < maxColors && wallpaperType !== "bilinear" && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={addColor}
                className="w-11 h-11 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-white/40 hover:text-white hover:border-white/40 transition-all text-xl shrink-0"
              >
                +
              </motion.button>
            )}
          </div>

          {/* Action row: + / Save / Randomize / Presets */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <motion.button
              onClick={addColor}
              disabled={clampedColors.length >= maxColors || wallpaperType === "bilinear"}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm disabled:opacity-30 transition-all"
            >
              +
            </motion.button>
            <motion.button
              onClick={randomize}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs text-white/70 hover:text-white transition-all"
            >
              <Shuffle className="w-3 h-3" />
              Randomize
            </motion.button>
            <span className="text-white/20 text-xs ml-1">{clampedColors.length} colors</span>
          </div>

          {/* Preset themes - scrollable on mobile */}
          <div className="flex flex-wrap gap-1.5 mb-1">
            {Object.entries(presets).map(([name, themeColors]) => (
              <motion.button
                key={name}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => applyPreset(name)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/15 transition-all text-xs text-white/60 hover:text-white border border-white/5 hover:border-white/20"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: `linear-gradient(135deg, ${themeColors[0]}, ${themeColors[1]})` }}
                />
                {name}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Twist/complexity slider */}
        {showTwist && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 border-b border-white/10"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50">
                {wallpaperType === "twisted" ? "Twist Amount" : "Complexity"}
              </span>
              <span className="text-xs text-white/70 font-mono">{twist}</span>
            </div>
            <Slider
              min={0} max={200} step={1}
              value={[twist]}
              onValueChange={([v]) => setTwist(v)}
              className="w-full"
            />
          </motion.div>
        )}

        {/* Recent Colors */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 border-b border-white/10"
        >
          <p className="text-xs text-white/40 mb-2">Recent Colors</p>
          <div className="flex flex-wrap gap-2">
            {recentColors.map((color, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const next = [...clampedColors];
                  next[0] = color;
                  setColors(next);
                }}
                className="w-7 h-7 rounded-full border-2 border-transparent hover:border-white/60 transition-all shadow-sm"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </motion.div>

        {/* Options */}
        <div className="p-4">
          <p className="text-sm font-semibold text-white mb-3">Options</p>

          {/* Resolution - responsive grid */}
          <p className="text-xs text-white/40 mb-2">Resolution</p>
          <div className="grid grid-cols-2 lg:grid-cols-2 gap-1.5 mb-4">
            {resolutions.map((res) => (
              <motion.button
                key={res}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setResolution(res)}
                className={`px-2.5 py-1 rounded text-xs transition-all text-nowrap ${
                  resolution === res
                    ? "bg-orange-500 text-white font-semibold"
                    : "bg-white/5 text-white/50 hover:bg-white/15 hover:text-white"
                }`}
              >
                {res}
              </motion.button>
            ))}
          </div>

          {/* Auto-set as Wallpaper (display only) */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-white/70">Auto-set as Wallpaper</span>
            <Switch disabled className="opacity-40" />
          </div>

          {/* Film Grain */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-white/70">Add Film Grain</span>
            <Switch
              checked={addGrain}
              onCheckedChange={setAddGrain}
              className="data-[state=checked]:bg-orange-500"
            />
          </div>

          {addGrain && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/40">Grain Intensity</span>
                <span className="text-xs text-white/60 font-mono">{grainIntensity}%</span>
              </div>
              <Slider
                min={0} max={100} step={1}
                value={[grainIntensity]}
                onValueChange={([v]) => setGrainIntensity(v)}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom Generate button */}
      <div className="p-4 border-t border-white/10">
        <motion.button
          onClick={onDownload}
          disabled={isGenerating}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:bg-orange-500/50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Generate Wallpaper
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}