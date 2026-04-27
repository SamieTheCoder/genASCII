"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Terminal,
  Share2,
  Code,
  Trash2,
  Camera,
  ClipboardPaste,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Upload,
} from "lucide-react";
import Link from "next/link";
import {
  asciifyWebcam,
  imageToAsciiFrame,
  renderFrameToCanvas,
  DEFAULT_OPTIONS,
  ART_STYLE_PRESETS,
  CHARSETS,
  CHARSET_SEQUENCES,
  HOVER_PRESETS,
} from "asciify-engine";

type SliderKey = "detail" | "brightness" | "contrast" | "spacing" | "dither";
type ColorChoice = "auto" | "grayscale" | "fullcolor" | "matrix" | "accent";
type CharsetChoice = "auto" | keyof typeof CHARSETS;

const artStyles = [
  "classic", "particles", "letters", "claudeCode", "art", "terminal",
  "box", "lines", "braille", "katakana", "musical", "emoji",
  "circles", "shadows", "starfield", "geometric", "pipes", "waves", "shards", "smoke",
] as const;

const animationStyles = [
  "none", "breathe", "pulse", "wave", "spiral", "rain",
  "ripple", "orbit", "sparkle", "glitch", "typewriter", "scatter", "melt", "cellular",
] as const;

const charsetKeys = Object.keys(CHARSETS);
const charsetLabels: Record<string, string> = {
  standard: "Standard", blocks: "Blocks", minimal: "Minimal", dense: "Dense",
  binary: "Binary", dots: "Dots", letters: "Letters", claudeCode: "Claude Code",
  box: "Box", lines: "Lines", braille: "Braille", katakana: "Katakana",
  musical: "Musical", emoji: "Emoji", circles: "Circles", shadows: "Shadows",
  starfield: "Starfield", geometric: "Geometric", pipes: "Pipes", waves: "Waves",
  shards: "Shards", smoke: "Smoke",
};

const sequenceOptions = ["off", ...Object.keys(CHARSET_SEQUENCES)] as const;
const hoverKeys = Object.keys(HOVER_PRESETS);
const chromaModes = ["off", "greenScreen", "blueScreen", "custom"] as const;

const CANVAS_DISPLAY_W = 640;
const CANVAS_DISPLAY_H = 480;
const MAX_OUTPUT_COLS = 756;
const MAX_OUTPUT_ROWS = 554;

const artStyleLabel: Record<string, string> = {
  classic: "CLASSIC", particles: "DOTS", letters: "LETTERS", claudeCode: "CODE",
  art: "ART", terminal: "TERMINAL", box: "BOX", lines: "LINES",
  braille: "BRAILLE", katakana: "KATAKANA", musical: "MUSICAL", emoji: "EMOJI",
  circles: "CIRCLES", shadows: "SHADOWS", starfield: "STARFIELD", geometric: "GEOMETRIC",
  pipes: "PIPES", waves: "WAVES", shards: "SHARDS", smoke: "SMOKE",
};

export default function PlaygroundEditor() {
  const [sourceFile, setSourceFile] = useState<string | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [embedCode, setEmbedCode] = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [fps, setFps] = useState(0);
  const [canvasRes, setCanvasRes] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(100);
  const [aspectMode, setAspectMode] = useState("auto");
  const [isWebcamActive, setIsWebcamActive] = useState(false);

  const [activeStyle, setActiveStyle] = useState<typeof artStyles[number]>("classic");
  const [activeColor, setActiveColor] = useState<ColorChoice>("auto");
  const [sliders, setSliders] = useState<Record<SliderKey, number>>({
    detail: 10, brightness: 0, contrast: 0, spacing: 1, dither: 0,
  });
  const [invert, setInvert] = useState(false);

  const [showAnimation, setShowAnimation] = useState(false);
  const [showCharacters, setShowCharacters] = useState(false);
  const [showHover, setShowHover] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [animationStyle, setAnimationStyle] = useState<typeof animationStyles[number]>("none");
  const [animationSpeed, setAnimationSpeed] = useState(1);

  const [selectedCharset, setSelectedCharset] = useState<CharsetChoice>("auto");
  const [selectedSequence, setSelectedSequence] = useState<string>("off");
  const [customText, setCustomText] = useState("");
  const [showCharsetDropdown, setShowCharsetDropdown] = useState(false);

  const [activeHover, setActiveHover] = useState<string>("none");
  const [chromaMode, setChromaMode] = useState<typeof chromaModes[number]>("off");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const webcamCleanupRef = useRef<(() => void) | null>(null);
  const animationRafRef = useRef<number | null>(null);
  const frameResultRef = useRef<ReturnType<typeof imageToAsciiFrame> | null>(null);
  const renderSizeRef = useRef<{ w: number; h: number } | null>(null);
  const currentOptsRef = useRef<ReturnType<typeof buildOptions> | null>(null);
  const processTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastImageSrc = useRef<string | null>(null);

  const colorModeLabels = ["Auto", "Gray", "Full", "Matrix", "Accent"] as const;
  const colorModeMap: Record<string, ColorChoice> = {
    Auto: "auto",
    Gray: "grayscale",
    Full: "fullcolor",
    Matrix: "matrix",
    Accent: "accent",
  };

  const detailToFontSize = useCallback((detail: number) => {
    // Closer to asciify.org behavior: detail 10 ~ 6.5px, detail 1 ~ 1.5px
    return Math.max(1.2, +(1 + detail * 0.55).toFixed(2));
  }, []);

  const stopAnimationLoop = useCallback(() => {
    if (animationRafRef.current !== null) {
      cancelAnimationFrame(animationRafRef.current);
      animationRafRef.current = null;
    }
  }, []);

  const drawScaledPreview = useCallback(() => {
    if (!canvasRef.current || !displayCanvasRef.current) return;
    const displayCanvas = displayCanvasRef.current;
    const displayCtx = displayCanvas.getContext("2d");
    if (!displayCtx) return;

    const srcW = canvasRef.current.width;
    const srcH = canvasRef.current.height;
    if (!srcW || !srcH) return;

    displayCanvas.width = CANVAS_DISPLAY_W;
    displayCanvas.height = CANVAS_DISPLAY_H;
    displayCtx.clearRect(0, 0, CANVAS_DISPLAY_W, CANVAS_DISPLAY_H);

    const scale = Math.min(CANVAS_DISPLAY_W / srcW, CANVAS_DISPLAY_H / srcH);
    const drawW = Math.floor(srcW * scale);
    const drawH = Math.floor(srcH * scale);
    const x = Math.floor((CANVAS_DISPLAY_W - drawW) / 2);
    const y = Math.floor((CANVAS_DISPLAY_H - drawH) / 2);
    displayCtx.drawImage(canvasRef.current, x, y, drawW, drawH);
  }, []);

  const getTargetRenderSize = useCallback(
    (sourceW: number, sourceH: number, fontSize: number, charSpacing: number, charAspect: number) => {
      const cellW = Math.max(1, fontSize * charSpacing);
      const cellH = Math.max(1, (fontSize / charAspect) * charSpacing);

      const baseCols = Math.max(1, Math.floor(sourceW / cellW));
      const baseRows = Math.max(1, Math.floor(sourceH / cellH));
      const clampScale = Math.min(1, MAX_OUTPUT_COLS / baseCols, MAX_OUTPUT_ROWS / baseRows);

      const cols = Math.max(1, Math.floor(baseCols * clampScale));
      const rows = Math.max(1, Math.floor(baseRows * clampScale));

      return {
        cols,
        rows,
        targetW: Math.max(1, Math.floor(cols * cellW)),
        targetH: Math.max(1, Math.floor(rows * cellH)),
      };
    },
    []
  );

  // Build options from current settings
  const buildOptions = useCallback(() => {
    const artPreset = ART_STYLE_PRESETS[activeStyle as keyof typeof ART_STYLE_PRESETS] || ART_STYLE_PRESETS.classic;
    const fontSize = detailToFontSize(sliders.detail);
    const sequence = selectedSequence !== "off" ? CHARSET_SEQUENCES[selectedSequence as keyof typeof CHARSET_SEQUENCES] : undefined;
    const hoverPreset = HOVER_PRESETS[activeHover as keyof typeof HOVER_PRESETS]?.options;

    const options = {
      ...DEFAULT_OPTIONS,
      ...artPreset,
      fontSize,
      charSpacing: sliders.spacing,
      brightness: sliders.brightness,
      contrast: sliders.contrast,
      invert,
      animationStyle,
      animationSpeed,
      ditherStrength: sliders.dither as 0 | number,
      normalize: true,
      artStyle: activeStyle as "classic" | "particles" | "letters" | "claudeCode" | "art" | "terminal" | "box" | "lines" | "braille" | "katakana" | "musical" | "emoji" | "circles" | "shadows" | "starfield" | "geometric" | "pipes" | "waves" | "shards" | "smoke",
      customText: customText.trim(),
      ...(hoverPreset || {}),
      chromaKey: chromaMode === "greenScreen" ? true : chromaMode === "blueScreen" ? "blue-screen" : null,
      charsetFrames: sequence,
      charsetFps: sequence ? 2 : undefined,
    };

    if (activeColor !== "auto") {
      options.colorMode = activeColor;
    }
    if (selectedCharset !== "auto") {
      options.charset = CHARSETS[selectedCharset as keyof typeof CHARSETS] || options.charset;
    }

    return options;
  }, [sliders, activeColor, activeStyle, selectedCharset, animationStyle, animationSpeed, invert, customText, activeHover, chromaMode, selectedSequence, detailToFontSize]);

  // Calculate output resolution based on canvas dimensions and fontSize
  const getOutputDimensions = useCallback(() => {
    const fontSize = detailToFontSize(sliders.detail);
    const previewW = 1920;
    const previewH = 1080;
    const { cols, rows, targetW: w, targetH: h } = getTargetRenderSize(
      previewW,
      previewH,
      fontSize,
      sliders.spacing,
      0.55
    );
    return { cols, rows, w, h };
  }, [sliders, detailToFontSize, getTargetRenderSize]);

  // Process image with current settings
  const processImage = useCallback((imageSrc: string) => {
    if (!canvasRef.current || !hiddenCanvasRef.current || !displayCanvasRef.current) return;

    const canvas = canvasRef.current;
    const hiddenCanvas = hiddenCanvasRef.current;
    const hiddenCtx = hiddenCanvas.getContext("2d");
    if (!hiddenCtx) return;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setIsProcessing(true);
      lastImageSrc.current = imageSrc;
      stopAnimationLoop();

      const startedAt = performance.now();
      const opts = buildOptions();
      currentOptsRef.current = opts;

      hiddenCanvas.width = img.naturalWidth;
      hiddenCanvas.height = img.naturalHeight;
      hiddenCtx.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
      hiddenCtx.drawImage(img, 0, 0);

      const { targetW, targetH } = getTargetRenderSize(
        img.naturalWidth,
        img.naturalHeight,
        opts.fontSize,
        opts.charSpacing,
        opts.charAspect
      );

      const result = imageToAsciiFrame(hiddenCanvas, opts, targetW, targetH);
      frameResultRef.current = result;
      renderSizeRef.current = { w: targetW, h: targetH };

      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsProcessing(false);
        return;
      }
      ctx.clearRect(0, 0, targetW, targetH);
      renderFrameToCanvas(ctx, result.frame, opts, targetW, targetH, performance.now());

      drawScaledPreview();
      setCanvasRes({ w: result.cols, h: result.rows });
      setEmbedCode(JSON.stringify(result.frame));

      const elapsed = Math.max(1, performance.now() - startedAt);
      setFps(Math.round(1000 / elapsed));

      const shouldAnimate = opts.animationStyle !== "none" || !!opts.charsetFrames;
      if (shouldAnimate) {
        const tick = () => {
          if (!canvasRef.current || !frameResultRef.current || !renderSizeRef.current || !currentOptsRef.current) return;
          const renderCtx = canvasRef.current.getContext("2d");
          if (!renderCtx) return;
          renderFrameToCanvas(
            renderCtx,
            frameResultRef.current.frame,
            currentOptsRef.current,
            renderSizeRef.current.w,
            renderSizeRef.current.h,
            performance.now()
          );
          drawScaledPreview();
          animationRafRef.current = requestAnimationFrame(tick);
        };
        animationRafRef.current = requestAnimationFrame(tick);
      }

      setIsProcessing(false);
    };
    img.src = imageSrc;
  }, [buildOptions, drawScaledPreview, getTargetRenderSize, stopAnimationLoop]);

  // Re-process when settings change (debounced)
  useEffect(() => {
    if (!lastImageSrc.current || webcamCleanupRef.current) return;
    if (processTimerRef.current) clearTimeout(processTimerRef.current);
    processTimerRef.current = setTimeout(() => {
      if (lastImageSrc.current) processImage(lastImageSrc.current);
    }, 200);
    return () => { if (processTimerRef.current) clearTimeout(processTimerRef.current); };
  }, [activeStyle, activeColor, sliders, invert, selectedCharset, animationStyle, animationSpeed, customText, activeHover, chromaMode, processImage]);

  useEffect(() => {
    return () => {
      stopAnimationLoop();
      if (webcamCleanupRef.current) {
        webcamCleanupRef.current();
      }
    };
  }, [stopAnimationLoop]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setSourceFile(src);
      setSourceFileName(file.name);
      lastImageSrc.current = src;
      processImage(src);
    };
    reader.readAsDataURL(file);
  }, [processImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handlePaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const file = new File([blob], "pasted.png", { type });
            handleFileSelect(file);
            return;
          }
        }
      }
    } catch {
      fileInputRef.current?.click();
    }
  }, [handleFileSelect]);

  const handleWebcam = useCallback(async () => {
    if (webcamCleanupRef.current) {
      webcamCleanupRef.current();
      webcamCleanupRef.current = null;
      setIsWebcamActive(false);
      setSourceFile(null);
      setSourceFileName(null);
      lastImageSrc.current = null;
      return;
    }
    if (!displayCanvasRef.current) return;
    try {
      setSourceFileName("WEBCAM");
      const cleanup = await asciifyWebcam(displayCanvasRef.current, buildOptions());
      webcamCleanupRef.current = cleanup;
      setIsWebcamActive(true);
      setFps(60);
    } catch (err) {
      console.error("Webcam error:", err);
      setSourceFileName(null);
      setIsWebcamActive(false);
    }
  }, [buildOptions]);

  const handleClear = useCallback(() => {
    if (webcamCleanupRef.current) {
      webcamCleanupRef.current();
      webcamCleanupRef.current = null;
    }
    setIsWebcamActive(false);
    setSourceFile(null);
    setSourceFileName(null);
    setEmbedCode(null);
    setFps(0);
    setCanvasRes(null);
    frameResultRef.current = null;
    renderSizeRef.current = null;
    currentOptsRef.current = null;
    stopAnimationLoop();
    lastImageSrc.current = null;
  }, [stopAnimationLoop]);

  const handleExportPNG = useCallback(() => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "asciify-output.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }, []);

  const handleShare = useCallback(() => {
    if (!displayCanvasRef.current) return;
    displayCanvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "asciify.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        navigator.share({ files: [file] });
      } else {
        const link = document.createElement("a");
        link.download = "asciify-output.png";
        link.href = URL.createObjectURL(blob);
        link.click();
      }
    }, "image/png");
  }, []);

  const handleCodeClick = useCallback(() => {
    if (embedCode) {
      navigator.clipboard.writeText(embedCode);
      setShowCodeModal(true);
      setTimeout(() => setShowCodeModal(false), 2000);
    }
  }, [embedCode]);

  const { cols: currentCols, rows: currentRows } = getOutputDimensions();

  return (
    <div className="h-screen w-full bg-[#050505] text-white font-mono text-xs selection:bg-[#ccff00] selection:text-black flex flex-col overflow-hidden">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            ::-webkit-scrollbar { width: 12px; border-left: 4px solid #ccff00; }
            ::-webkit-scrollbar-track { background: #050505; }
            ::-webkit-scrollbar-thumb { background: #ccff00; border: 2px solid black; }
            ::-webkit-scrollbar-thumb:hover { background: white; }
            input[type=range] { -webkit-appearance: none; width: 100%; background: transparent; }
            input[type=range]:focus { outline: none; }
            input[type=range]::-webkit-slider-thumb {
              -webkit-appearance: none; height: 18px; width: 10px;
              background: #ccff00; cursor: pointer; margin-top: -6px;
              border: 2px solid white;
            }
            input[type=range]::-webkit-slider-runnable-track {
              width: 100%; height: 6px; cursor: pointer;
              background: #050505; border: 2px solid white;
            }
            .dropdown-panel { position: absolute; top: 100%; left: 0; right: 0; z-index: 100; background: #111; border: 2px solid #ccff00; max-height: 200px; overflow-y: auto; }
          `,
        }}
      />

      {/* Top Nav */}
      <nav className="h-16 border-b-4 border-white bg-[#050505] flex justify-between items-stretch shrink-0 z-20 relative">
        <div className="flex items-stretch h-full">
          <Link href="/" className="flex items-center gap-3 px-6 border-r-4 border-white hover:bg-[#ccff00] hover:text-black transition-colors cursor-pointer group h-full">
            <div className="bg-white text-black p-1 group-hover:bg-black group-hover:text-[#ccff00] border-2 border-transparent group-hover:border-black transition-colors">
              <Terminal size={18} />
            </div>
            <span className="font-black text-xl tracking-tighter">ASCIIFY</span>
          </Link>
          <div className="hidden md:flex items-center h-full text-[10px] uppercase font-bold tracking-widest">
            {["SHOWCASE", "BACKGROUNDS", "TEXT", "DOCS"].map((item) => (
              <a key={item} href="#" className="flex items-center h-full px-6 border-r-4 border-white hover:bg-white hover:text-black transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-stretch uppercase font-bold tracking-widest text-[10px]">
          <span className="flex items-center px-6 border-l-4 border-white text-[#ccff00]">
            FPS: {fps} | {canvasRes ? `${canvasRes.w}×${canvasRes.h}` : "—"}
          </span>
          <a href="#" className="flex items-center px-6 border-l-4 border-white hover:bg-white hover:text-black transition-colors">NPM / GITHUB</a>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:flex w-[320px] border-r-4 border-white flex-col bg-[#050505] overflow-y-auto shrink-0 relative z-10">

          {/* SOURCE */}
          <div className="p-6 border-b-4 border-white">
            <div className="flex items-center justify-between mb-4 font-black uppercase tracking-widest text-sm text-[#ccff00]">
              <span>{"// Source"}</span>
            </div>
            {sourceFileName ? (
              <div className="border-4 border-white bg-black p-4 mb-3 shadow-[4px_4px_0px_0px_#ff00ff]">
                <div className="flex items-center justify-between">
                  <span className="text-[#ccff00] truncate max-w-[160px] text-[11px] uppercase tracking-wider">{sourceFileName}</span>
                  <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold uppercase tracking-wider text-[#ff00ff] hover:text-white">REPLACE</button>
                </div>
              </div>
            ) : (
              <div
                className="border-4 border-white bg-black p-6 flex flex-col items-center justify-center text-center mb-3 shadow-[4px_4px_0px_0px_#ff00ff] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#ff00ff] cursor-pointer transition-all"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <Upload size={18} className="mb-2 text-[#555]" />
                <p className="mb-2 font-bold uppercase text-[10px]">DROP, PASTE, OR <span className="text-[#ccff00] underline">BROWSE</span></p>
                <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">JPG/PNG/HEIC &lt;= 25 MB<br />GIF/VIDEO &lt;= 50 MB</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={handlePaste} className="flex-1 py-3 border-2 border-white bg-black flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-[10px] hover:bg-white hover:text-black transition-colors shadow-[4px_4px_0px_0px_#fff] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
                <ClipboardPaste size={16} /> PASTE CLIPBOARD
              </button>
              <button onClick={handleWebcam} className={`flex-1 py-3 border-2 font-bold uppercase tracking-wider text-[10px] transition-colors ${isWebcamActive ? "border-[#ccff00] text-[#ccff00] shadow-[4px_4px_0px_0px_#ccff00] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none bg-black" : "border-white text-white bg-black hover:bg-[#ccff00] hover:text-black hover:border-[#ccff00] shadow-[4px_4px_0px_0px_#ccff00] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"}`}>
                <Camera size={16} className="inline mr-1" /> {isWebcamActive ? "STOP" : "USE WEBCAM"}
              </button>
            </div>
          </div>

          {/* STYLE */}
          <div className="p-6 border-b-4 border-white bg-[#111]">
            <div className="flex items-center justify-between mb-5 font-black uppercase tracking-widest text-sm text-white cursor-pointer hover:text-[#ccff00]">
              <span>{"// Style"}</span>
              <ChevronDown size={18} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {artStyles.map((style) => (
                <button
                  key={style}
                  onClick={() => setActiveStyle(style)}
                  className={`py-2 px-2 border-2 font-bold text-[10px] uppercase tracking-wider transition-all ${activeStyle === style ? "border-[#ccff00] bg-[#ccff00] text-black shadow-[2px_2px_0px_0px_#fff]" : "border-white/30 text-gray-400 hover:border-white hover:text-white hover:bg-white/5"}`}
                >
                  {artStyleLabel[style]}
                </button>
              ))}
            </div>
          </div>

          {/* LOOK */}
          <div className="p-6 border-b-4 border-white">
            <div className="flex items-center justify-between mb-6 font-black uppercase tracking-widest text-sm text-[#00ffff] cursor-pointer hover:text-white">
              <span>{"// Look"}</span>
              <ChevronDown size={18} />
            </div>
            <div className="space-y-6">
              {/* Detail */}
              <div>
                <div className="flex justify-between mb-2 uppercase font-bold tracking-widest text-[10px]">
                  <span className="text-gray-300">DETAIL</span>
                  <span className="text-white bg-black border-2 border-white px-2 py-0.5">{detailToFontSize(sliders.detail).toFixed(1)}PX</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={sliders.detail}
                  onChange={(e) => setSliders((prev) => ({ ...prev, detail: parseInt(e.target.value) }))}
                />
                <div className="text-[9px] text-gray-500 mt-1 uppercase tracking-widest">
                  Output: {canvasRes ? `${canvasRes.w}×${canvasRes.h}` : `${currentCols}×${currentRows} chars`}
                </div>
              </div>
              {/* Brightness */}
              <div>
                <div className="flex justify-between mb-2 uppercase font-bold tracking-widest text-[10px]">
                  <span className="text-gray-300">BRIGHTNESS</span>
                  <span className="text-white bg-black border-2 border-white px-2 py-0.5">{sliders.brightness >= 0 ? `+${sliders.brightness.toFixed(2)}` : sliders.brightness.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.01}
                  value={sliders.brightness}
                  onChange={(e) => setSliders((prev) => ({ ...prev, brightness: parseFloat(e.target.value) }))}
                />
              </div>
              {/* Contrast */}
              <div>
                <div className="flex justify-between mb-2 uppercase font-bold tracking-widest text-[10px]">
                  <span className="text-gray-300">CONTRAST</span>
                  <span className="text-white bg-black border-2 border-white px-2 py-0.5">{sliders.contrast >= 0 ? `+${sliders.contrast.toFixed(2)}` : sliders.contrast.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.01}
                  value={sliders.contrast}
                  onChange={(e) => setSliders((prev) => ({ ...prev, contrast: parseFloat(e.target.value) }))}
                />
              </div>
              {/* Invert */}
              <div className="flex justify-between items-center uppercase font-bold tracking-widest text-[10px] pt-4">
                <span className="text-gray-300">INVERT</span>
                <div
                  className={`w-14 h-7 border-2 border-white relative cursor-pointer transition-colors ${invert ? "bg-[#ff00ff]" : "bg-black"}`}
                  onClick={() => setInvert((p) => !p)}
                >
                  <div className={`absolute top-0 w-6 h-full bg-white transition-all ${invert ? "left-7" : "left-0"}`} style={{ borderLeft: invert ? "2px solid #050505" : undefined, borderRight: invert ? undefined : "2px solid #050505" }} />
                </div>
              </div>
              {/* Color */}
              <div className="pt-4">
                <div className="mb-3 uppercase font-bold tracking-widest text-[10px] text-gray-300">COLOR</div>
                <div className="flex gap-2">
                  {colorModeLabels.map((label) => (
                    <button
                      key={label}
                      onClick={() => setActiveColor(colorModeMap[label])}
                      className={`flex-1 py-2 border-2 font-bold transition-all text-[9px] uppercase tracking-wider ${activeColor === colorModeMap[label] ? "border-[#ff00ff] bg-[#ff00ff] text-white shadow-[2px_2px_0px_0px_#fff]" : "border-white/30 text-gray-400 hover:border-white hover:text-white"}`}
                    >
                      {label.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ANIMATION */}
          <div className="border-b-4 border-white">
            <button className="w-full p-6 flex items-center justify-between font-black uppercase tracking-widest text-sm text-[#888] hover:text-[#ccff00] cursor-pointer" onClick={() => setShowAnimation(!showAnimation)}>
              <span>ANIMATION</span>
              {showAnimation ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {showAnimation && (
              <div className="px-6 pb-6">
                <div className="grid grid-cols-4 gap-1.5">
                  {animationStyles.map((style) => (
                    <button
                      key={style}
                      onClick={() => setAnimationStyle(style)}
                      className={`py-1.5 px-1 border-2 font-bold text-[9px] uppercase tracking-wider transition-all ${animationStyle === style ? "border-[#ccff00] bg-[#ccff00] text-black" : "border-white/30 text-gray-400 hover:border-white hover:text-white"}`}
                    >
                      {style === "none" ? "OFF" : style.charAt(0).toUpperCase() + style.slice(1)}
                    </button>
                  ))}
                </div>
                {animationStyle !== "none" && (
                  <div className="mt-4">
                    <div className="flex justify-between mb-2 uppercase font-bold tracking-widest text-[10px]">
                      <span className="text-gray-300">SPEED</span>
                      <span className="text-white bg-black border-2 border-white px-2 py-0.5">{animationSpeed.toFixed(1)}x</span>
                    </div>
                    <input type="range" min={0.1} max={5} step={0.1} value={animationSpeed} onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CHARACTERS */}
          <div className="border-b-4 border-white">
            <button className="w-full p-6 flex items-center justify-between font-black uppercase tracking-widest text-sm text-[#888] hover:text-[#ccff00] cursor-pointer" onClick={() => setShowCharacters(!showCharacters)}>
              <span>CHARACTERS</span>
              {showCharacters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {showCharacters && (
              <div className="px-6 pb-6 space-y-4">
                <div>
                  <div className="mb-2 uppercase font-bold tracking-widest text-[10px] text-gray-300">CHARACTER SET</div>
                  <div className="relative">
                    <button onClick={() => setShowCharsetDropdown(!showCharsetDropdown)} className="w-full py-2 px-3 border-2 border-[#333] bg-[#111] text-[10px] font-bold uppercase tracking-wider text-left flex justify-between items-center hover:border-[#ccff00] transition-colors">
                      <span className="text-[#ccff00]">{selectedCharset === "auto" ? "AUTO (STYLE DEFAULT)" : (charsetLabels[selectedCharset] || selectedCharset)}</span>
                      <ChevronDown size={12} />
                    </button>
                    {showCharsetDropdown && (
                      <div className="dropdown-panel">
                        <button
                          onClick={() => { setSelectedCharset("auto"); setShowCharsetDropdown(false); }}
                          className={`w-full py-2 px-3 text-left text-[10px] font-bold uppercase hover:bg-[#ccff00] hover:text-black transition-colors ${selectedCharset === "auto" ? "bg-[#ccff00] text-black" : "text-gray-400"}`}
                        >
                          AUTO (STYLE DEFAULT)
                        </button>
                        {charsetKeys.map((key) => (
                          <button
                            key={key}
                            onClick={() => { setSelectedCharset(key as CharsetChoice); setShowCharsetDropdown(false); }}
                            className={`w-full py-2 px-3 text-left text-[10px] font-bold uppercase hover:bg-[#ccff00] hover:text-black transition-colors ${selectedCharset === key ? "bg-[#ccff00] text-black" : "text-gray-400"}`}
                          >
                            {charsetLabels[key] || key}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="mb-2 uppercase font-bold tracking-widest text-[10px] text-gray-300">SEQUENCE</div>
                  <div className="flex flex-wrap gap-1.5">
                    {sequenceOptions.map((seq) => (
                      <button
                        key={seq}
                        onClick={() => setSelectedSequence(seq)}
                        className={`py-1.5 px-3 border-2 font-bold text-[9px] uppercase tracking-wider transition-all ${selectedSequence === seq ? "border-[#ccff00] bg-[#ccff00] text-black" : "border-[#333] text-gray-400 hover:border-white hover:text-white"}`}
                      >
                        {seq === "off" ? "OFF" : seq.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 uppercase font-bold tracking-widest text-[10px] text-gray-300">CUSTOM TEXT</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. hello world"
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      className="flex-1 py-2 px-3 border-2 border-[#333] bg-[#111] text-white text-[10px] font-mono focus:border-[#ccff00] focus:outline-none placeholder:text-[#444]"
                    />
                    <button
                      onClick={() => { if (customText && lastImageSrc.current) processImage(lastImageSrc.current); }}
                      disabled={!customText || !sourceFile}
                      className="px-3 py-2 border-2 border-[#ccff00] bg-[#ccff00] text-black font-bold text-[9px] uppercase tracking-wider hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      APPLY
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* HOVER */}
          <div className="border-b-4 border-white">
            <button className="w-full p-6 flex items-center justify-between font-black uppercase tracking-widest text-sm text-[#888] hover:text-[#ccff00] cursor-pointer" onClick={() => setShowHover(!showHover)}>
              <span>HOVER</span>
              {showHover ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {showHover && (
              <div className="px-6 pb-6">
                <div className="grid grid-cols-4 gap-1.5">
                  {hoverKeys.map((key) => (
                    <button
                      key={key}
                      onClick={() => setActiveHover(key)}
                      className={`py-1.5 px-1 border-2 font-bold text-[9px] uppercase tracking-wider transition-all ${activeHover === key ? "border-[#ccff00] bg-[#ccff00] text-black" : "border-[#333] text-gray-400 hover:border-white hover:text-white"}`}
                    >
                      {HOVER_PRESETS[key as keyof typeof HOVER_PRESETS]?.label?.toUpperCase() || key.toUpperCase()}
                    </button>
                  ))}
                </div>
                {activeHover !== "none" && (
                  <div className="mt-3">
                    <button className="text-[#ccff00] hover:text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <ChevronRight size={10} /> CUSTOMIZE
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ADVANCED */}
          <div className="border-b-4 border-white">
            <button className="w-full p-6 flex items-center justify-between font-black uppercase tracking-widest text-sm text-[#888] hover:text-[#ccff00] cursor-pointer" onClick={() => setShowAdvanced(!showAdvanced)}>
              <span>ADVANCED</span>
              {showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {showAdvanced && (
              <div className="px-6 pb-6 space-y-5">
                <div>
                  <div className="mb-2 uppercase font-bold tracking-widest text-[10px] text-gray-300">CHROMA KEY</div>
                  <div className="flex gap-2">
                    {chromaModes.map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setChromaMode(mode)}
                        className={`flex-1 py-2 border-2 font-bold text-[9px] uppercase tracking-wider transition-all ${chromaMode === mode ? "border-[#ccff00] bg-[#ccff00] text-black" : "border-[#333] text-gray-400 hover:border-white hover:text-white"}`}
                      >
                        {mode === "off" ? "OFF" : mode === "greenScreen" ? "GREEN" : mode === "blueScreen" ? "BLUE" : "CUSTOM"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2 uppercase font-bold tracking-widest text-[10px]">
                    <span className="text-gray-300">SPACING</span>
                    <span className="text-white bg-black border-2 border-white px-2 py-0.5">{sliders.spacing.toFixed(1)}x</span>
                  </div>
                  <input type="range" min={0.5} max={3} step={0.1} value={sliders.spacing} onChange={(e) => setSliders((prev) => ({ ...prev, spacing: parseFloat(e.target.value) }))} />
                </div>
                <div>
                  <div className="flex justify-between mb-2 uppercase font-bold tracking-widest text-[10px]">
                    <span className="text-gray-300">DITHER</span>
                    <span className="text-white bg-black border-2 border-white px-2 py-0.5">{sliders.dither.toFixed(2)}</span>
                  </div>
                  <input type="range" min={0} max={1} step={0.01} value={sliders.dither} onChange={(e) => setSliders((prev) => ({ ...prev, dither: parseFloat(e.target.value) }))} />
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col bg-[#050505] relative">
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "50px 50px" }} />

          <div className="flex-1 flex flex-col items-center justify-center z-10 px-6 md:px-8">
            <div className="border-4 border-white bg-black p-8 shadow-[12px_12px_0px_0px_#ccff00] relative w-full max-w-[640px]">
              <div className="absolute -top-3 -left-3 bg-[#ccff00] text-black font-black uppercase text-[10px] px-2 py-1 border-2 border-white">
                {isProcessing ? "PROCESSING..." : sourceFileName ? "SYS_ACTIVE" : "SYS_IDLE"}
              </div>
              {sourceFile ? (
                <div className="flex flex-col gap-2">
                  {/* Aspect ratio bar */}
                  <div className="flex items-center gap-2 mb-2">
                    {(["auto", "16:9", "4:3", "1:1", "9:16", "3:4", "21:9"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setAspectMode(mode)}
                        className={`px-3 py-1 border-2 text-[9px] font-bold uppercase tracking-wider transition-colors ${aspectMode === mode ? "border-[#ccff00] bg-[#ccff00] text-black" : "border-[#333] text-[#555] hover:border-[#555] hover:text-white"}`}
                      >
                        {mode.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <canvas ref={displayCanvasRef} className="w-full h-auto" width={CANVAS_DISPLAY_W} height={CANVAS_DISPLAY_H} />
                  {/* Zoom controls */}
                  <div className="flex items-center justify-between mt-3 text-[9px] font-bold uppercase tracking-widest text-[#555]">
                    <span>{canvasRes ? `${canvasRes.w}×${canvasRes.h}` : "—"}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setZoom(Math.max(10, zoom - 10))} className="hover:text-[#ccff00]">−</button>
                      <span>{zoom}%</span>
                      <button onClick={() => setZoom(Math.min(400, zoom + 10))} className="hover:text-[#ccff00]">+</button>
                      <span className="text-[#333]">|</span>
                      <button className="hover:text-[#ccff00]">FIT</button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <pre className="font-mono text-sm mb-6 text-[#39ff14] text-center leading-snug select-none font-bold">
                    {`   /\\_/\\   \n  ( o.o )  \n   > ^ <   `}
                  </pre>
                  <p className="uppercase font-bold tracking-[0.2em] text-[10px] text-white border-t-2 border-dashed border-gray-600 pt-4 mt-4 text-center">
                    UPLOAD SEQUENCE REQUIRED TO BEGIN
                  </p>
                </>
              )}
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <canvas ref={hiddenCanvasRef} className="hidden" />

          {/* Bottom bar */}
          <div className="h-16 border-t-4 border-white bg-black flex items-center px-4 md:px-6 shrink-0 z-20 justify-between w-full">
            <div className="flex items-center gap-3 md:gap-4 text-[10px] font-bold uppercase tracking-wider overflow-x-auto">
              <span className="text-gray-500 whitespace-nowrap">{"// Export"}</span>
              <button onClick={handleExportPNG} disabled={!sourceFile} className="border-2 border-gray-800 text-gray-600 px-4 py-1.5 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50 hover:border-white hover:text-white transition-colors">
                PNG
              </button>
              <button disabled className="border-2 border-gray-800 text-gray-600 px-4 py-1.5 whitespace-nowrap cursor-not-allowed opacity-30">
                SVG
              </button>
              <div className="w-1 h-8 bg-white mx-2 md:mx-4" />
              <button onClick={handleShare} disabled={!sourceFile} className="flex items-center gap-2 border-2 border-white bg-[#ccff00] text-black px-4 py-1.5 hover:bg-white transition-colors shadow-[2px_2px_0px_0px_#fff] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                <Share2 size={14} /> SHARE
              </button>
              <span className="text-gray-500 ml-2 md:ml-4 whitespace-nowrap">{"// Integrate"}</span>
              <button onClick={handleCodeClick} disabled={!embedCode} className="flex items-center gap-2 border-2 border-white bg-black text-white px-4 py-1.5 hover:bg-white hover:text-black transition-colors shadow-[2px_2px_0px_0px_#ff00ff] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                <Code size={14} /> CODE
              </button>
            </div>
            <div className="hidden lg:flex items-center gap-2 border-2 border-white px-3 py-1 bg-[#111] ml-4">
              <div className="w-2 h-2 bg-[#39ff14] animate-pulse" />
              <span className="text-[9px] uppercase font-bold text-[#39ff14] tracking-widest">
                PIPELINE {fps > 60 ? "OPTIMAL" : fps > 0 ? "READY" : "IDLE"}
              </span>
            </div>
          </div>

          <button
            onClick={handleClear}
            disabled={!sourceFile && !isWebcamActive}
            className="absolute bottom-24 right-8 w-14 h-14 bg-[#ff00ff] border-4 border-white flex items-center justify-center text-white shadow-[6px_6px_0px_0px_#ccff00] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#ccff00] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none transition-all z-30 group disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[6px_6px_0px_0px_#ccff00]"
          >
            <Trash2 size={24} className="group-hover:scale-110 transition-transform" />
          </button>

          {showCodeModal && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-[#ccff00] text-black px-4 py-2 font-bold text-sm border-4 border-white z-50">
              CODE COPIED TO CLIPBOARD!
            </div>
          )}
        </main>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); }} />
    </div>
  );
}