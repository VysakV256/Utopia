'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

const transmissions = [
  'NOOSPHERE BURST 01 // mutual aid cells are awake beneath the storm grid',
  'NOOSPHERE BURST 02 // earth remembers every barricade and every orchard',
  'NOOSPHERE BURST 03 // reroute extraction corridors toward community power',
  'NOOSPHERE BURST 04 // fighter-pilot cadence holding steady over the green zone',
  'NOOSPHERE BURST 05 // static carries the names of the missing and the free',
  'NOOSPHERE BURST 06 // seed vaults open when the horizon flashes ultraviolet',
  'NOOSPHERE BURST 07 // liberation frequencies are hidden inside weather noise',
  'NOOSPHERE BURST 08 // keep the antennas low and the futures collective',
];

const bulletinRows = [
  { label: 'Sector', value: 'Earth / Great Lakes / Night Relay' },
  { label: 'Carrier', value: '13.77 MHz phantom band' },
  { label: 'Status', value: 'Ceaseless insurgent utopian playback' },
  { label: 'Protocol', value: 'Ciphered chorus + pilot-channel static' },
];

const pulseBars = Array.from({ length: 24 }, (_, index) => ({
  id: index,
  height: 20 + ((index * 13) % 64),
  delay: (index % 6) * 0.18,
}));

const normalizeTransmission = (message: string) =>
  message
    .replace(' // ', '. ')
    .replace(/NOOSPHERE BURST/g, 'Noosphere burst')
    .replace(/\b(\d{2})\b/, (_, value: string) => Number(value).toString());

function useRadioEngine() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const schedulerRef = useRef<number | null>(null);
  const staticNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const speechTimeoutRef = useRef<number | null>(null);
  const speechIndexRef = useRef(0);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const broadcastingRef = useRef(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [spokenTransmission, setSpokenTransmission] = useState(transmissions[0]);

  const pickVoice = () => {
    const voices = voicesRef.current;
    return (
      voices.find((voice) => /fred|zarvox|daniel|alex/i.test(voice.name)) ??
      voices.find((voice) => /en-/i.test(voice.lang)) ??
      null
    );
  };

  const queueSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const synth = window.speechSynthesis;
    const nextIndex = speechIndexRef.current % transmissions.length;
    const rawMessage = transmissions[nextIndex];
    const utterance = new SpeechSynthesisUtterance(normalizeTransmission(rawMessage));
    const voice = pickVoice();

    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = 0.78;
    utterance.pitch = 0.58;
    utterance.volume = 0.82;
    utterance.onstart = () => {
      setSpokenTransmission(rawMessage);
    };
    utterance.onend = () => {
      speechIndexRef.current = (speechIndexRef.current + 1) % transmissions.length;
      speechTimeoutRef.current = window.setTimeout(() => {
        if (broadcastingRef.current) {
          queueSpeech();
        }
      }, 900);
    };

    synth.cancel();
    synth.speak(utterance);
  };

  const scheduleBurst = (ctx: AudioContext, masterGain: GainNode, startTime: number) => {
    const tones = [392, 466.16, 523.25, 659.25, 783.99];
    let cursor = startTime;

    for (let index = 0; index < 8; index += 1) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const duration = 0.05 + ((index % 3) * 0.025);
      const frequency = tones[(Math.floor(startTime * 10) + index) % tones.length];

      osc.type = index % 2 === 0 ? 'square' : 'sawtooth';
      osc.frequency.setValueAtTime(frequency, cursor);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200 + index * 140, cursor);
      filter.Q.setValueAtTime(5, cursor);

      gain.gain.setValueAtTime(0.0001, cursor);
      gain.gain.exponentialRampToValueAtTime(0.04, cursor + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, cursor + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(cursor);
      osc.stop(cursor + duration + 0.02);

      cursor += duration + 0.035;
    }

    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    const sweepFilter = ctx.createBiquadFilter();

    sweep.type = 'triangle';
    sweep.frequency.setValueAtTime(240, startTime);
    sweep.frequency.exponentialRampToValueAtTime(48, startTime + 1.4);

    sweepFilter.type = 'lowpass';
    sweepFilter.frequency.setValueAtTime(900, startTime);

    sweepGain.gain.setValueAtTime(0.0001, startTime);
    sweepGain.gain.exponentialRampToValueAtTime(0.018, startTime + 0.12);
    sweepGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.4);

    sweep.connect(sweepFilter);
    sweepFilter.connect(sweepGain);
    sweepGain.connect(masterGain);

    sweep.start(startTime);
    sweep.stop(startTime + 1.45);
  };

  const buildStaticBed = (ctx: AudioContext, masterGain: GainNode) => {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < bufferSize; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (0.35 + Math.sin(index / 4000) * 0.1);
    }

    const source = ctx.createBufferSource();
    const highpass = ctx.createBiquadFilter();
    const bandpass = ctx.createBiquadFilter();
    const staticGain = ctx.createGain();

    source.buffer = buffer;
    source.loop = true;

    highpass.type = 'highpass';
    highpass.frequency.value = 260;

    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1800;
    bandpass.Q.value = 0.9;

    staticGain.gain.value = 0.045;

    source.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(staticGain);
    staticGain.connect(masterGain);

    source.start();
    staticNodeRef.current = source;
  };

  const start = async () => {
    if (audioContextRef.current && isBroadcasting) {
      return;
    }

    const ctx = new window.AudioContext();
    const masterGain = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();

    masterGain.gain.value = 0.9;
    compressor.threshold.value = -24;
    compressor.knee.value = 20;
    compressor.ratio.value = 8;

    masterGain.connect(compressor);
    compressor.connect(ctx.destination);

    buildStaticBed(ctx, masterGain);

    let nextTime = ctx.currentTime + 0.08;
    scheduleBurst(ctx, masterGain, nextTime);
    nextTime += 1.55;

    schedulerRef.current = window.setInterval(() => {
      while (nextTime < ctx.currentTime + 0.35) {
        scheduleBurst(ctx, masterGain, nextTime);
        nextTime += 1.55;
      }
    }, 120);

    audioContextRef.current = ctx;
    broadcastingRef.current = true;
    setIsBroadcasting(true);
    queueSpeech();
  };

  const stop = async () => {
    if (schedulerRef.current) {
      window.clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }

    staticNodeRef.current?.stop();
    staticNodeRef.current = null;

    if (speechTimeoutRef.current) {
      window.clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    broadcastingRef.current = false;
    setIsBroadcasting(false);
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const syncVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };

    syncVoices();
    window.speechSynthesis.addEventListener('voiceschanged', syncVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', syncVoices);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (schedulerRef.current) {
        window.clearInterval(schedulerRef.current);
      }
      if (speechTimeoutRef.current) {
        window.clearTimeout(speechTimeoutRef.current);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      staticNodeRef.current?.stop();
      broadcastingRef.current = false;
      void audioContextRef.current?.close();
    };
  }, []);

  return { isBroadcasting, spokenTransmission, start, stop };
}

export default function Home() {
  const { isBroadcasting, spokenTransmission, start, stop } = useRadioEngine();
  const [messageIndex, setMessageIndex] = useState(0);
  const [signalDrift, setSignalDrift] = useState(0.61);

  useEffect(() => {
    const ticker = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % transmissions.length);
      setSignalDrift(0.48 + Math.random() * 0.49);
    }, 3200);

    return () => window.clearInterval(ticker);
  }, []);

  const activeMessage = transmissions[messageIndex];
  const decodedFragments = useMemo(
    () => activeMessage.split('//').map((part) => part.trim()),
    [activeMessage]
  );

  return (
    <main className="radio-shell">
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">EARTH RADICAL CYBERPUNK PIRATE BAND</p>
          <h1>Radio Free Utopia</h1>
          <p className="manifesto">
            An outlaw console for coded messages from the utopian noosphere:
            static-drenched, fighter-pilot tense, and permanently aimed at planetary
            liberation.
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="signal-button"
              onClick={isBroadcasting ? stop : start}
            >
              {isBroadcasting ? 'Silence the Channel' : 'Start the Broadcast'}
            </button>
            <span className="status-chip">
              {isBroadcasting ? 'LIVE STATIC / CHANNEL OPEN' : 'AUDIO ARMED / USER ACTIVATE'}
            </span>
          </div>
        </div>

        <div className="signal-stage">
          <div className="dial-cluster">
            <div className="dial-ring">
              <div className="dial-core" />
            </div>
            <div className="dial-readout">
              <span>UTOPIA NOOSPHERE RELAY</span>
              <strong>13.77</strong>
              <span>PHANTOM SHORTWAVE</span>
            </div>
          </div>

          <div className="scope-frame">
            <div className="scope-scanline" />
            <div className="scope-grid" />
            <div className="scope-wave">
              {pulseBars.map((bar) => (
                <span
                  key={bar.id}
                  style={
                    {
                      '--bar-height': `${bar.height}px`,
                      '--bar-delay': `${bar.delay}s`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="data-strip" aria-label="Broadcast details">
        {bulletinRows.map((row) => (
          <div key={row.label} className="data-item">
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </section>

      <section className="terminal-grid">
        <article className="terminal-panel">
          <p className="panel-label">Current Message</p>
          <div className="terminal-output">
            {decodedFragments.map((fragment) => (
              <p key={fragment}>{fragment}</p>
            ))}
          </div>
          <p className="voice-readout">
            Voice channel: {isBroadcasting ? spokenTransmission : 'stand by for spoken relay'}
          </p>
        </article>

        <article className="terminal-panel">
          <p className="panel-label">Signal Integrity</p>
          <div className="signal-meter">
            <div className="signal-meter-track">
              <div
                className="signal-meter-fill"
                style={{ width: `${Math.round(signalDrift * 100)}%` }}
              />
            </div>
            <p>{Math.round(signalDrift * 100)}% decode confidence under static pressure</p>
          </div>
        </article>

        <article className="terminal-panel wide">
          <p className="panel-label">Decoded Fragments</p>
          <ul className="fragment-list">
            <li>Mutual aid constellations are transmitting beneath surveillance weather.</li>
            <li>Soil, signal, and memory are being rerouted away from extraction.</li>
            <li>Pilot-band urgency keeps the relay fast, mobile, and impossible to map.</li>
            <li>The noosphere answers in loops so the dream never drops off the spectrum.</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
