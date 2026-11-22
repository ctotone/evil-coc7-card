import { playCriticalSound, unlockCriticalAudio } from "./critical-audio.js";

const MODULE_ID = "evil-coc7-card";
const CRITICAL_CARDS_SETTING = "criticalCardsEnabled";
const liveMessages = new Map();
let playback = Promise.resolve();
let activeOverlay;
let testMode;

function criticalCardsEnabled() {
  return game.settings.get(MODULE_ID, CRITICAL_CARDS_SETTING);
}

function isConcealedMelee(load) {
  return !game.user.isGM && load?.as === "CoC7ChatCombatMelee" && load.checkRevealed === false;
}

function trackMessage(messageId) {
  const tracked = { seen: new Set(), testMode };
  liveMessages.set(messageId, tracked);
  return tracked;
}

Hooks.on("createChatMessage", (message) => {
  if (game.system.id === "CoC7" && message.isContentVisible === true
    && criticalCardsEnabled() && !isConcealedMelee(message.flags?.CoC7?.load)) {
    trackMessage(message.id);
  }
});

Hooks.on("updateChatMessage", (message) => {
  if (message.isContentVisible !== true || isConcealedMelee(message.flags?.CoC7?.load)) {
    forgetMessage(message);
  }
});

Hooks.on("deleteChatMessage", forgetMessage);

export function registerCriticalOverlay({ detectState }) {
  Hooks.once("init", () => {
    game.settings.register(MODULE_ID, CRITICAL_CARDS_SETTING, {
      name: "EVILCOC7CARD.Settings.CriticalCardsEnabled",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: (enabled) => {
        if (enabled) return;
        liveMessages.clear();
        activeOverlay?.dialog.close();
      }
    });

    const module = game.modules.get(MODULE_ID);
    module.api ??= {};
    module.api.testCriticalOverlay = (state, options) => testCriticalOverlay(state, detectState, options);
    module.api.setCriticalTestMode = setCriticalTestMode;
  });
}

function setCriticalTestMode(enabled = !testMode) {
  if (game.system.id !== "CoC7" || !game.user.isGM) {
    throw new Error("Ce test est réservé au MJ dans un monde CoC7.");
  }
  if (typeof enabled !== "boolean") throw new TypeError("Utiliser true ou false.");
  testMode = enabled ? testMode ?? Symbol("live-critical-test") : undefined;
  if (!enabled && activeOverlay?.isSimulated) activeOverlay.dialog.close();
  return enabled;
}

async function testCriticalOverlay(state, detectState, { actor = game.user.character } = {}) {
  if (game.system.id !== "CoC7" || !game.user.isGM) {
    throw new Error("Ce test est réservé au MJ dans un monde CoC7.");
  }
  if (state !== "critical" && state !== "fumble") {
    throw new Error("Choisir critical ou fumble.");
  }
  if (!criticalCardsEnabled()) {
    ui.notifications.info(game.i18n.localize("EVILCOC7CARD.Settings.CriticalCardsDisabled"));
    return;
  }
  void unlockCriticalAudio();

  const message = { id: Symbol("critical-overlay-test"), isContentVisible: true, speakerActor: actor };
  const content = document.createElement("div");
  content.innerHTML = '<div class="dice-roll"><div class="dice-result"><h4 class="dice-total"></h4></div></div>';
  const total = content.querySelector(".dice-total");
  total.classList.add(state);
  total.textContent = state === "critical" ? "01" : "98";
  trackMessage(message.id);
  try {
    await observeCriticalCard(message, content, { as: "CoC7Check" }, {
      detectState,
      resolveCheckName: () => game.i18n.localize("CoC7.Roll")
    });
  } finally {
    forgetMessage(message);
  }
}

function forgetMessage(message) {
  liveMessages.delete(message.id);
  if (activeOverlay?.messageId === message.id) activeOverlay.dialog.close();
}

export function observeCriticalCard(message, content, load, { detectState, resolveCheckName, resolveUuidDocument }) {
  if (message.isContentVisible !== true || !criticalCardsEnabled()) return;
  if (isConcealedMelee(load)) {
    forgetMessage(message);
    return;
  }
  const isMelee = load.as === "CoC7ChatCombatMelee";
  const isRanged = load.as === "CoC7ChatCombatRanged";
  const isCheck = [
    "CoC7Check", "CoC7ConCheck", "CoC7ChatCombinedMessage",
    "CoC7ChatOpposedMessage", "CoC7ChatCombatMelee"
  ].includes(load.as);
  if ((!isCheck && !isRanged) || load.isStandby) return;
  if (isRanged && load.weaponRolled !== true) return;

  const rolls = content.querySelectorAll(isRanged
    ? ":scope > .ranged-results > .dice-roll"
    : ".dice-roll");
  let tracked = liveMessages.get(message.id);
  // A melee preparation card can already be open when the client joins or reloads.
  if (!tracked && isMelee && !rolls.length && message.rolls?.length === 0) {
    tracked = trackMessage(message.id);
  }
  if (!tracked) return;
  const { seen } = tracked;
  const groups = [...content.querySelectorAll(":scope > .coc7-group-actor-roll")];
  const participantSlots = new Map();
  rolls.forEach((roll, index) => {
    // The Keeper can already see the attack result before the public reveal.
    if (isMelee && !game.user.isGM && roll.closest(".keeper-only-block")) {
      forgetMessage(message);
      return;
    }
    const group = roll.closest(".coc7-group-actor-roll");
    const participant = group?.querySelector(":scope > .actor-portrait");
    const portraitImage = participant?.querySelector("img.portrait");
    const header = group ? roll.previousElementSibling : null;
    const participantUuid = group && getParticipantUuid(group, participant, portraitImage, load, groups);
    const offset = header?.querySelector("[data-actor-roll-offset]")?.dataset.actorRollOffset;
    let slot = index;
    if (participantUuid) {
      const ordinal = participantSlots.get(participantUuid) ?? 0;
      participantSlots.set(participantUuid, ordinal + 1);
      slot = `${participantUuid}:${offset ?? ordinal}`;
    }
    if (seen.has(slot)) return;
    const total = roll.querySelector(isRanged
      ? ":scope > .dice-result > .dice-formula"
      : ":scope > .dice-result > .dice-total");
    if (!total) return;
    const value = total.textContent.trim().match(/^(100|0?[1-9]|[1-9]\d)(?!\d)/u)?.[1];
    if (!value) return;
    if (isMelee && !tracked.meleeResultSeen) {
      tracked.meleeResultSeen = true;
      tracked.testMode = testMode;
    }
    const nativeState = detectState(total);
    const isSimulated = nativeState !== "critical" && nativeState !== "fumble";
    const state = isSimulated
      ? getSimulatedState(roll, nativeState, tracked)
      : nativeState;
    if (!state) return;
    const meleeUuid = Number(load.participant) === 1 ? load.targetUuid : load.attackerUuid;
    const uuid = participantUuid || (!group ? load.actorUuid || (isMelee ? meleeUuid : undefined) : undefined);
    const nativePortrait = portraitImage?.getAttribute("src")?.trim()
      || getParticipantData(load, participantUuid)?.portrait;
    const nativeLabel = header?.querySelector(".coc7-tags .tag")?.textContent.trim()
      || content.querySelector(".coc7-chat-header .card-title")?.textContent.trim();
    seen.add(slot);
    const isPreview = typeof message.id === "symbol";
    const diceFinished = isPreview ? undefined : waitForDice(message.id);
    const canDisplay = () => liveMessages.get(message.id) === tracked
      && message.isContentVisible === true
      && criticalCardsEnabled()
      && (!isSimulated || testMode === tracked.testMode);
    playback = playback.then(async () => {
      await diceFinished;
      if (!canDisplay()) return;
      const actorDocument = await resolvePortraitDocument(uuid, resolveUuidDocument);
      if (!canDisplay()) return;
      const actor = actorDocument?.actor ?? actorDocument ?? (!group ? message.speakerActor : undefined);
      const label = nativeLabel || (load.as === "CoC7ConCheck"
        ? game.i18n.localize("CoC7.ConstitutionCheck")
        : resolveCheckName(load, actor, message.flavor));
      const event = {
        state,
        value: value.padStart(2, "0"),
        label,
        portrait: actor?.img || actor?.portrait || nativePortrait,
        fallbackPortrait: nativePortrait
      };
      await showOverlay(message.id, event, isPreview, isSimulated);
    }).catch((error) => {
      console.warn("evil-coc7-card | Impossible d'afficher l'animation.", error);
    });
  });
  return playback;
}

function getParticipantData(load, uuid) {
  return uuid && load.actorRolls?.[uuid.replaceAll(".", "/")];
}

function getParticipantUuid(group, participant, portraitImage, load, groups) {
  const uuids = Array.isArray(load.actorUuids)
    ? load.actorUuids.map((uuid) => uuid.replaceAll("/", "."))
    : [];
  const embeddedUuids = [
    participant?.dataset.actorUuid,
    portraitImage?.dataset.actorUuid,
    ...Array.from(group.querySelectorAll("[data-actor-uuid]"), (element) => element.dataset.actorUuid)
  ];
  for (const embeddedUuid of embeddedUuids) {
    const uuid = embeddedUuid?.trim().replaceAll("/", ".");
    if (uuid && (!uuids.length || uuids.includes(uuid))) return uuid;
  }

  const name = portraitImage?.dataset.tooltip?.trim();
  const image = portraitImage?.getAttribute("src")?.trim();
  const hasAttacker = groups.some((entry) => entry.classList.contains("attacker"));
  const isDefender = participant?.querySelector('[data-action="participant"] .game-icon-shield')
    || (load.isCombat && groups.length === 2 && uuids.length === 2 && hasAttacker
      && uuids.some((uuid) => getParticipantData(load, uuid)?.participant === "A"));
  const role = group.classList.contains("attacker") ? "A" : isDefender ? "D" : undefined;
  for (const [key, value] of [["participant", role], ["name", name], ["portrait", image]]) {
    if (!value) continue;
    const candidates = uuids.filter((uuid) => getParticipantData(load, uuid)?.[key] === value);
    if (candidates.length === 1) return candidates[0];
  }

  // CoC7 can reorder opposed combat groups by outcome independently of actorUuids.
  if (!(load.as === "CoC7ChatOpposedMessage" && load.isCombat) && groups.length === uuids.length) {
    return uuids[groups.indexOf(group)];
  }
}

async function resolvePortraitDocument(uuid, resolveUuidDocument) {
  if (!uuid) return;
  const document = resolveUuidDocument?.(uuid) ?? game.actors?.get(uuid);
  if (document?.actor || document?.img || typeof fromUuid !== "function") return document;
  try {
    return await fromUuid(uuid);
  } catch {
    return document;
  }
}

function getSimulatedState(roll, nativeState, tracked) {
  if (!testMode || tracked.testMode !== testMode || !game.user.isGM) return;
  const formula = roll.querySelector(":scope > .dice-result > .dice-formula");
  if (formula?.classList.contains("failure")) return "fumble";
  if (formula?.classList.contains("success")) return "critical";
  if (nativeState === "failure") return "fumble";
  if (["regular", "hard", "extreme"].includes(nativeState)) return "critical";
}

async function waitForDice(messageId) {
  if (!game.dice3d?.waitFor3DAnimationByMessageID) return;
  let timeout;
  try {
    await Promise.race([
      game.dice3d.waitFor3DAnimationByMessageID(messageId),
      new Promise((resolve) => { timeout = setTimeout(resolve, 8000); })
    ]);
  } catch {
    // The overlay can still play when the optional integration fails.
  } finally {
    clearTimeout(timeout);
  }
}

function showOverlay(messageId, { state, value, label, portrait, fallbackPortrait }, isPreview, isSimulated) {
  const dialog = document.createElement("dialog");
  dialog.className = `evil-coc7-critical-overlay evil-coc7-critical-overlay--${state}`;
  dialog.classList.add("evil-coc7-critical-overlay--pending");
  if (isPreview) dialog.classList.add("evil-coc7-critical-overlay--preview");
  const titleKey = state === "critical" ? "CoC7.CriticalSuccess" : "CoC7.Fumble";
  const titleText = state === "fumble" && game.i18n.lang === "fr"
    ? "Maladresse"
    : game.i18n.localize(titleKey);
  dialog.setAttribute("aria-label", titleText);

  const card = document.createElement("div");
  card.className = "evil-coc7-critical-event-card";
  const title = document.createElement("h2");
  title.textContent = titleText;
  const skill = document.createElement("p");
  skill.textContent = label;
  const result = document.createElement("strong");
  result.textContent = value;
  card.append(title, skill, result);
  if (portrait) {
    const image = document.createElement("img");
    image.alt = "";
    image.addEventListener("error", () => {
      if (fallbackPortrait && image.getAttribute("src") !== fallbackPortrait) {
        image.src = fallbackPortrait;
      } else {
        image.remove();
      }
    });
    image.src = portrait;
    card.append(image);
  }
  const ambience = document.createElement("div");
  ambience.className = "evil-coc7-critical-ambience";
  ambience.setAttribute("aria-hidden", "true");
  const background = document.createElement("div");
  background.className = "evil-coc7-critical-background";
  background.setAttribute("aria-hidden", "true");
  dialog.append(background, ambience, card);
  document.body.append(dialog);

  try {
    dialog.showModal();
  } catch (error) {
    dialog.remove();
    throw error;
  }

  activeOverlay = { messageId, dialog, isSimulated };
  return new Promise((resolve) => {
    let fadeSound;
    let closeTimer;
    let closing = false;
    const closeWithFade = async () => {
      if (closing || !dialog.open) return;
      closing = true;
      cancelAnimationFrame(frame);
      clearTimeout(closeTimer);
      fadeSound?.();
      fadeSound = undefined;
      try {
        const fade = dialog.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 1100,
          easing: "ease-in-out",
          fill: "forwards"
        });
        await fade.finished;
      } catch {
        // A hidden or deleted message can cancel the animation immediately.
      } finally {
        if (dialog.open) dialog.close();
      }
    };
    // Give the native dialog a paint at the first keyframe before starting.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        dialog.classList.remove("evil-coc7-critical-overlay--pending");
        try {
          fadeSound = playCriticalSound(state);
        } catch (error) {
          console.warn("evil-coc7-card | Impossible de jouer le son de la carte.", error);
        }
        closeTimer = setTimeout(closeWithFade, state === "fumble" ? 9000 : 6400);
      });
    });
    dialog.addEventListener("click", closeWithFade);
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      void closeWithFade();
    });
    dialog.addEventListener("close", () => {
      cancelAnimationFrame(frame);
      clearTimeout(closeTimer);
      activeOverlay = undefined;
      dialog.remove();
      resolve();
      fadeSound?.();
    }, { once: true });
  });
}
