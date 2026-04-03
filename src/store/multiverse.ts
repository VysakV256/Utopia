import { create } from 'zustand';

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
}

const DEFAULT_SHADER = `
varying vec2 vUv;
uniform float time;
void main() {
  vec2 uv = vUv - 0.5;
  float d = length(uv);
  vec3 col = vec3(0.1, 0.2, 0.4) + 0.3 * cos(time + d * 10.0 + vec3(0, 2, 4));
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

export const useMultiverseStore = create<MultiverseState>((set) => ({
  universes: [INITIAL_UNIVERSE],
  currentUniverseId: 'genesis',
  isGenerating: false,
  error: null,

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
    set(() => ({ error }))
}));
