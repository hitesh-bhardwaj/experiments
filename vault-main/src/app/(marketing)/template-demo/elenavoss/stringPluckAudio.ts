let audioContext: AudioContext | null = null;

let masterGain: GainNode | null = null;
let reverbSend: GainNode | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!audioContext) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
    buildOutputStage(audioContext);
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }

  return audioContext;
}

const REVERB_SECONDS = 2.2;

const REVERB_MIX = 0.42;
const MASTER_LEVEL = 1.0;

function buildOutputStage(ctx: AudioContext): void {
  masterGain = ctx.createGain();
  masterGain.gain.value = MASTER_LEVEL;

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -14;
  limiter.knee.value = 12;
  limiter.ratio.value = 4;
  limiter.attack.value = 0.006;
  limiter.release.value = 0.22;

  masterGain.connect(limiter);
  limiter.connect(ctx.destination);

  const length = Math.floor(ctx.sampleRate * REVERB_SECONDS);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);

  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const progress = i / length;

      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - progress, 1.8);
    }
  }

  const convolver = ctx.createConvolver();
  convolver.buffer = impulse;

  reverbSend = ctx.createGain();
  reverbSend.gain.value = REVERB_MIX;
  reverbSend.connect(convolver);
  convolver.connect(masterGain);
}

const SCALE_HZ = [
  146.83,
  164.81,
  196.00,
  220.00,
  261.63,
  293.66,
  329.63,
  392.00,
];

const MAX_DISPLACEMENT = 60;
const MIN_STRENGTH = 0.05;

const MIN_GAIN = 0.16;
const MAX_GAIN = 0.5;

const DECAY_SECONDS = 3.2;

const STRING_DAMPING = 0.996;

const DAMPING_BY_STRENGTH = 0.003;

const BODY_RESONANCES = [
  { frequency: 100, q: 1.2, gain: 0.5 },
  { frequency: 220, q: 2.0, gain: 0.3 },
];

let scalePosition = 0;

export function playStringPluck(displacement: number): void {
  const ctx = getAudioContext();
  if (!ctx || !masterGain || !reverbSend) return;

  const strength = Math.min(Math.abs(displacement) / MAX_DISPLACEMENT, 1);

  if (strength < MIN_STRENGTH) return;

  scalePosition = (scalePosition + 1 + Math.floor(Math.random() * 2)) % SCALE_HZ.length;
  const detune = 1 + (Math.random() * 2 - 1) * 0.004;
  const frequency = SCALE_HZ[scalePosition] * detune;

  const sampleRate = ctx.sampleRate;
  const period = Math.max(2, Math.floor(sampleRate / frequency));
  const length = Math.floor(sampleRate * DECAY_SECONDS);

  const buffer = ctx.createBuffer(1, length, sampleRate);
  const samples = buffer.getChannelData(0);

  const ring = new Float32Array(period);
  let smoothed = 0;

  const seedBrightness = 0.1 + strength * 0.12;
  for (let i = 0; i < period; i += 1) {
    const white = Math.random() * 2 - 1;
    smoothed += (white - smoothed) * seedBrightness;

    const attack = Math.min(1, i / (period * 0.4));
    ring[i] = smoothed * attack;
  }

  const damping = STRING_DAMPING - (1 - strength) * DAMPING_BY_STRENGTH;
  let index = 0;
  let previous = 0;
  for (let i = 0; i < length; i += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % period];

    const averaged = (current + next) * 0.5;
    const filtered = averaged * 0.75 + previous * 0.25;
    previous = filtered;
    ring[index] = filtered * damping;
    samples[i] = current;
    index = (index + 1) % period;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 750 + strength * 700;
  tone.Q.value = 0.5;

  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 70;

  source.connect(tone);
  tone.connect(highpass);

  const bodyMix = ctx.createGain();
  bodyMix.gain.value = 1;
  highpass.connect(bodyMix);

  BODY_RESONANCES.forEach(({ frequency: bodyFreq, q, gain: bodyGain }) => {
    const resonator = ctx.createBiquadFilter();
    resonator.type = "bandpass";
    resonator.frequency.value = bodyFreq;
    resonator.Q.value = q;

    const resonatorGain = ctx.createGain();
    resonatorGain.gain.value = bodyGain;

    highpass.connect(resonator);
    resonator.connect(resonatorGain);
    resonatorGain.connect(bodyMix);
  });

  const envelope = ctx.createGain();
  const peakGain = MIN_GAIN + (MAX_GAIN - MIN_GAIN) * strength;
  const now = ctx.currentTime;
  envelope.gain.setValueAtTime(0.0001, now);

  envelope.gain.exponentialRampToValueAtTime(peakGain, now + 0.025);
  envelope.gain.exponentialRampToValueAtTime(peakGain * 0.45, now + 0.6);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + DECAY_SECONDS);

  bodyMix.connect(envelope);

  const panner = ctx.createStereoPanner?.();
  if (panner) {
    panner.pan.value = (Math.random() * 2 - 1) * 0.35;
    envelope.connect(panner);
    panner.connect(masterGain);
    panner.connect(reverbSend);
  } else {
    envelope.connect(masterGain);
    envelope.connect(reverbSend);
  }

  source.start(now);
  source.stop(now + DECAY_SECONDS);

  source.onended = () => {
    source.disconnect();
    tone.disconnect();
    highpass.disconnect();
    bodyMix.disconnect();
    envelope.disconnect();
    panner?.disconnect();
  };
}
