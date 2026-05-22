// Procedural audio via Web Audio API
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientLFO: OscillatorNode | null = null;

  masterVolume = 0.8;
  sfxVolume = 0.8;

  private ensureCtx() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.15;
      this.ambientGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setMasterVolume(v: number) {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.value = this.masterVolume;
  }

  setSFXVolume(v: number) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
  }

  playAmbient() {
    const ctx = this.ensureCtx();
    if (this.ambientOsc) return;

    // Deep drone
    this.ambientOsc = ctx.createOscillator();
    this.ambientOsc.type = 'sine';
    this.ambientOsc.frequency.value = 55;

    this.ambientLFO = ctx.createOscillator();
    this.ambientLFO.type = 'sine';
    this.ambientLFO.frequency.value = 0.1;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 5;
    this.ambientLFO.connect(lfoGain);
    lfoGain.connect(this.ambientOsc.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 2;

    this.ambientOsc.connect(filter);
    filter.connect(this.ambientGain!);
    this.ambientOsc.start();
    this.ambientLFO.start();

    // Second harmonic
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 82.5;
    const g2 = ctx.createGain();
    g2.gain.value = 0.06;
    osc2.connect(g2);
    g2.connect(this.ambientGain!);
    osc2.start();
  }

  playBowDraw() {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;

    // Tension sound — rising filtered noise
    const noise = this.createNoise(ctx, 0.5);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.linearRampToValueAtTime(800, t + 0.5);
    filter.Q.value = 8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.3);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
  }

  playBowRelease(power: number) {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;

    // Twang
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300 + power * 200, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2 + power * 0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 150;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.3);

    // Whoosh (air)
    const noise = this.createNoise(ctx, 0.4);
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.setValueAtTime(2000, t);
    nFilter.frequency.exponentialRampToValueAtTime(500, t + 0.4);
    nFilter.Q.value = 2;

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.08, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(this.sfxGain!);
  }

  playTargetHit(zone: string) {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;

    // Impact sound
    const freqMap: Record<string, number> = {
      bullseye: 880,
      inner: 660,
      outer: 440,
      edge: 330,
    };
    const freq = freqMap[zone] || 440;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 2, t + 0.05);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.4);

    // Shatter noise
    const noise = this.createNoise(ctx, 0.15);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.1, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxGain!);

    // Bullseye gets extra sparkle
    if (zone === 'bullseye') {
      for (let i = 0; i < 3; i++) {
        const sparkle = ctx.createOscillator();
        sparkle.type = 'sine';
        sparkle.frequency.value = 1200 + i * 400;
        const sg = ctx.createGain();
        sg.gain.setValueAtTime(0, t + i * 0.08);
        sg.gain.linearRampToValueAtTime(0.08, t + i * 0.08 + 0.02);
        sg.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.15);
        sparkle.connect(sg);
        sg.connect(this.sfxGain!);
        sparkle.start(t + i * 0.08);
        sparkle.stop(t + i * 0.08 + 0.15);
      }
    }
  }

  playMiss() {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  playArrowGround() {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;

    // Thud
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  playGameStart() {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.12, t + i * 0.12 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.2);
    });
  }

  playGameEnd() {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    const notes = [659, 554, 440, 330, 440];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.1, t + i * 0.15 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + i * 0.15);
      osc.stop(t + i * 0.15 + 0.3);
    });
  }

  playRoundAdvance() {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.linearRampToValueAtTime(880, t + 0.15);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  playComboChime(comboLevel: number) {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    const baseFreq = 600 + comboLevel * 100;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = baseFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  private createNoise(ctx: AudioContext, duration: number): AudioBufferSourceNode {
    const sampleRate = ctx.sampleRate;
    const samples = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.start();
    return source;
  }
}
