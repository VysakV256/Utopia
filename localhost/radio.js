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

const pulseBars = Array.from({ length: 24 }, (_, index) => ({
  height: 20 + ((index * 13) % 64),
  delay: (index % 6) * 0.18,
}));

const toggle = document.getElementById('broadcast-toggle');
const statusChip = document.getElementById('status-chip');
const terminalOutput = document.getElementById('terminal-output');
const voiceReadout = document.getElementById('voice-readout');
const signalFill = document.getElementById('signal-meter-fill');
const signalCopy = document.getElementById('signal-meter-copy');
const scopeWave = document.getElementById('scope-wave');

let messageIndex = 0;
let ticker = null;
let scheduler = null;
let speechTimeout = null;
let audioContext = null;
let staticNode = null;
let broadcasting = false;
let speechIndex = 0;
let voices = [];

const normalizeTransmission = (message) =>
  message
    .replace(' // ', '. ')
    .replace(/NOOSPHERE BURST/g, 'Noosphere burst')
    .replace(/\b(\d{2})\b/, (_, value) => Number(value).toString());

const renderWave = () => {
  pulseBars.forEach((bar) => {
    const node = document.createElement('span');
    node.style.height = `${bar.height}px`;
    node.style.animationDelay = `${bar.delay}s`;
    scopeWave.appendChild(node);
  });
};

const updateTransmissionPanel = () => {
  const message = transmissions[messageIndex];
  const fragments = message.split('//').map((part) => part.trim());
  terminalOutput.innerHTML = fragments.map((fragment) => `<p>${fragment}</p>`).join('');
  const drift = Math.round((0.48 + Math.random() * 0.49) * 100);
  signalFill.style.width = `${drift}%`;
  signalCopy.textContent = `${drift}% decode confidence under static pressure`;
};

const scheduleBurst = (ctx, masterGain, startTime) => {
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

const buildStaticBed = (ctx, masterGain) => {
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
  staticNode = source;
};

const pickVoice = () =>
  voices.find((voice) => /fred|zarvox|daniel|alex/i.test(voice.name)) ||
  voices.find((voice) => /en-/i.test(voice.lang)) ||
  null;

const queueSpeech = () => {
  if (!('speechSynthesis' in window)) return;

  const nextIndex = speechIndex % transmissions.length;
  const rawMessage = transmissions[nextIndex];
  const utterance = new SpeechSynthesisUtterance(normalizeTransmission(rawMessage));
  const voice = pickVoice();

  if (voice) utterance.voice = voice;

  utterance.rate = 0.78;
  utterance.pitch = 0.58;
  utterance.volume = 0.82;
  utterance.onstart = () => {
    voiceReadout.textContent = `Voice channel: ${rawMessage}`;
  };
  utterance.onend = () => {
    speechIndex = (speechIndex + 1) % transmissions.length;
    speechTimeout = window.setTimeout(() => {
      if (broadcasting) queueSpeech();
    }, 900);
  };

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
};

const startBroadcast = async () => {
  if (broadcasting) return;

  audioContext = new window.AudioContext();
  const masterGain = audioContext.createGain();
  const compressor = audioContext.createDynamicsCompressor();
  masterGain.gain.value = 0.9;
  compressor.threshold.value = -24;
  compressor.knee.value = 20;
  compressor.ratio.value = 8;
  masterGain.connect(compressor);
  compressor.connect(audioContext.destination);

  buildStaticBed(audioContext, masterGain);

  let nextTime = audioContext.currentTime + 0.08;
  scheduleBurst(audioContext, masterGain, nextTime);
  nextTime += 1.55;
  scheduler = window.setInterval(() => {
    while (nextTime < audioContext.currentTime + 0.35) {
      scheduleBurst(audioContext, masterGain, nextTime);
      nextTime += 1.55;
    }
  }, 120);

  broadcasting = true;
  queueSpeech();

  toggle.textContent = 'Silence the Channel';
  statusChip.textContent = 'LIVE STATIC / CHANNEL OPEN';
};

const stopBroadcast = async () => {
  broadcasting = false;
  if (scheduler) {
    window.clearInterval(scheduler);
    scheduler = null;
  }
  if (speechTimeout) {
    window.clearTimeout(speechTimeout);
    speechTimeout = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (staticNode) {
    staticNode.stop();
    staticNode = null;
  }
  if (audioContext) {
    await audioContext.close();
    audioContext = null;
  }

  toggle.textContent = 'Start the Broadcast';
  statusChip.textContent = 'AUDIO ARMED / USER ACTIVATE';
  voiceReadout.textContent = 'Voice channel: stand by for spoken relay';
};

toggle.addEventListener('click', () => {
  if (broadcasting) {
    void stopBroadcast();
  } else {
    void startBroadcast();
  }
});

if ('speechSynthesis' in window) {
  const syncVoices = () => {
    voices = window.speechSynthesis.getVoices();
  };
  syncVoices();
  window.speechSynthesis.addEventListener('voiceschanged', syncVoices);
}

renderWave();
updateTransmissionPanel();
ticker = window.setInterval(() => {
  messageIndex = (messageIndex + 1) % transmissions.length;
  updateTransmissionPanel();
}, 3200);

window.addEventListener('beforeunload', () => {
  if (ticker) window.clearInterval(ticker);
  void stopBroadcast();
});
