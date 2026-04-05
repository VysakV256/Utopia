class AudioManager {
  public isActive: boolean = false;
  private audioContext: AudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private stream: MediaStream | null = null;

  async start() {
    if (this.isActive) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.stream = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyzer = audioCtx.createAnalyser();

      analyzer.fftSize = 256;
      source.connect(analyzer);

      this.audioContext = audioCtx;
      this.analyzer = analyzer;
      this.dataArray = new Uint8Array(analyzer.frequencyBinCount);

      this.isActive = true;
    } catch (err) {
      console.error('Failed to start audio analyzer:', err);
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
    }
    this.isActive = false;
  }

  getAmplitude(): number {
    if (!this.isActive || !this.analyzer || !this.dataArray) {
      return 0.0;
    }
    this.analyzer.getByteFrequencyData(this.dataArray as any);
    const sum = this.dataArray.reduce((acc, val) => acc + val, 0);
    const average = sum / this.dataArray.length;
    // Scale slightly to make quieter noises more visually apparent without maxing out
    const amplitude = average / 255.0;
    return Math.min(amplitude * 1.5, 1.0); 
  }
}

export const audioManager = new AudioManager();
