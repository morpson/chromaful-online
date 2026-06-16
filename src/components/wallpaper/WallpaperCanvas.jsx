import React, { useRef, useEffect, useCallback } from "react";
import { generateWallpaper } from "@/lib/wallpaperGenerators";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WallpaperCanvas({ wallpaperType, colors, resolution, addGrain, grainIntensity, twist }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const [w, h] = resolution.replace("×", "x").split("x").map(Number);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    generateWallpaper(ctx, w, h, wallpaperType, colors, { addGrain, grainIntensity, twist });
  }, [wallpaperType, colors, resolution, addGrain, grainIntensity, twist]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `chromaful-${wallpaperType}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col min-h-0 bg-[#0d0d1a]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <span className="text-xs text-white/50 font-mono">{resolution}</span>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={draw}
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-7 px-3"
          >
            Preview
          </Button>
          <Button
            size="sm"
            onClick={handleDownload}
            className="bg-orange-500 hover:bg-orange-400 text-white text-xs h-7 px-3"
          >
            <Download className="w-3 h-3 mr-1" />
            Download
          </Button>
        </div>
      </div>

      {/* Canvas preview area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden min-h-0">
        <div
          className="relative rounded-xl overflow-hidden shadow-2xl shadow-black/60"
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            aspectRatio: (() => {
              const [w, h] = resolution.replace("×", "x").split("x").map(Number);
              return `${w}/${h}`;
            })(),
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </div>
      </div>
    </div>
  );
}