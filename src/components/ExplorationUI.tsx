'use client';

import { useState, useRef, useEffect } from 'react';
import { useMultiverseStore } from '@/store/multiverse';
import { audioManager } from '@/lib/audioManager';

import { ShaderThumbnail } from './ShaderThumbnail';

export function ExplorationUI() {
  const [prompt, setPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showPortal, setShowPortal] = useState(false);
  const [isImmersed, setIsImmersed] = useState(false);
  
  const addUniverse = useMultiverseStore((state) => state.addUniverse);
  const universes = useMultiverseStore((state) => state.universes);
  const currentUniverseId = useMultiverseStore((state) => state.currentUniverseId);
  const setCurrentUniverse = useMultiverseStore((state) => state.setCurrentUniverse);
  const fetchUniverses = useMultiverseStore((state) => state.fetchUniverses);
  
  const isGenerating = useMultiverseStore((state) => state.isGenerating);
  const setIsGenerating = useMultiverseStore((state) => state.setIsGenerating);
  const error = useMultiverseStore((state) => state.error);
  const setError = useMultiverseStore((state) => state.setError);

  const recognitionRef = useRef<any>(null);

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

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      setError('Voice recognition not supported in this browser.');
      return;
    }

    // Start audio reactivity for shaders
    audioManager.start();

    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    // Enable continuous listening
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      const currentText = finalTranscript || interimTranscript;
      if (currentText) {
        setPrompt(currentText);
      }

      // Automatically generate when a sentence/burst is finalized
      if (finalTranscript.trim().length > 0) {
        // We use the store's current state to prevent massively spamming the API while generating
        if (!useMultiverseStore.getState().isGenerating) {
          generateUniverse(finalTranscript.trim());
        }
      }
    };

    recognition.onerror = (event: any) => {
      setError(`Voice error: ${event.error}`);
      setIsListening(false);
      audioManager.stop();
    };

    recognition.onend = () => {
      setIsListening(false);
      audioManager.stop();
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    audioManager.stop();
  };

  const generateUniverse = async (textOverride?: string) => {
    const textToGenerate = textOverride || prompt;
    if (!textToGenerate.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    // If using voice, spawn only 1 facet at a time to prevent rapid visual clutter.
    // If manual text entry, spawn 3 facets as before.
    const isVoiceTrigger = !!textOverride;
    
    try {
      const facets = isVoiceTrigger 
        ? ["the freedom of the infinite peaks"] 
        : [
            "the freedom of the infinite peaks",
            "the freedom of the mountain heart",
            "the freedom of the wandering crest"
          ];

      const promises = facets.map(facet => 
        fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt: `${textToGenerate} - interpreted through ${facet}`,
            parentUniverseId: currentUniverseId
          }),
        }).then(async res => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to generate');
          return data;
        })
      );

      const results = await Promise.all(promises);

      // Add each generated universe state to the store
      // Since addUniverse pushes new items to the top, doing foreach works perfectly 
      // and spawns portals around the user
      results.forEach(data => {
        addUniverse({
          id: data.id,
          name: data.name,
          prompt: data.prompt,
          shader: data.shader,
          timestamp: data.timestamp,
          parentUniverseId: data.parentUniverseId,
          neighborUniverseIds: data.neighborUniverseIds,
        });
      });

      setPrompt('');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isImmersed) {
    return (
      <div className="ui-overlay pointer-events-none flex flex-col justify-end p-6 h-full z-10">
        <div className="text-white/40 text-xs text-center mb-4 transition-opacity opacity-0 hover:opacity-100 pointer-events-auto cursor-default">
          Press ESC to bring the UI back and exit immersion.
        </div>
      </div>
    );
  }

  return (
    <div className="ui-overlay pointer-events-none flex flex-col justify-between h-full p-6 z-10">
      <header className="glass-panel text-center max-w-lg mx-auto w-full pointer-events-auto shadow-xl">
        <h1 className="text-3xl gradient-text font-black mb-2 animate-pulse-slow tracking-tight">UTOPIA</h1>
        <p className="text-muted text-sm font-medium">Create and traverse immersive realities.</p>
        
        <div className="flex gap-2 w-full mt-5">
          <button 
            onClick={() => setShowPortal(!showPortal)} 
            className="modern-button secondary flex-1 text-xs font-bold tracking-wide uppercase transition-all"
          >
            {showPortal ? '× Close Portals' : '🌌 View Universes'}
          </button>
          <button 
            onClick={toggleImmersion} 
            className="modern-button flex-1 text-xs font-bold tracking-wide uppercase transition-all"
          >
            <span className="flex items-center justify-center gap-2">👁️ Immerse (Fullscreen)</span>
          </button>
        </div>
      </header>
      
      {/* Portal Drawer for saved universes */}
      {showPortal && (
        <div className="glass-panel max-w-lg mx-auto mt-4 mb-auto w-full max-h-[50vh] overflow-y-auto pointer-events-auto flex flex-col gap-3 shadow-2xl p-4 custom-scrollbar">
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

      <div className="glass-panel max-w-lg mx-auto mb-10 w-full flex flex-col gap-4 pointer-events-auto mt-auto">
        
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
