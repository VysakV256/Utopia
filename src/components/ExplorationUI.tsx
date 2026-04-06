'use client';

import { useState, useRef, useEffect } from 'react';
import { useMultiverseStore } from '@/store/multiverse';
import { audioManager } from '@/lib/audioManager';

import { ShaderThumbnail } from './ShaderThumbnail';

export function ExplorationUI() {
  const isListening = useMultiverseStore((state) => state.isListening);
  const prompt = useMultiverseStore((state) => state.voicePrompt);
  const setPrompt = useMultiverseStore((state) => state.setVoicePrompt);
  const startVoiceInput = useMultiverseStore((state) => state.startVoiceInput);
  const stopVoiceInput = useMultiverseStore((state) => state.stopVoiceInput);
  const generateUniverse = useMultiverseStore((state) => state.generateUniverse);

  const universes = useMultiverseStore((state) => state.universes);
  const currentUniverseId = useMultiverseStore((state) => state.currentUniverseId);
  const setCurrentUniverse = useMultiverseStore((state) => state.setCurrentUniverse);
  const fetchUniverses = useMultiverseStore((state) => state.fetchUniverses);
  
  const isGenerating = useMultiverseStore((state) => state.isGenerating);
  const error = useMultiverseStore((state) => state.error);

  const [showPortal, setShowPortal] = useState(false);
  const [isImmersed, setIsImmersed] = useState(false);

  // Fetch all saved multiverses on mount
  useEffect(() => {
    fetchUniverses();
  }, [fetchUniverses]);

  // Handle fullscreen mode for immersion
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsImmersed(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleImmersion = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };



  if (isImmersed) {
    return (
      <div className="ui-overlay pointer-events-none absolute inset-0 flex flex-col justify-between p-8 z-10 w-full h-full">
        {/* Top padding */}
        <div className="flex-1" />
        
        {/* Bottom controls HUD (fade slightly so it doesn't obstruct view, but remains visible) */}
        <div className="flex justify-between items-end w-full pb-8">
          {/* Left Hand: Movement (Analogous to Left VR thumstick) */}
          <div className="flex items-center gap-4 text-white/50 bg-black/20 p-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-2xl transition-all duration-1000 ease-out animate-in slide-in-from-bottom-8 opacity-70">
            <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-sm font-bold opacity-80">
              <div /> <div className="border border-white/20 rounded shadow-inner px-2 py-1 bg-white/5">W</div> <div />
              <div className="border border-white/20 rounded shadow-inner px-2 py-1 bg-white/5">A</div>
              <div className="border border-white/20 rounded shadow-inner px-2 py-1 bg-white/5">S</div>
              <div className="border border-white/20 rounded shadow-inner px-2 py-1 bg-white/5">D</div>
            </div>
            <div className="uppercase text-[10px] tracking-widest text-white/40 ml-2">Move</div>
          </div>

          {/* Center: Exit instruction (hidden until hover to keep screen clean) */}
          <div className="text-white/30 text-[10px] text-center transition-opacity opacity-0 hover:opacity-100 pointer-events-auto cursor-default bg-black/40 px-6 py-2 rounded-full backdrop-blur-md border border-white/5 uppercase tracking-widest">
            Press ESC to exit
          </div>

          {/* Right Hand: Look (Analogous to Right VR controller/head tracking) */}
          <div className="flex items-center gap-4 text-white/50 bg-black/20 p-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-2xl transition-all duration-1000 ease-out animate-in slide-in-from-bottom-8 opacity-70">
            <div className="uppercase text-[10px] tracking-widest text-white/40 mr-2">Look</div>
            <div className="flex flex-col items-center opacity-80">
              <div className="w-5 h-8 border-2 border-white/20 rounded-full relative shadow-inner bg-white/5">
                 <div className="w-[3px] h-[8px] bg-white/40 rounded-full absolute top-[3px] left-1/2 -translate-x-1/2" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Subtle Crosshair in the exact center to aid with Mouse looking */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white/30 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
      </div>
    );
  }

  return (
    <div className="ui-overlay pointer-events-none relative h-full w-full p-6 z-10">
      <div className="pointer-events-auto absolute left-6 top-6 flex gap-2">
        <button 
          onClick={() => setShowPortal(!showPortal)} 
          className="modern-button secondary text-xs font-bold tracking-wide uppercase transition-all"
        >
          {showPortal ? 'Close Portals' : 'View Universes'}
        </button>
        <button 
          onClick={toggleImmersion} 
          className="modern-button text-xs font-bold tracking-wide uppercase transition-all"
        >
          Immerse
        </button>
      </div>
      
      {/* Portal Drawer for saved universes */}
      {showPortal && (
        <div className="glass-panel pointer-events-auto absolute left-6 top-24 w-[min(28rem,calc(100vw-3rem))] max-h-[50vh] overflow-y-auto flex flex-col gap-3 shadow-2xl p-4 custom-scrollbar">
          {universes.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                setCurrentUniverse(u.id);
                // setShowPortal(false); Keeping open for easier browsing
              }}
              className={`text-left p-3 rounded-xl transition-all flex items-center gap-4 group ${currentUniverseId === u.id ? 'bg-[var(--accent)] text-white shadow-lg ring-2 ring-white/50' : 'bg-black/40 hover:bg-white/10 border border-white/5 hover:border-white/20'}`}
            >
              <ShaderThumbnail shaderCode={u.shader} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg mb-0.5 truncate drop-shadow-md">{u.name}</div>
                <div className="text-xs opacity-75 line-clamp-2 leading-relaxed">{u.prompt}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="glass-panel pointer-events-auto absolute bottom-6 left-1/2 flex w-[min(34rem,calc(100vw-3rem))] -translate-x-1/2 flex-col gap-4 p-4 shadow-2xl">
        
        {error && (
          <div className="text-red-400 text-sm bg-red-900/40 p-3 rounded-lg border border-red-500/50">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            className="modern-input flex-1"
            placeholder="Describe a new universe..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generateUniverse()}
            disabled={isGenerating}
          />
          <button 
            type="button" 
            className={`modern-button secondary ${isListening ? 'animate-pulse' : ''}`}
            onClick={isListening ? stopVoiceInput : startVoiceInput}
            title="🎤 Voice Prompt"
          >
            {isListening ? '🔴' : '🎤'}
          </button>
        </div>
        
        <button 
          className="modern-button w-full"
          onClick={() => generateUniverse()}
          disabled={!prompt.trim() || isGenerating}
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Weaving Reality...
            </span>
          ) : (
            'Generate Universe'
          )}
        </button>
      </div>
    </div>
  );
}
