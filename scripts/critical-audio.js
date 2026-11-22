const CUES = {
  critical: {
    space: 0.75,
    tempoScale: 2.5,
    tones: [
      { type: "triangle", frequency: 73.42, delay: 0, attack: 0.24, duration: 1.2, volume: 0.39 },
      { type: "sine", frequency: 146.83, delay: 0.13, attack: 0.36, duration: 1.25, volume: 0.24 },
      { type: "triangle", frequency: 220, delay: 0.28, attack: 0.27, duration: 1.08, volume: 0.15 },
      { type: "sine", frequency: 349.23, delay: 0.42, attack: 0.19, duration: 0.92, volume: 0.18 },
      { type: "sine", frequency: 440, delay: 0.58, attack: 0.027, duration: 0.76, volume: 0.17 },
      { type: "sine", frequency: 668, delay: 0.59, attack: 0.014, duration: 0.40, volume: 0.085 },
      { type: "sine", frequency: 963, delay: 0.59, attack: 0.01, duration: 0.24, volume: 0.045 },
      { type: "sine", frequency: 1174.66, delay: 1.05, attack: 0.006, duration: 0.38, volume: 0.11 },
      { type: "sine", frequency: 1479.98, delay: 1.13, attack: 0.006, duration: 0.40, volume: 0.075 },
      { type: "sine", frequency: 1760, delay: 1.20, attack: 0.006, duration: 0.44, volume: 0.095 }
    ],
    textures: [
      { filter: "bandpass", frequency: 760, endFrequency: 1580, delay: 0, attack: 0.49, duration: 0.88, volume: 0.27 }
    ]
  },
  fumble: {
    space: 0.82,
    tempoScale: 2.15,
    tones: [
      { type: "sine", frequency: 48, delay: 0.055, attack: 0.013, duration: 1.65, volume: 0.64 },
      { type: "triangle", frequency: 71, delay: 0.07, attack: 0.025, duration: 0.94, volume: 0.40 },
      { type: "sine", frequency: 98, delay: 0.22, attack: 0.35, duration: 2.43, volume: 0.30 },
      { type: "sine", frequency: 101, delay: 0.27, attack: 0.44, duration: 2.55, volume: 0.24 },
      { type: "triangle", frequency: 139, delay: 0.35, attack: 0.45, duration: 2.24, volume: 0.16 },
      { type: "sine", frequency: 61, delay: 0.76, attack: 0.085, duration: 1.68, volume: 0.32 }
    ],
    textures: [
      { filter: "lowpass", frequency: 2900, endFrequency: 410, delay: 0.055, attack: 0.012, duration: 1.28, volume: 0.50 },
      { filter: "lowpass", frequency: 255, endFrequency: 105, delay: 0.12, attack: 0.38, duration: 3.05, volume: 0.50 },
      { filter: "bandpass", frequency: 960, delay: 0.38, attack: 0.012, duration: 0.21, volume: 0.48 },
      { filter: "bandpass", frequency: 620, delay: 0.77, attack: 0.018, duration: 0.34, volume: 0.38 },
      { filter: "bandpass", frequency: 490, delay: 1.19, attack: 0.027, duration: 0.50, volume: 0.25 }
    ]
  }
};

let context;
let noise;
let room;
const ROOM_SECONDS = 1.12;
const NOISE_SECONDS = Math.max(...Object.values(CUES).flatMap((cue) => (
  cue.textures.map((layer) => layer.duration * cue.tempoScale)
)));

export async function unlockCriticalAudio() {
  if (!globalThis.AudioContext) return;
  try {
    context ??= new AudioContext();
    if (context.state !== "running") await context.resume();
  } catch {
    // Browser audio permission never prevents the visual effect.
  }
}

Hooks.once("ready", () => {
  const listeners = new AbortController();
  const unlock = async () => {
    await unlockCriticalAudio();
    if (context?.state === "running") listeners.abort();
  };
  const options = { capture: true, signal: listeners.signal };
  document.addEventListener("pointerdown", unlock, options);
  document.addEventListener("keydown", unlock, options);
});

export function playCriticalSound(state) {
  if (context?.state !== "running") return;
  const cue = CUES[state];
  if (!cue) return;
  const start = context.currentTime + 0.015;
  const mix = context.createGain();
  const output = context.createGain();
  const reverb = context.createConvolver();
  const wet = context.createGain();
  reverb.buffer = room ??= createNoiseBuffer(2, ROOM_SECONDS, 3.2);
  wet.gain.value = cue.space;
  output.gain.value = 0.23;
  mix.connect(output);
  mix.connect(reverb);
  reverb.connect(wet);
  wet.connect(output);
  output.connect(context.destination);

  const layers = [...cue.tones, ...cue.textures];
  let remaining = layers.length;
  const disposeLayer = () => {
    if (--remaining > 0) return;
    setTimeout(() => {
      mix.disconnect();
      reverb.disconnect();
      wet.disconnect();
      output.disconnect();
    }, ROOM_SECONDS * 1000);
  };

  for (const tone of cue.tones) {
    const note = stretchLayer(tone, cue.tempoScale);
    const oscillator = context.createOscillator();
    oscillator.type = note.type;
    sweepFrequency(oscillator.frequency, note, start);
    scheduleLayer(oscillator, oscillator, note, start, mix, disposeLayer);
  }

  for (const textureLayer of cue.textures) {
    const texture = stretchLayer(textureLayer, cue.tempoScale);
    const source = context.createBufferSource();
    source.buffer = noise ??= createNoiseBuffer(1, NOISE_SECONDS);
    const filter = context.createBiquadFilter();
    filter.type = texture.filter;
    filter.Q.value = 0.85;
    sweepFrequency(filter.frequency, texture, start);
    source.connect(filter);
    scheduleLayer(source, filter, texture, start, mix, disposeLayer);
  }

  return () => {
    const now = context.currentTime;
    output.gain.setTargetAtTime(0, now, 0.012);
  };
}

function stretchLayer(layer, tempoScale) {
  return {
    ...layer,
    delay: layer.delay * tempoScale,
    duration: layer.duration * tempoScale,
    // Keep the hit and bell transients crisp while stretching slower swells.
    attack: layer.attack < 0.05 ? layer.attack : layer.attack * tempoScale
  };
}

function sweepFrequency(parameter, layer, start) {
  const time = start + layer.delay;
  parameter.setValueAtTime(layer.frequency, time);
  if (layer.endFrequency) {
    parameter.exponentialRampToValueAtTime(layer.endFrequency, time + layer.duration);
  }
}

function scheduleLayer(source, lastNode, layer, start, mix, disposeLayer) {
  const time = start + layer.delay;
  const end = time + layer.duration;
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0, time);
  envelope.gain.linearRampToValueAtTime(layer.volume, time + layer.attack);
  envelope.gain.exponentialRampToValueAtTime(0.001, end);
  lastNode.connect(envelope);
  envelope.connect(mix);
  source.onended = () => {
    source.disconnect();
    if (lastNode !== source) lastNode.disconnect();
    envelope.disconnect();
    disposeLayer();
  };
  source.start(time);
  source.stop(end);
}

function createNoiseBuffer(channels, seconds, decay = 0) {
  const frames = Math.ceil(context.sampleRate * seconds);
  const buffer = context.createBuffer(channels, frames, context.sampleRate);
  for (let channel = 0; channel < channels; channel++) {
    const samples = buffer.getChannelData(channel);
    for (let frame = 0; frame < frames; frame++) {
      samples[frame] = (Math.random() * 2 - 1) * (1 - frame / frames) ** decay;
    }
  }
  return buffer;
}
