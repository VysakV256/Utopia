'use client';

import { ExplorationUI } from '@/components/ExplorationUI';
import { UtopiaCanvas } from '@/components/UtopiaCanvas';

export default function HomePage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      <ExplorationUI />
      <div className="absolute inset-0 z-0">
        <UtopiaCanvas />
      </div>
    </main>
  );
}
