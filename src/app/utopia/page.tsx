'use client';

import { ExplorationUI } from '@/components/ExplorationUI';
import { UtopiaCanvas } from '@/components/UtopiaCanvas';

export default function UtopiaPage() {
  return (
    <main className="w-screen h-screen relative bg-black overflow-hidden relative">
      <ExplorationUI />
      <div className="absolute inset-0 z-0">
         <UtopiaCanvas />
      </div>
    </main>
  );
}
