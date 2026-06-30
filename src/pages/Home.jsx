import React, { useState, useRef, useEffect, useCallback } from "react";
import MobileControlSheet from "@/components/wallpaper/MobileControlSheet";
import UnifiedControlPanel from "@/components/wallpaper/UnifiedControlPanel";
import { generateWallpaper } from "@/lib/wallpaperGenerators";
import { Play, Pause, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const WALLPAPER_TYPES = [
  { id: "solid", label: "Solid Color" },
  { id: "linear", label: "Linear Gradient" },
  { id: "radial", label: "Radial Gradient" },
  { id: "twisted", label: "Twisted Gradient" },
  { id: "bilinear", label: "Bilinear Gradient" },
  { id: "plasma", label: "Plasma" },
  { id: "noise", label: "Blurred Noise" },
  { id: "conic", label: "Conic Gradient" },
  { id: "voronoi", label: "Voronoi" },
  { id: "stripes", label: "Stripes" },
  { id: "isolines", label: "Isolines" },
  { id: "flowfield", label: "Flow Field" },
  { id: "random", label: "Random" },
];

export const PRESET_THEMES = {
  Zen: ["#BEE9E8", "#D4ECD5", "#FCF6BD", "#FAF9F6"],
  Sunset: ["#FF6B6B", "#FF8E53", "#FF6B9D", "#C44569"],
  Ocean: ["#0099F7", "#00B4D8", "#48CAE4", "#023E8A"],
  Forest: ["#2D6A4F", "#40916C", "#74C69D", "#D8F3DC"],
  Fire: ["#E63946", "#F4A261", "#E76F51", "#FFBE0B"],
  Aurora: ["#7B2FBE", "#5E60CE", "#48CAE4", "#80FFDB"],
  Candy: ["#FF85A1", "#FFA3B1", "#FFCAD4", "#B5E2FA"],
  Autumn: ["#E76F51", "#F4A261", "#E9C46A", "#2A9D8F"],
  Monochrome: ["#1A1A2E", "#16213E", "#0F3460", "#533483"],
};

export const RESOLUTIONS = ["1366×768", "1920×1080", "2560×1440", "3840×2160"];

// Standalone HSL to Hex helper
function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs((h / 60) % 2 - 1));
  let m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
  let rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  let gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  let bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');
  return `#${rHex}${gHex}${bHex}`.toUpperCase();
}

const INITIAL_TYPES = ["linear", "radial", "twisted", "bilinear", "plasma", "noise", "conic", "voronoi", "stripes", "isolines", "flowfield"];

function getRandomWallpaperType() {
  return INITIAL_TYPES[Math.floor(Math.random() * INITIAL_TYPES.length)];
}

function getRandomDarkColors() {
  const baseH = Math.floor(Math.random() * 360);
  const baseS = 65 + Math.floor(Math.random() * 25); // 65-90%
  const colorsList = [];
  for (let i = 0; i < 6; i++) {
    const h = (baseH - 45 + i * 18 + 360) % 360;
    const s = Math.max(40, Math.min(100, baseS - Math.abs(2.5 - i) * 4));
    const l = 10 + Math.floor(Math.random() * 15); // 10% - 25% (somewhat dark)
    colorsList.push(hslToHex(h, s, l));
  }
  return colorsList;
}

export default function Home() {
  const [wallpaperType, setWallpaperType] = useState(() => getRandomWallpaperType());
  const [colors, setColors] = useState(() => getRandomDarkColors());
  const [resolution, setResolution] = useState("2560×1440");
  const [addGrain, setAddGrain] = useState(false);
  const [grainIntensity, setGrainIntensity] = useState(91);
  const [twist, setTwist] = useState(100);
  const [isGenerating, setIsGenerating] = useState(false);
  const [recentColors, setRecentColors] = useState([
    "#1A1B35", "#2C1B4D", "#121324", "#3A1A5E", "#0A0B1A", "#1D203F", "#7B2FBE", "#5E60CE"
  ]);

  // Splash Screen Intro state
  const [showSplash, setShowSplash] = useState(true);
  const [showControls, setShowControls] = useState(false);

  // Darkify smart dark overlay option state
  const [darkify, setDarkify] = useState(false);

  // Mobile layout detection
  const [isMobile, setIsMobile] = useState(false);

  // Background continuous movement state
  const [animateBg, setAnimateBg] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1.0);
  const timeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Hide splash screen after 6.5 seconds to align with reversed video duration
    const splashTimer = setTimeout(() => setShowSplash(false), 6500);
    // Fade in control panels shortly before splash ends
    const controlsTimer = setTimeout(() => setShowControls(true), 5800);
    return () => {
      clearTimeout(splashTimer);
      clearTimeout(controlsTimer);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const addRecentColor = (color) => {
    setRecentColors(prev => [color, ...prev.filter(c => c !== color)].slice(0, 8));
  };

  const applyPreset = (themeName) => setColors([...PRESET_THEMES[themeName]]);

  // Canvas drawing function (optimized preview vs. high-resolution export)
  const draw = useCallback((timeVal = 0, isExport = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    try {
      setIsGenerating(true);
      
      let w, h;
      if (isExport) {
        // High resolution for downloading
        [w, h] = resolution.replace("×", "x").split("x").map(Number);
      } else {
        // Preview resolution (for smooth animation frames)
        const dpr = window.devicePixelRatio || 1;
        // If animating, scale down to 0.35x for smooth 60fps. Otherwise, use 0.75x for a crisp preview.
        const scaleFactor = animateBg ? 0.35 : 0.75;
        
        w = Math.round(window.innerWidth * dpr * scaleFactor);
        h = Math.round(window.innerHeight * dpr * scaleFactor);
        
        // Safety clamp: do not render huge canvas during preview
        const maxDim = animateBg ? 640 : 1280;
        if (w > maxDim || h > maxDim) {
          const ratio = w / h;
          if (w > h) {
            w = maxDim;
            h = Math.round(maxDim / ratio);
          } else {
            h = maxDim;
            w = Math.round(maxDim * ratio);
          }
        }
      }
      
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get canvas context");
      
      generateWallpaper(ctx, w, h, wallpaperType, colors, { 
        addGrain, 
        grainIntensity, 
        twist,
        time: timeVal,
        darkify
      });
    } catch (error) {
      console.error("Canvas generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [wallpaperType, colors, resolution, addGrain, grainIntensity, twist, animateBg, darkify]);

  // RequestAnimationFrame loop
  useEffect(() => {
    let animId;
    
    const loop = (timestamp) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) * 0.001; // seconds
      lastTimeRef.current = timestamp;
      
      // Update running time based on speed
      timeRef.current += delta * animationSpeed;
      
      draw(timeRef.current, false);
      
      if (animateBg) {
        animId = requestAnimationFrame(loop);
      }
    };
    
    if (animateBg) {
      lastTimeRef.current = 0;
      animId = requestAnimationFrame(loop);
    } else {
      // Draw static once
      draw(timeRef.current, false);
    }
    
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [animateBg, animationSpeed, draw]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      setIsGenerating(true);
      // Temporarily draw at high export resolution
      draw(timeRef.current, true);
      
      const link = document.createElement("a");
      link.download = `chromaful-${wallpaperType}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      // Restore preview resolution
      draw(timeRef.current, false);
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectType = (t) => {
    if (t === "random") {
      const types = WALLPAPER_TYPES.filter(x => x.id !== "random");
      setWallpaperType(types[Math.floor(Math.random() * types.length)].id);
    } else {
      setWallpaperType(t);
    }
  };

  const handleResetMotion = () => {
    timeRef.current = 0;
    lastTimeRef.current = 0;
    draw(0, false);
  };

  return (
    <div 
      className="flex h-screen overflow-hidden relative"
      style={{
        background: "radial-gradient(circle at center, #181628 0%, #0d0c15 100%)",
      }}
    >
      {/* Full-screen canvas as background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ imageRendering: "auto" }}
      />

      {/* Control Panel and Corners (Fade-in after splash) */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.0 }}
            className="w-full h-full pointer-events-none absolute inset-0 z-30"
          >
            {isMobile ? (
              <MobileControlSheet
                wallpaperType={wallpaperType}
                setWallpaperType={handleSelectType}
                colors={colors}
                setColors={setColors}
                resolution={resolution}
                setResolution={setResolution}
                addGrain={addGrain}
                setAddGrain={setAddGrain}
                grainIntensity={grainIntensity}
                setGrainIntensity={setGrainIntensity}
                twist={twist}
                setTwist={setTwist}
                presets={PRESET_THEMES}
                resolutions={RESOLUTIONS}
                applyPreset={applyPreset}
                recentColors={recentColors}
                addRecentColor={addRecentColor}
                onDownload={handleDownload}
                isGenerating={isGenerating}
                animateBg={animateBg}
                setAnimateBg={setAnimateBg}
                animationSpeed={animationSpeed}
                setAnimationSpeed={setAnimationSpeed}
                wallpaperTypes={WALLPAPER_TYPES}
                darkify={darkify}
                setDarkify={setDarkify}
              />
            ) : (
              <UnifiedControlPanel
                wallpaperType={wallpaperType}
                setWallpaperType={handleSelectType}
                colors={colors}
                setColors={setColors}
                resolution={resolution}
                setResolution={setResolution}
                addGrain={addGrain}
                setAddGrain={setAddGrain}
                grainIntensity={grainIntensity}
                setGrainIntensity={setGrainIntensity}
                twist={twist}
                setTwist={setTwist}
                presets={PRESET_THEMES}
                resolutions={RESOLUTIONS}
                applyPreset={applyPreset}
                recentColors={recentColors}
                addRecentColor={addRecentColor}
                onDownload={handleDownload}
                isGenerating={isGenerating}
                animateBg={animateBg}
                setAnimateBg={setAnimateBg}
                animationSpeed={animationSpeed}
                setAnimationSpeed={setAnimationSpeed}
                wallpaperTypes={WALLPAPER_TYPES}
                onResetMotion={handleResetMotion}
                darkify={darkify}
                setDarkify={setDarkify}
              />
            )}

            {/* FLOATING CORNER MOTION CONTROLS (Bottom Left - Desktop Only) */}
            {!isMobile && (
              <div className="fixed bottom-6 left-6 z-40 flex items-center gap-2.5 pointer-events-auto select-none">
                {/* Reset Motion Button */}
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={handleResetMotion}
                  className="w-10 h-10 rounded-full border border-white/20 text-white/90 flex items-center justify-center shadow-lg transition-colors hover:bg-white/5"
                  style={{
                    background: "rgba(15, 15, 15, 0.55)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                  }}
                  title="Reset Animation Position"
                >
                  <RotateCcw className="w-4 h-4" />
                </motion.button>

                {/* Play/Pause Motion Button */}
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setAnimateBg(!animateBg)}
                  className={cn(
                    "w-10 h-10 rounded-full border text-white flex items-center justify-center shadow-lg transition-colors",
                    animateBg ? "bg-orange-500 border-orange-500/20 shadow-orange-500/20" : "border-white/20 hover:bg-white/5"
                  )}
                  style={{
                    background: animateBg ? undefined : "rgba(15, 15, 15, 0.55)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                  }}
                  title={animateBg ? "Pause Animation" : "Play Animation"}
                >
                  {animateBg ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intro Logo Splash Screen */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1.0, ease: "easeInOut" } }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
          >
            {/* Logo container */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.05, opacity: 0 }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 flex flex-col items-center gap-6 w-full max-w-5xl px-4 md:px-8"
            >
              {/* Very large intro video */}
              <div className="relative w-full aspect-[1050/410] bg-black">
                <video
                  src="/intro-reversed.mp4"
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}