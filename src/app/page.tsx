"use client";

import React, { useEffect, useState } from "react";
import {
  Terminal,
  Zap,
  Command,
  ArrowRight,
  Share2,
  Layout,
  Cpu,
  Activity,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

const App = () => {
  const [terminalText, setTerminalText] = useState("");

  const terminalLines =
    "Initiating sequence...\n> Loading modules: 100%\n> Bypassing mainframe...\n> Access granted.\n> System ready.";

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setTerminalText(terminalLines.substring(0, i));
      i++;
      if (i > terminalLines.length) clearInterval(timer);
    }, 30); // slightly slower typing for readability
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono selection:bg-[#ccff00] selection:text-black overflow-x-hidden">
      {/* GLOBAL CSS INJECTION FOR SCANLINES, MARQUEE, & TEXT STROKE */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .crt-overlay::before {
          content: " ";
          display: block;
          position: absolute;
          top: 0; left: 0; bottom: 0; right: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
          z-index: 2;
          background-size: 100% 2px, 3px 100%;
          pointer-events: none;
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        .text-outline-yellow {
          -webkit-text-stroke: 2px #ccff00;
          color: transparent;
        }
      `,
        }}
      />

      {/* BACKGROUND GRID */}
      <div
        className="fixed inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#222 1px, transparent 1px), linear-gradient(90deg, #222 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* HEADER NAV */}
      <nav className="relative z-20 border-b-4 border-white bg-black flex justify-between items-stretch">
        <div className="flex items-center gap-3 px-6 py-4 border-r-4 border-white hover:bg-[#ccff00] hover:text-black transition-all cursor-pointer group">
          <div className="bg-white text-black p-1 group-hover:bg-black group-hover:text-[#ccff00]">
            <Terminal size={20} />
          </div>
          <span className="font-black text-xl tracking-tighter">ASCIIFY</span>
        </div>

        <div className="hidden md:flex items-center uppercase font-bold text-xs tracking-widest">
          {["Showcase", "Backgrounds", "Text", "Docs"].map((item) => (
            <a
              key={item}
              href="#"
              className="px-8 h-full flex items-center border-r-4 border-white hover:bg-white hover:text-black transition-colors"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center">
          <div className="px-6 py-4 border-l-4 border-white font-bold text-xs hidden lg:block text-gray-500">
            NPM / GITHUB
          </div>
          <Link
            href="/playground"
            className="px-8 py-4 bg-[#ccff00] text-black font-black uppercase border-l-4 border-white hover:bg-white transition-colors flex items-center gap-2"
          >
            Playground <ChevronRight size={18} />
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="relative z-10 max-w-[1600px] mx-auto px-6 pt-16 pb-32 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-start">
        {/* ========================================= */}
        {/* LEFT COLUMN: Typography, Buttons & Cards  */}
        {/* ========================================= */}
        <div className="space-y-10">
          {/* DEPLOYED BADGE */}
          <div className="inline-flex items-center gap-2 bg-white text-black px-4 py-2 font-black text-[10px] uppercase tracking-[0.2em] shadow-[4px_4px_0px_0px_#ccff00] border-2 border-white">
            <Zap size={14} fill="currentColor" /> Version 2.0.4 Deployed
          </div>

          {/* MAIN HEADING - Outline Typography */}
          <div>
            <h1 className="text-7xl md:text-[8rem] font-black leading-[0.9] tracking-tighter uppercase select-none flex flex-col">
              <span className="text-white">IMAGE</span>
              <span className="text-outline-yellow">SUITE</span>
              <span className="text-white">ASCIIFY.</span>
            </h1>
          </div>

          {/* SUBTEXT */}
          <p className="text-lg md:text-xl text-gray-400 border-l-[6px] border-[#ff00ff] pl-6 max-w-xl leading-relaxed font-bold">
            A zero-dependency UI framework combining raw structural logic with
            high-contrast cybernetic aesthetics. Build interfaces that refuse to
            compromise.
          </p>

          {/* BUTTONS */}
          <div className="flex flex-wrap gap-6 pt-2">
            <button className="relative group">
              <div className="absolute inset-0 bg-white translate-x-3 translate-y-3 transition-transform group-hover:translate-x-4 group-hover:translate-y-4"></div>
              <div className="relative bg-[#ccff00] text-black px-8 py-5 font-black uppercase text-sm border-[3px] border-white flex items-center gap-3 active:translate-x-3 active:translate-y-3 transition-transform">
                Initialize <ArrowRight size={18} />
              </div>
            </button>

            <button className="relative group">
              <div className="absolute inset-0 bg-[#ff00ff] translate-x-3 translate-y-3 transition-transform group-hover:translate-x-4 group-hover:translate-y-4"></div>
              <div className="relative bg-[#050505] text-white px-8 py-5 font-black uppercase text-sm border-[3px] border-white flex items-center gap-3 active:translate-x-3 active:translate-y-3 transition-transform">
                <Command size={18} /> Read Docs
              </div>
            </button>
          </div>

          {/* TOOL CARDS GRID (Moved to left side, below buttons) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-12">
            {[
              {
                title: "ASCII ART",
                desc: "20 character styles, color modes, export PNG/SVG",
                icon: Layout,
                color: "#ccff00",
                href: "/playground",
              },
              {
                title: "DITHER",
                desc: "Bayer, Floyd-Steinberg, halftone, random algorithms",
                icon: Activity,
                color: "#00ffff",
                href: "#",
              },
              {
                title: "HALFTONE",
                desc: "CMYK presets with per-channel gain control",
                icon: Cpu,
                color: "#ff00ff",
                href: "#",
              },
              {
                title: "NOISE",
                desc: "Film grain overlays with blending mode control",
                icon: Zap,
                color: "#ffffff",
                href: "#",
              },
            ].map((tool, idx) => {
              const ToolIcon = tool.icon;
              return (
                <Link
                  key={idx}
                  href={tool.href}
                  className="group relative text-left"
                >
                  <div className="absolute inset-0 bg-white translate-x-2 translate-y-2 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform" />
                  <div className="relative bg-black border-[3px] border-white p-6 h-full flex flex-col justify-between hover:-translate-x-1 hover:-translate-y-1 transition-transform">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 border-2 border-white bg-black text-white group-hover:bg-[#ccff00] group-hover:text-black transition-colors">
                          <ToolIcon size={20} />
                        </div>
                      </div>
                      <h3
                        className="font-black text-xl uppercase mb-2"
                        style={{ color: tool.color }}
                      >
                        {tool.title}
                      </h3>
                      <p className="text-xs text-gray-400 font-bold leading-tight">
                        {tool.desc}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ========================================= */}
        {/* RIGHT COLUMN: Big Terminal Windows        */}
        {/* ========================================= */}
        <div className="flex items-center justify-center lg:justify-end w-full lg:sticky lg:top-32 h-full lg:h-auto mt-12 lg:mt-0">
          <div className="relative w-full max-w-[600px] mt-8 lg:mt-12 mr-4">
            {/* Outline Shadows */}
            <div className="absolute inset-0 bg-[#ccff00] -translate-x-6 translate-y-6 pointer-events-none z-0"></div>
            <div className="absolute inset-0 bg-[#ff00ff] translate-x-6 translate-y-10 pointer-events-none z-0"></div>

            {/* Main Terminal Box */}
            <div className="relative bg-[#050505] border-[6px] border-white flex flex-col z-10 crt-overlay min-h-[450px]">
              {/* Header Bar */}
              <div className="flex justify-between items-center border-b-[6px] border-white px-4 py-2 bg-black relative">
                {/* Diagonal hazard stripes */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(45deg, transparent, transparent 10px, #fff 10px, #fff 20px)",
                  }}
                ></div>

                <div className="relative flex gap-4 text-[10px] text-white uppercase font-black tracking-widest pl-2 border-l-4 border-[#ccff00]">
                  <span>[ SYS.MAIN ]</span>
                  <span className="text-[#00ffff] animate-pulse">ACTV</span>
                </div>
                <div className="relative text-[10px] text-gray-400 uppercase font-black tracking-widest border-2 border-gray-800 px-2 py-1 bg-black">
                  PRT:8080 // ROOT@BRUTE-FORCE:~
                </div>
              </div>

              {/* Terminal Output */}
              <div className="relative p-6 flex-1 flex flex-col justify-between overflow-hidden">
                {/* Tactical Framing Corners */}
                <div className="absolute top-4 left-4 w-4 h-4 border-t-[3px] border-l-[3px] border-gray-600"></div>
                <div className="absolute top-4 right-4 w-4 h-4 border-t-[3px] border-r-[3px] border-gray-600"></div>
                <div className="absolute bottom-4 left-4 w-4 h-4 border-b-[3px] border-l-[3px] border-gray-600"></div>
                <div className="absolute bottom-4 right-4 w-4 h-4 border-b-[3px] border-r-[3px] border-gray-600"></div>

                <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none transform translate-x-1/4">
                  <Cpu size={280} />
                </div>

                <div className="relative z-10">
                  {/* Telemetry Data */}
                  <div className="flex justify-between text-[10px] text-gray-500 mb-6 border-b-[3px] border-gray-800 pb-2 font-black uppercase tracking-widest">
                    <span>MEM: OK</span>
                    <span>NET: STABLE</span>
                    <span>TEMP: 42°C</span>
                    <span>SEQ: 1X09</span>
                  </div>

                  <pre className="text-[#00ffff] font-mono text-[15px] font-bold leading-[2] whitespace-pre-wrap">
                    {terminalText}
                    <span className="animate-pulse bg-[#ccff00] w-3 h-5 inline-block ml-1 align-middle"></span>
                  </pre>
                </div>

                {/* NPM Embedded Input Box */}
                <div className="relative z-10 mt-8 border-[4px] border-white p-4 flex justify-between items-center bg-black group hover:border-[#ccff00] transition-colors">
                  <span className="text-[#ccff00] font-mono font-bold text-sm tracking-wider">
                    <span className="text-white mr-3">❯</span>
                    npm install @brute/core
                  </span>
                  <div className="bg-white text-black p-2 flex items-center justify-center font-black text-xs h-8 group-hover:bg-[#ccff00] transition-colors">
                    EXEC //
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* TICKER FOOTER */}
      <footer className="fixed bottom-0 w-full z-30 bg-[#ccff00] border-t-4 border-white py-3 overflow-hidden">
        <div className="flex whitespace-nowrap animate-marquee">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="flex items-center text-black font-black uppercase text-sm tracking-[0.2em] px-4"
            >
              <span>FREE & INSTANT</span>
              <span className="mx-8 opacity-30">{"//"}</span>
              <span>ASCII ART GENERATOR</span>
              <span className="mx-8 opacity-30">{"//"}</span>
              <span>DITHER ENGINE</span>
              <span className="mx-8 opacity-30">{"//"}</span>
              <span>CMYK HALFTONE</span>
              <span className="mx-8 opacity-30">{"//"}</span>
            </div>
          ))}
        </div>
      </footer>

      {/* FLOATING STATUS (Bottom Right) */}
      <div className="fixed bottom-16 right-6 z-40 flex flex-col items-end gap-2">
        <div className="bg-black border-2 border-white px-3 py-1 flex items-center gap-2 shadow-[4px_4px_0px_0px_#ccff00]">
          <div className="w-2 h-2 rounded-full bg-[#ff00ff] animate-pulse" />
          <span className="text-[10px] font-bold text-white uppercase tracking-tighter">
            System Online // 20+ Styles
          </span>
        </div>
        <button className="w-12 h-12 bg-[#ff00ff] border-2 border-black flex items-center justify-center text-black shadow-[4px_4px_0px_0px_#ffffff] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
          <Share2 size={20} />
        </button>
      </div>
    </div>
  );
};

export default App;
