import React from "react";
import { cn } from "@/lib/utils";

// Type-specific colored dot icons matching the macOS app
const TYPE_DOT_COLORS = {
  solid:     "bg-blue-400",
  linear:    "bg-purple-400",
  radial:    "bg-red-400",
  twisted:   "bg-orange-400",
  bilinear:  "bg-slate-400",
  plasma:    "bg-cyan-400",
  noise:     "bg-blue-300",
  conic:     "bg-green-400",
  voronoi:   "bg-green-500",
  stripes:   "bg-red-400",
  isolines:  "bg-slate-300",
  flowfield: "bg-teal-400",
  random:    "bg-pink-400",
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

export default function Sidebar({ wallpaperTypes, selected, onSelect }) {
  return (
    <div
      className="w-full md:w-48 h-full md:h-auto flex flex-col shrink-0 overflow-y-auto md:overflow-y-visible max-h-screen md:max-h-full"
      style={{
        background: "rgba(18, 14, 30, 0.80)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRight: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="px-4 pt-4 pb-3">
        <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">Wallpaper Types</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {wallpaperTypes.map((type) => {
          const isSelected = selected === type.id;
          return (
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 mb-0.5 text-left active:scale-95",
                isSelected
                  ? "bg-orange-500 text-white font-medium shadow-lg"
                  : "text-white/65 hover:bg-white/10 hover:text-white active:bg-white/20"
              )}
            >
              <span
                className={cn(
                  "w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[10px] shrink-0",
                  isSelected ? "text-white" : TYPE_DOT_COLORS[type.id]
                )}
                style={!isSelected ? { color: undefined } : undefined}
              >
                {/* Colored dot for unselected, white for selected */}
                {isSelected ? (
                  <span className="text-white text-[10px]">{TYPE_ICON_SHAPE[type.id]}</span>
                ) : (
                  <span className={cn("text-[10px]", TYPE_DOT_COLORS[type.id].replace("bg-", "text-"))}>
                    {TYPE_ICON_SHAPE[type.id]}
                  </span>
                )}
              </span>
              <span className="truncate">{type.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}