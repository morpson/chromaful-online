import React, { useState } from "react";
import { Shuffle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import ColorSwatch from "./ColorSwatch";

const MAX_COLORS = {
  solid: 1,
  linear: 5,
  radial: 5,
  conic: 5,
  bilinear: 4,
  plasma: 4,
  noise: 3,
  voronoi: 5,
  stripes: 5,
  isolines: 3,
  flowfield: 3,
  twisted: 4,
};

const MIN_COLORS = {
  solid: 1,
  linear: 2,
  radial: 2,
  conic: 2,
  bilinear: 4,
  plasma: 2,
  noise: 2,
  voronoi: 2,
  stripes: 2,
  isolines: 2,
  flowfield: 2,
  twisted: 2,
};

function randomHex() {
  return "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
}

export default function ControlPanel({
  wallpaperType, colors, setColors, resolution, setResolution,
  addGrain, setAddGrain, grainIntensity, setGrainIntensity,
  twist, setTwist, presets, resolutions, applyPreset,
  recentColors, addRecentColor,
}) {
  const [editingIndex, setEditingIndex] = useState(null);

  const maxColors = MAX_COLORS[wallpaperType] ?? 5;
  const minColors = MIN_COLORS[wallpaperType] ?? 2;

  // Clamp colors to valid range for this type
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
    if (clampedColors.length < maxColors) {
      setColors([...clampedColors, randomHex()]);
    }
  };

  const removeColor = (idx) => {
    if (clampedColors.length > minColors) {
      const next = clampedColors.filter((_, i) => i !== idx);
      setColors(next);
    }
  };

  const randomize = () => {
    const next = clampedColors.map(() => randomHex());
    setColors(next);
  };

  const showTwist = ["twisted", "plasma", "flowfield", "isolines"].includes(wallpaperType);

  return (
    <div className="w-72 bg-[#12121f] border-l border-white/10 flex flex-col overflow-y-auto shrink-0 text-sm">
      {/* Colors section */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-white/70 uppercase tracking-widest">
            {wallpaperType === "solid" ? "Color" : `Gradient Colors (${clampedColors.length})`}
          </span>
          <button
            onClick={randomize}
            className="text-white/40 hover:text-white transition-colors p-1 rounded"
            title="Randomize colors"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {clampedColors.map((color, idx) => (
            <ColorSwatch
              key={idx}
              color={color}
              index={idx}
              canRemove={clampedColors.length > minColors && wallpaperType !== "bilinear"}
              onRemove={() => removeColor(idx)}
              onChange={(val) => updateColor(idx, val)}
            />
          ))}
          {clampedColors.length < maxColors && wallpaperType !== "bilinear" && (
            <button
              onClick={addColor}
              className="w-9 h-9 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-white/40 hover:text-white hover:border-white/40 transition-all text-lg leading-none"
            >
              +
            </button>
          )}
        </div>

        {/* Preset themes */}
        <div className="mb-1">
          <p className="text-xs text-white/40 mb-2 uppercase tracking-widest">Presets</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(presets).map(([name, themeColors]) => (
              <button
                key={name}
                onClick={() => applyPreset(name)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 hover:bg-white/15 transition-all text-xs text-white/70 hover:text-white"
              >
                <div className="flex">
                  {themeColors.slice(0, 3).map((c, i) => (
                    <div
                      key={i}
                      className="w-2.5 h-2.5 rounded-full border border-black/20"
                      style={{ backgroundColor: c, marginLeft: i > 0 ? "-3px" : 0 }}
                    />
                  ))}
                </div>
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent colors */}
      <div className="p-4 border-b border-white/10">
        <p className="text-xs text-white/40 mb-2 uppercase tracking-widest">Recent Colors</p>
        <div className="flex flex-wrap gap-1.5">
          {recentColors.map((color, i) => (
            <button
              key={i}
              onClick={() => {
                const next = [...clampedColors];
                next[0] = color;
                setColors(next);
              }}
              className="w-7 h-7 rounded-full border-2 border-transparent hover:border-white/60 transition-all"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Twist / amount */}
      {showTwist && (
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-white/40 uppercase tracking-widest">
              {wallpaperType === "twisted" ? "Twist Amount" : "Complexity"}
            </p>
            <span className="text-xs text-white/60 font-mono">{twist}</span>
          </div>
          <Slider
            min={0}
            max={200}
            step={1}
            value={[twist]}
            onValueChange={([v]) => setTwist(v)}
            className="w-full"
          />
        </div>
      )}

      {/* Resolution */}
      <div className="p-4 border-b border-white/10">
        <p className="text-xs text-white/40 mb-2 uppercase tracking-widest">Resolution</p>
        <div className="grid grid-cols-2 gap-1.5">
          {resolutions.map((res) => (
            <button
              key={res}
              onClick={() => setResolution(res)}
              className={`px-2 py-1.5 rounded text-xs transition-all ${
                resolution === res
                  ? "bg-orange-500 text-white font-medium"
                  : "bg-white/5 text-white/60 hover:bg-white/15 hover:text-white"
              }`}
            >
              {res}
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="p-4">
        <p className="text-xs text-white/40 mb-3 uppercase tracking-widest">Options</p>
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/70 text-sm">Add Film Grain</span>
          <Switch
            checked={addGrain}
            onCheckedChange={setAddGrain}
            className="data-[state=checked]:bg-orange-500"
          />
        </div>
        {addGrain && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/40">Grain Intensity</span>
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
  );
}