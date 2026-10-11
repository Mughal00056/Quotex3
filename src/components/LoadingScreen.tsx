import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onLoaded?: () => void;
}

const SPLASH_IMAGE_URL = 'https://i.supaimg.com/0ffab3ca-b15e-48fd-a213-7db2aa7158cc/18782b95-9fcf-4f7e-8d1d-e26366eb3d95.png';

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onLoaded }) => {
  const [progress, setProgress] = useState(15);
  const [isDone, setIsDone] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    // Hide inline HTML splash if present
    const inlineSplash = document.getElementById('initial-splash-screen');
    if (inlineSplash) {
      inlineSplash.style.display = 'none';
    }

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setIsDone(true);
            if (onLoaded) onLoaded();
          }, 320);
          return 100;
        }
        return prev + Math.floor(Math.random() * 18) + 12;
      });
    }, 90);

    return () => clearInterval(timer);
  }, [onLoaded]);

  if (isDone) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#07090e] flex flex-col items-center justify-center p-6 select-none transition-opacity duration-300">
      {/* Background ambient lighting */}
      <div className="absolute w-96 h-96 rounded-full bg-cyan-600/10 blur-3xl pointer-events-none" />
      <div className="absolute w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none -bottom-10" />

      {/* User's custom splash image container with glowing neon outline */}
      <div className="relative mb-6 flex items-center justify-center">
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden border-2 border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.35)] bg-[#0d121c] p-2 flex items-center justify-center">
          {!imgError ? (
            <img
              src="/splash-image.png"
              onError={() => {
                // Try remote fallback if local fetch errors
                const img = new Image();
                img.src = SPLASH_IMAGE_URL;
                img.onload = () => {
                  setImgError(false);
                };
                img.onerror = () => setImgError(true);
              }}
              alt="Trading Platform Splash"
              className="w-full h-full object-contain rounded-2xl animate-pulse"
            />
          ) : (
            <img
              src={SPLASH_IMAGE_URL}
              alt="Trading Platform Splash Fallback"
              className="w-full h-full object-contain rounded-2xl animate-pulse"
            />
          )}
        </div>
      </div>

      {/* Brand title */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-widest bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            QUOTEX PRO
          </h1>
        </div>
        <p className="text-[10px] sm:text-[11px] font-extrabold text-cyan-400 tracking-[0.3em] uppercase mt-1">
          INNOVATIVE TRADING PLATFORM
        </p>
      </div>

      {/* Sleek progress bar */}
      <div className="w-64 max-w-full bg-[#121620] rounded-full h-2.5 overflow-hidden border border-[#272f42] p-0.5 shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-[#00e599] rounded-full transition-all duration-150 ease-out shadow-[0_0_14px_rgba(6,182,212,0.85)]"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>

      {/* Status note */}
      <div className="mt-3.5 text-[11px] font-mono font-bold text-slate-300 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span>Loading Market Feeds... {Math.min(100, progress)}%</span>
      </div>
    </div>
  );
};
