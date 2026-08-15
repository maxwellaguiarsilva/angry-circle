import { test, expect } from "bun:test";
import { AudioSynth, OSCILLATOR_TYPES } from "../src/engine/audio.js";

function makeAudioParam() {
  const events = [];
  return {
    events,
    setValueAtTime(value, time) {
      events.push(["setValueAtTime", value, time]);
    },
    exponentialRampToValueAtTime(value, time) {
      events.push(["exponentialRampToValueAtTime", value, time]);
    },
  };
}

function makeNode(kind) {
  return {
    kind,
    connections: [],
    type: null,
    frequency: makeAudioParam(),
    gain: makeAudioParam(),
    startedAt: null,
    stoppedAt: null,
    connect(target) {
      this.connections.push(target);
    },
    start(time) {
      this.startedAt = time;
    },
    stop(time) {
      this.stoppedAt = time;
    },
  };
}

function makeContext() {
  const oscillator = makeNode("oscillator");
  const gain = makeNode("gain");
  const resumes = [];
  return {
    currentTime: 1.5,
    destination: {},
    oscillator,
    gain,
    resumes,
    createOscillator() {
      return oscillator;
    },
    createGain() {
      return gain;
    },
    resume() {
      resumes.push(1);
      return Promise.resolve();
    },
  };
}

function makeSynth({ context = makeContext() } = {}) {
  const synth = new AudioSynth({ context });
  return { context, synth };
}

test("constructor stores the injected audio context", () => {
  const context = makeContext();
  const synth = new AudioSynth({ context });
  expect(synth.context).toBe(context);
});

test("constructor throws on missing context", () => {
  expect(() => new AudioSynth({})).toThrow('missing dependency "context"');
});

test("constructor throws on invalid context", () => {
  expect(() => new AudioSynth({ context: null })).toThrow("must be an AudioContext");
  expect(() => new AudioSynth({ context: 42 })).toThrow("must be an AudioContext");
});

test("constructor throws on a context without resume", () => {
  const context = { currentTime: 0, destination: {} };
  expect(() => new AudioSynth({ context })).toThrow('"resume"');
});

test("unlock resumes the audio context for autoplay", async () => {
  const { context, synth } = makeSynth();
  const result = synth.unlock();
  expect(context.resumes.length).toBe(1);
  await result;
});

test("tone builds an oscillator and gain chain to the destination", () => {
  const { context, synth } = makeSynth();
  synth.tone({ frequency: 440, duration: 0.3, type: "sine", volume: 0.5 });
  expect(context.oscillator.connections).toEqual([context.gain]);
  expect(context.gain.connections).toEqual([context.destination]);
});

test("tone sets the oscillator waveform and frequency from the injected params", () => {
  const { context, synth } = makeSynth();
  synth.tone({ frequency: 330, duration: 0.2, type: "triangle", volume: 0.4 });
  expect(context.oscillator.type).toBe("triangle");
  expect(context.oscillator.frequency.events).toEqual([["setValueAtTime", 330, 1.5]]);
});

test("tone applies a volume envelope on the gain node across the duration", () => {
  const { context, synth } = makeSynth();
  synth.tone({ frequency: 220, duration: 0.5, type: "square", volume: 0.7 });
  const gainEvents = context.gain.gain.events;
  expect(gainEvents[0]).toEqual(["setValueAtTime", 0.7, 1.5]);
  expect(gainEvents[1][0]).toBe("exponentialRampToValueAtTime");
  expect(gainEvents[1][1]).toBeLessThan(0.001);
  expect(gainEvents[1][2]).toBe(2.0);
});

test("tone starts and stops the oscillator across the duration", () => {
  const { context, synth } = makeSynth();
  synth.tone({ frequency: 440, duration: 0.25, type: "sine", volume: 0.5 });
  expect(context.oscillator.startedAt).toBe(1.5);
  expect(context.oscillator.stoppedAt).toBe(1.75);
});

test("tone validates its arguments", () => {
  const { synth } = makeSynth();
  expect(() => synth.tone({ frequency: 0, duration: 0.3, type: "sine", volume: 0.5 })).toThrow(
    "frequency",
  );
  expect(() => synth.tone({ frequency: 440, duration: 0, type: "sine", volume: 0.5 })).toThrow(
    "duration",
  );
  expect(() => synth.tone({ frequency: 440, duration: 0.3, type: "noise", volume: 0.5 })).toThrow(
    "one of",
  );
  expect(() => synth.tone({ frequency: 440, duration: 0.3, type: "sine", volume: 0 })).toThrow(
    "volume",
  );
  expect(() => synth.tone({ frequency: 440, duration: 0.3, type: "sine", volume: 1.5 })).toThrow(
    "volume",
  );
});

test("audio module contains no game literals", () => {
  const source = `${AudioSynth.toString()} ${AudioSynth.prototype.tone.toString()}`;
  expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}/);
});

test("OSCILLATOR_TYPES covers the standard Web Audio waveforms", () => {
  expect(OSCILLATOR_TYPES).toEqual(["sine", "square", "sawtooth", "triangle", "custom"]);
});
