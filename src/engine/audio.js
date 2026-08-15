export const OSCILLATOR_TYPES = ["sine", "square", "sawtooth", "triangle", "custom"];

export class AudioSynth {
  constructor({ context }) {
    if (context === undefined) {
      throw new Error('AudioSynth: missing dependency "context" (Web Audio AudioContext).');
    }
    if (context === null || typeof context !== "object") {
      throw new Error("AudioSynth: dependency \"context\" must be an AudioContext object.");
    }
    if (typeof context.resume !== "function") {
      throw new Error('AudioSynth: dependency "context" must expose "resume" (autoplay unlock).');
    }
    this.context = context;
  }

  unlock() {
    return this.context.resume();
  }

  tone({ frequency, duration, type, volume }) {
    if (typeof frequency !== "number" || !(frequency > 0)) {
      throw new Error("AudioSynth: tone requires a positive numeric frequency (Hz).");
    }
    if (typeof duration !== "number" || !(duration > 0)) {
      throw new Error("AudioSynth: tone requires a positive numeric duration (seconds).");
    }
    if (!OSCILLATOR_TYPES.includes(type)) {
      throw new Error(`AudioSynth: tone type must be one of ${OSCILLATOR_TYPES.join(", ")}.`);
    }
    if (typeof volume !== "number" || !(volume > 0) || volume > 1) {
      throw new Error("AudioSynth: tone volume must be a number in (0, 1].");
    }
    const start = this.context.currentTime;
    const stop = start + duration;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, stop);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(stop);
  }
}
