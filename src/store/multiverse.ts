import { create } from 'zustand';
import { audioManager } from '@/lib/audioManager';

// Basic structure of a Universe
export interface Universe {
  id: string;
  name: string;
  prompt: string;
  // Fallback default shader if nothing is generated
  shader: string; 
  timestamp: number;
  parentUniverseId?: string;
  neighborUniverseIds?: string[];
}

interface MultiverseState {
  universes: Universe[];
  currentUniverseId: string | null;
  addUniverse: (universe: Universe) => void;
  setCurrentUniverse: (id: string) => void;
  setUniverses: (universes: Universe[]) => void;
  fetchUniverses: () => Promise<void>;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  error: string | null;
  setError: (err: string | null) => void;
  isListening: boolean;
  voicePrompt: string;
  setVoicePrompt: (prompt: string) => void;
  startVoiceInput: () => void;
  stopVoiceInput: () => void;
  generateUniverse: (promptOverride?: string) => Promise<void>;
}

// Keep a global ref to speech recognition to stop it from store methods.
let recognitionRef: any = null;

const DEFAULT_SHADER = `
varying vec2 vUv;
uniform float time;
uniform float uAudio;
void main() {
  vec2 uv = vUv - 0.5;
  float d = length(uv);
  vec3 baseColor = vec3(0.1 + uAudio * 0.2, 0.2 + uAudio * 0.5, 0.4 + uAudio);
  vec3 col = baseColor + (0.3 + uAudio * 0.4) * cos(vec3(time * (1.0 + uAudio) + d * (10.0 - uAudio * 5.0)) + vec3(0.0, 2.0, 4.0));
  gl_FragColor = vec4(col, 1.0);
}
`;

const INITIAL_UNIVERSE: Universe = {
  id: 'genesis',
  name: 'Genesis Void',
  prompt: 'A calm, dark blue, pulsing energy field.',
  shader: DEFAULT_SHADER,
  timestamp: Date.now(),
};

export const useMultiverseStore = create<MultiverseState>((set, get) => ({
  universes: [INITIAL_UNIVERSE],
  currentUniverseId: 'genesis',
  isGenerating: false,
  error: null,
  isListening: false,
  voicePrompt: '',

  addUniverse: (universe) => 
    set((state) => ({ 
      universes: [universe, ...state.universes], // Push newest to top
      // Do not change currentUniverseId, forcing the user to travel through the newly spawned portal
    })),

  setCurrentUniverse: (id) => 
    set(() => ({ currentUniverseId: id })),

  setUniverses: (universes) =>
    set(() => ({
      universes: universes.length > 0 ? universes : [INITIAL_UNIVERSE],
      currentUniverseId: 'genesis'
    })),

  fetchUniverses: async () => {
    try {
      const res = await fetch('/api/multiverses');
      const data = await res.json();
      if (data.multiverses && data.multiverses.length > 0) {
        set(() => ({
          universes: [...data.multiverses, INITIAL_UNIVERSE],
          currentUniverseId: 'genesis'
        }));
      }
    } catch (err) {
      console.error("Failed to load multiverses:", err);
    }
  },

  setIsGenerating: (generating) => 
    set(() => ({ isGenerating: generating })),

  setError: (error) => 
    set(() => ({ error })),

  setVoicePrompt: (prompt) => set(() => ({ voicePrompt: prompt })),

  startVoiceInput: () => {
    const state = get();
    if (!('webkitSpeechRecognition' in window)) {
      state.setError('Voice recognition not supported in this browser.');
      return;
    }

    audioManager.start();

    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      set({ isListening: true, error: null, voicePrompt: '' });
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
        set({ voicePrompt: currentText });
      }

      // Automatically auto-gen once speech finalizes
      if (finalTranscript.trim().length > 0 && !get().isGenerating) {
        get().generateUniverse(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      set({ error: `Voice error: ${event.error}`, isListening: false });
      audioManager.stop();
    };

    recognition.onend = () => {
      set({ isListening: false });
      audioManager.stop();
    };

    recognitionRef = recognition;
    recognition.start();
  },

  stopVoiceInput: () => {
    if (recognitionRef) {
      recognitionRef.stop();
      recognitionRef = null;
    }
    set({ isListening: false });
    audioManager.stop();
  },

  generateUniverse: async (promptOverride?: string) => {
    const state = get();
    const promptToUse = promptOverride || state.voicePrompt;
    if (!promptToUse.trim() || state.isGenerating) return;

    set({ isGenerating: true, error: null });

    const isVoiceTrigger = !!promptOverride;
    
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
            prompt: `${promptToUse} - interpreted through ${facet}`,
            parentUniverseId: state.currentUniverseId
          }),
        }).then(async res => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to generate');
          return data;
        })
      );

      const results = await Promise.all(promises);

      results.forEach(data => {
        state.addUniverse({
          id: data.id,
          name: data.name,
          prompt: data.prompt,
          shader: data.shader,
          timestamp: data.timestamp,
          parentUniverseId: data.parentUniverseId,
          neighborUniverseIds: data.neighborUniverseIds,
        });
      });

      set({ voicePrompt: '' });

    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isGenerating: false });
    }
  }
}));
