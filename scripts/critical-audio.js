const MODULE_ID = "evil-coc7-card";
const VOLUME_SETTING = "criticalSoundVolume";
const CUES = {
  critical: new URL("../assets/audio/critical-success.mp3", import.meta.url).href,
  fumble: new URL("../assets/audio/fumble.mp3", import.meta.url).href
};

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, VOLUME_SETTING, {
    name: "EVILCOC7CARD.Settings.CriticalSoundVolume",
    hint: "EVILCOC7CARD.Settings.CriticalSoundVolumeHint",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 100, step: 1 },
    default: 20
  });
});

function createSound(audio, src) {
  return audio.create({ src, context: audio.environment, singleton: false });
}

Hooks.once("ready", () => {
  const audio = game.audio;
  if (game.system.id !== "CoC7" || !audio?.environment) return;
  for (const src of Object.values(CUES)) {
    // Warm Foundry's local audio cache. Playback retries if preloading fails.
    void createSound(audio, src).load().catch(() => {});
  }
});

function warnAudio(error) {
  console.warn(`${MODULE_ID} | Impossible de jouer le son de la carte.`, error);
}

export function playCriticalSound(state, canPlay) {
  const audio = game.audio;
  const src = CUES[state];
  if (!src || !audio?.environment || !canPlay()) return;
  if (game.settings.get(MODULE_ID, VOLUME_SETTING) === 0) return;

  let cancelled = false;
  const sound = createSound(audio, src);
  const stop = (fade = 0) => {
    cancelled = true;
    void sound.stop({ fade }).catch(warnAudio);
  };

  void (async () => {
    await sound.load();
    if (cancelled || !canPlay() || audio.locked) return;
    const volume = game.settings.get(MODULE_ID, VOLUME_SETTING) / 100;
    if (volume <= 0) return;
    await sound.play({ volume, loop: false });
    if (cancelled || !canPlay()) stop();
  })().catch(warnAudio);

  return stop;
}
