const MODULE_ID = "evil-coc7-card";
const STANDARD_CARD_TYPE = "CoC7Check";
const MELEE_CARD_TYPE = "CoC7ChatCombatMelee";
const DAMAGE_CARD_TYPE = "CoC7ChatDamage";
const RANGED_CARD_TYPE = "CoC7ChatCombatRanged";
const OPPOSED_CARD_TYPE = "CoC7ChatOpposedMessage";
const COMBINED_CARD_TYPE = "CoC7ChatCombinedMessage";
const CON_CHECK_CARD_TYPE = "CoC7ConCheck";
const MELEE_INITIATOR = 0;
const MELEE_TARGET = 1;

const STATE_DEFINITIONS = {
  critical: {
    label: "CoC7.CriticalSuccess",
    fallbackIcon: "fa-medal"
  },
  extreme: {
    label: "CoC7.ExtremeSuccess",
    fallbackIcon: "fa-star"
  },
  hard: {
    label: "CoC7.HardSuccess",
    fallbackIcon: "fa-star"
  },
  regular: {
    label: "CoC7.RegularSuccess",
    fallbackIcon: "fa-star"
  },
  failure: {
    label: "CoC7.Failure",
    fallbackIcon: "fa-spider"
  },
  fumble: {
    label: "CoC7.Fumble",
    fallbackIcon: "fa-skull"
  },
  unknown: {
    label: "",
    fallbackIcon: "fa-dice-d20"
  }
};

const ATTRIBUTE_LABELS = {
  lck: "CoC7.Luck",
  san: "CoC7.Sanity",
  hp: "CoC7.HitPoints",
  mp: "CoC7.MagicPoints",
  build: "CoC7.Build"
};

const MODULE_I18N_PREFIX = "EVILCOC7CARD";

const MODULE_STATE_LABEL_KEYS = {
  critical: "Result.Critical",
  extreme: "Result.Extreme",
  hard: "Result.Hard",
  regular: "Result.Regular",
  failure: "Result.Failure",
  fumble: "Result.Fumble"
};

function localizeModule(key, data = {}) {
  const fullKey = `${MODULE_I18N_PREFIX}.${key}`;
  const values = data && typeof data === "object" ? data : {};
  const hasValues = Object.keys(values).length > 0;

  if (hasValues && game.i18n?.format) {
    return game.i18n.format(fullKey, values);
  }

  const localized = game.i18n.localize(fullKey);
  if (!hasValues) return localized;

  return localized.replace(/\{(\w+)\}/g, (match, name) => (
    Object.hasOwn(values, name) ? String(values[name]) : match
  ));
}

Hooks.on("renderChatMessageHTML", (message, html) => {
  try {
    if (game.system.id !== "CoC7") return;

    const load = message.flags?.CoC7?.load ?? {};
    const content = html.querySelector(".message-content");
    if (!content) return;

    if (load.as === STANDARD_CARD_TYPE && !load.isStandby) {
      const rolls = [...content.querySelectorAll(".dice-roll")];
      if (!rolls.length) return;

      decorateStandardRollMessage(message, html, content, rolls);
      return;
    }

    if (load.as === CON_CHECK_CARD_TYPE) {
      const rolls = [...content.querySelectorAll(".dice-roll")];

      if (rolls.length) {
        decorateConCheckMessage(message, html, content, rolls);
        return;
      }

      decorateConCheckRequestMessage(message, html, content);
      return;
    }

    if (load.as === COMBINED_CARD_TYPE) {
      decorateCombinedMessage(message, html, content);
      return;
    }

    if (load.as === OPPOSED_CARD_TYPE) {
      decorateOpposedMessage(message, html, content);
      return;
    }

    if (
      load.as === RANGED_CARD_TYPE &&
      load.weaponRolled === true
    ) {
      decorateRangedResultMessage(message, html, content);
      return;
    }

    if (
      load.as === RANGED_CARD_TYPE &&
      load.weaponRolled === false
    ) {
      decorateRangedPreparationMessage(message, html, content);
      return;
    }

    if (
      load.as === MELEE_CARD_TYPE &&
      Number(load.participant) === MELEE_INITIATOR &&
      !content.querySelector(".dice-roll") &&
      content.querySelector('[data-action="attackerRoll"]')
    ) {
      decorateMeleeInitiatorMessage(message, html, content);
      return;
    }

    if (
      load.as === MELEE_CARD_TYPE &&
      Number(load.participant) === MELEE_INITIATOR &&
      content.querySelector(".dice-roll")
    ) {
      decorateMeleeInitiatorRolledMessage(message, html, content);
      return;
    }

    if (
      load.as === MELEE_CARD_TYPE &&
      Number(load.participant) === MELEE_INITIATOR &&
      load.checkRevealed === false &&
      !content.querySelector(".dice-roll") &&
      !content.querySelector('[data-action="attackerRoll"]') &&
      content.querySelector(":scope > .coc7-chat-header")
    ) {
      decorateMeleeInitiatorHiddenMessage(message, html, content);
      return;
    }

    if (
      load.as === DAMAGE_CARD_TYPE &&
      load.rollDamage === true &&
      isMeleeDamageMessage(message)
    ) {
      decorateMeleeDamageMessage(message, html, content);
      return;
    }

    if (
      load.as === DAMAGE_CARD_TYPE &&
      load.rollDamage === true &&
      isReadOnlyDamageViewer(content)
    ) {
      decorateReadOnlyDamageViewerMessage(message, html, content);
      return;
    }

    if (
      load.as === DAMAGE_CARD_TYPE &&
      load.rollDamage === false
    ) {
      decorateMeleeResolutionMessage(message, html, content);
      return;
    }

    if (
      load.as === MELEE_CARD_TYPE &&
      Number(load.participant) === MELEE_TARGET
    ) {
      const rolls = [...content.querySelectorAll(".dice-roll")];

      if (rolls.length) {
        decorateMeleeTargetRolledMessage(message, html, content, rolls);
        return;
      }

      if (load.responded && load.isNoResponse) {
        decorateMeleeTargetNoResponseMessage(message, html, content);
        return;
      }

      if (
        !load.responded &&
        (
          content.querySelector('[data-action="dodge"]') ||
          content.querySelector('[data-action="setNoResponse"]') ||
          content.querySelector('[data-action="setFightBack"]') ||
          content.querySelector('[data-action="setManeuvers"]') ||
          content.querySelector('[data-action="targetRoll"]')
        )
      ) {
        decorateMeleeTargetPreparationMessage(message, html, content);
        return;
      }
    }

    const specializedTypes = new Set([
      STANDARD_CARD_TYPE,
      COMBINED_CARD_TYPE,
      OPPOSED_CARD_TYPE,
      RANGED_CARD_TYPE,
      MELEE_CARD_TYPE,
      DAMAGE_CARD_TYPE
    ]);

    if (specializedTypes.has(load.as)) return;

    const genericCheckRolls = [...content.querySelectorAll(".dice-roll")]
      .filter((roll) =>
        roll.querySelector(":scope > .dice-result > .dice-total")
      );

    if (
      genericCheckRolls.length &&
      isGenericCoC7CheckResult(content, genericCheckRolls)
    ) {
      decorateStandardRollMessage(
        message,
        html,
        content,
        genericCheckRolls,
        getGenericCheckSummary(message, content)
      );
      html.classList.add("evil-coc7-generic-check-result");
      return;
    }

    decorateGenericChatMessage(message, html, content);
  } catch (error) {
    console.warn(`${MODULE_ID} | Impossible de décorer une carte CoC7.`, error);
  }
});




function decorateConCheckMessage(message, html, content, rolls) {
  html.classList.remove(
    "evil-coc7-generic-card",
    "evil-coc7-generic-public",
    "evil-coc7-generic-private"
  );

  const load = message.flags?.CoC7?.load ?? {};
  const pool = load.dicePool ?? {};

  for (const roll of rolls) {
    const value = extractConCheckRollValue(roll);
    if (value) {
      roll.dataset.evilCoc7DisplayedResult = value;
    }
  }

  const summary = {
    name: game.i18n.localize("CoC7.ConstitutionCheck"),
    threshold: formatThreshold(pool),
    difficulty: localizeDifficulty(pool.difficulty)
  };

  decorateStandardRollMessage(message, html, content, rolls, summary);
  html.classList.add("evil-coc7-concheck-card");

  for (const roll of rolls) {
    decorateConCheckOutcome(roll);
  }
}


function decorateConCheckRequestMessage(message, html, content) {
  decorateGenericChatMessage(message, html, content);

  const load = message.flags?.CoC7?.load ?? {};
  const isStayAlive = load.stayAlive === true;
  const button = content.querySelector('[data-action="rollConCheck"]');

  html.classList.add(
    "evil-coc7-concheck-request-card",
    isStayAlive
      ? "evil-coc7-concheck-request-stayalive"
      : "evil-coc7-concheck-request-shock"
  );

  if (!button || content.querySelector(":scope > .evil-coc7-concheck-request-hero")) {
    return;
  }

  const hero = document.createElement("div");
  hero.className = "evil-coc7-concheck-request-hero";

  const icon = document.createElement("div");
  icon.className = "evil-coc7-concheck-request-icon";

  const symbol = document.createElement("i");
  symbol.className = isStayAlive
    ? "fa-solid fa-skull"
    : "fa-solid fa-heart-pulse";
  symbol.setAttribute("aria-hidden", "true");
  icon.append(symbol);

  const text = document.createElement("div");
  text.className = "evil-coc7-concheck-request-text";

  const title = document.createElement("div");
  title.className = "evil-coc7-concheck-request-title";
  title.textContent = localizeModule(
    isStayAlive
      ? "ConCheck.Request.Survival"
      : "ConCheck.Request.Shock"
  );

  const subtitle = document.createElement("div");
  subtitle.className = "evil-coc7-concheck-request-subtitle";
  subtitle.textContent = button.textContent?.replace(/\s+/g, " ").trim() ||
    game.i18n.localize("CoC7.ConstitutionCheck");

  text.append(title, subtitle);
  hero.append(icon, text);
  content.prepend(hero);
}

function extractConCheckRollValue(roll) {
  const parts = [...roll.querySelectorAll(".dice-tooltip .part-total")]
    .map((part) => Number.parseInt(
      part.textContent?.replace(/\s+/g, " ").trim() ?? "",
      10
    ))
    .filter(Number.isFinite);

  if (parts.length < 2) return "";

  const tens = parts[0];
  const units = parts[1];
  const total = tens + units;

  return String(total === 0 ? 100 : total);
}

function decorateConCheckOutcome(roll) {
  if (roll.querySelector(":scope .evil-coc7-concheck-outcome")) return;

  const total = roll.querySelector(":scope .dice-result > .dice-total");
  const result = roll.querySelector(":scope .dice-result");
  if (!total || !result) return;

  const outcomeText =
    total.textContent?.replace(/\s+/g, " ").trim() ?? "";

  if (!outcomeText || /^\d{1,3}$/u.test(outcomeText)) return;

  const outcome = document.createElement("div");
  outcome.className = "evil-coc7-concheck-outcome";
  outcome.textContent = outcomeText;

  const state = detectState(total);
  outcome.classList.add(`evil-coc7-concheck-outcome-${state}`);

  const summary = result.querySelector(":scope > .evil-coc7-result-display");
  if (summary) {
    summary.insertAdjacentElement("afterend", outcome);
  } else {
    result.prepend(outcome);
  }
}

function isGenericCoC7CheckResult(content, rolls) {
  if (!content || !rolls?.length) return false;

  const hasCoC7Actions = Boolean(
    content.querySelector(".owner-and-keeper-block.coc7-card-buttons")
  );

  const hasCoC7SuccessIcons = Boolean(
    content.querySelector(".dice-formula .roll-icons")
  );

  const hasCoC7ResultState = rolls.some((roll) => {
    const total = roll.querySelector(":scope > .dice-result > .dice-total");
    if (!total) return false;

    return [
      "critical",
      "fumble",
      "failure",
      "success-regular",
      "success-hard",
      "success-extreme"
    ].some((className) => total.classList.contains(className));
  });

  return hasCoC7Actions || hasCoC7SuccessIcons || hasCoC7ResultState;
}

function getGenericCheckSummary(message, content) {
  const actor = message.speakerActor ?? null;
  const base = getCheckSummary(message, actor);

  const flavor = String(message.flavor ?? "");
  const flavorHolder = document.createElement("div");
  flavorHolder.innerHTML = flavor;
  const flavorText =
    flavorHolder.textContent?.replace(/\s+/g, " ").trim() ?? "";

  let threshold = base.threshold;
  if (!threshold) {
    const thresholdMatch = flavorText.match(/(\d{1,3})\s*%/u);
    if (thresholdMatch) threshold = thresholdMatch[1];
  }

  let difficulty = base.difficulty;
  if (!difficulty) {
    const renderedText =
      content.textContent?.replace(/\s+/g, " ").trim().toLocaleLowerCase() ?? "";

    const candidates = [
      game.i18n.localize("CoC7.CriticalDifficulty"),
      game.i18n.localize("CoC7.ExtremeDifficulty"),
      game.i18n.localize("CoC7.HardDifficulty"),
      game.i18n.localize("CoC7.RegularDifficulty")
    ].filter(Boolean);

    difficulty = candidates.find((label) =>
      renderedText.includes(
        String(label).replace(/\s+/g, " ").trim().toLocaleLowerCase()
      )
    ) ?? "";
  }

  let name = base.name;
  const genericRollLabel = game.i18n.localize("CoC7.Roll");

  if (
    (!name || name === genericRollLabel) &&
    flavorText
  ) {
    name = cleanFlavorLabel(flavorText);
  }

  return {
    name: name || genericRollLabel,
    threshold,
    difficulty
  };
}

function decorateGenericChatMessage(message, html, content) {
  const isPrivate =
    html.classList.contains("whisper") ||
    html.classList.contains("blind") ||
    (Array.isArray(message.whisper) && message.whisper.length > 0);

  html.classList.add(
    "evil-coc7-generic-card",
    isPrivate
      ? "evil-coc7-generic-private"
      : "evil-coc7-generic-public"
  );

  for (const area of content.querySelectorAll(".coc7-card-buttons")) {
    area.classList.add("evil-coc7-generic-actions");
  }

  for (const link of content.querySelectorAll(".coc7-link")) {
    link.classList.add("evil-coc7-generic-link");
  }

  decorateFoundryDocumentLinks(html, content);

  if (!isPrivate) return;

  const metadata = html.querySelector(":scope > .message-header .message-metadata");
  if (!metadata || metadata.querySelector(":scope > .evil-coc7-private-badge")) {
    return;
  }

  const badge = document.createElement("span");
  badge.className = "evil-coc7-private-badge";
  badge.title = localizeModule("Privacy.PrivateMessage");

  const icon = document.createElement("i");
  icon.className = "fa-solid fa-lock";
  icon.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.textContent = localizeModule("Privacy.PrivateBadge");

  badge.append(icon, label);
  metadata.prepend(badge);
}



function decorateFoundryDocumentLinks(html, content) {
  const allowedTypes = new Set(globalThis.CONST?.DOCUMENT_LINK_TYPES ?? []);
  if (!allowedTypes.size) return;

  const selector = "a.content-link[data-type][data-uuid]";
  const links = [...content.querySelectorAll(selector)]
    .filter((link) => allowedTypes.has(link.dataset.type));

  if (!links.length) return;

  for (const link of links) {
    link.classList.add("evil-coc7-document-link");
  }

  if (!isStandaloneFoundryDocumentShare(content, allowedTypes)) {
    return;
  }

  html.classList.add("evil-coc7-document-share-card");
  content.classList.add("evil-coc7-document-share-content");

  for (const paragraph of content.querySelectorAll(":scope > p")) {
    if (isVisuallyEmptyChatElement(paragraph)) {
      paragraph.classList.add("evil-coc7-document-share-empty");
      continue;
    }

    if (isDocumentLinkOnlyContainer(paragraph, allowedTypes)) {
      paragraph.classList.add("evil-coc7-document-share-row");
    }
  }
}

function isStandaloneFoundryDocumentShare(content, allowedTypes) {
  const selector = "a.content-link[data-type][data-uuid]";
  let hasDocumentLink = false;

  for (const node of content.childNodes) {
    if (node.nodeType === Node.COMMENT_NODE) continue;

    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent?.trim()) return false;
      continue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const element = node;

    if (isVisuallyEmptyChatElement(element)) continue;

    if (
      element.matches(selector) &&
      allowedTypes.has(element.dataset.type)
    ) {
      hasDocumentLink = true;
      continue;
    }

    if (
      element.matches("p") &&
      isDocumentLinkOnlyContainer(element, allowedTypes)
    ) {
      hasDocumentLink = true;
      continue;
    }

    return false;
  }

  return hasDocumentLink;
}

function isDocumentLinkOnlyContainer(element, allowedTypes) {
  const selector = "a.content-link[data-type][data-uuid]";
  let hasDocumentLink = false;

  for (const node of element.childNodes) {
    if (node.nodeType === Node.COMMENT_NODE) continue;

    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent?.trim()) return false;
      continue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    if (node.matches("br")) continue;

    if (
      node.matches(selector) &&
      allowedTypes.has(node.dataset.type)
    ) {
      hasDocumentLink = true;
      continue;
    }

    return false;
  }

  return hasDocumentLink;
}

function isVisuallyEmptyChatElement(element) {
  if (element.textContent?.trim()) return false;

  return !element.querySelector(
    "a, button, input, select, textarea, img, picture, video, audio, canvas, svg, hr, .dice-roll"
  );
}


function decorateCombinedMessage(message, html, content) {
  const load = message.flags?.CoC7?.load ?? {};
  const groups = [...content.querySelectorAll(":scope > .coc7-group-actor-roll")];
  if (!groups.length) return;

  html.classList.add(
    "evil-coc7-card",
    "evil-coc7-combined-card",
    load.cardOpen === false
      ? "evil-coc7-combined-closed"
      : "evil-coc7-combined-open",
    load.combinedType === "all"
      ? "evil-coc7-combined-all"
      : load.combinedType === "any"
        ? "evil-coc7-combined-any"
        : "evil-coc7-combined-unset"
  );

  if (!content.querySelector(":scope > .evil-coc7-combined-marker")) {
    const marker = document.createElement("span");
    marker.className = "evil-coc7-combined-marker";
    marker.hidden = true;
    content.prepend(marker);
  }

  if (!content.querySelector(":scope > .evil-coc7-combined-header")) {
    content.prepend(createCombinedHeader(load));
  }

  for (const area of content.querySelectorAll(":scope > .coc7-card-buttons")) {
    const typeButtons = area.querySelectorAll(
      '[data-action="setValue"][data-set="combinedType"]'
    );
    const rollButton = area.querySelector(
      'button[data-action="rollActor"]'
    );
    const closeButton = area.querySelector(
      'button[data-action="toggleValue"][data-set="cardOpen"]'
    );

    if (typeButtons.length) {
      area.classList.add("evil-coc7-combined-type-controls");

      for (const button of typeButtons) {
        if (button.dataset.value === "any") {
          button.textContent = localizeModule("Combined.Condition.Any");
        } else if (button.dataset.value === "all") {
          button.textContent = localizeModule("Combined.Condition.All");
        }
      }
    }

    if (rollButton) {
      area.classList.add("evil-coc7-combined-primary-action");
      rollButton.textContent = localizeModule("Action.RollChecks");
    }

    if (closeButton) {
      area.classList.add("evil-coc7-combined-footer-action");
    }
  }

  groups.forEach((group) => decorateCombinedActorGroup(group));

  const finalRoll = [...content.querySelectorAll(":scope > .dice-roll")]
    .find((roll) => roll.querySelector(":scope > h4.dice-total"));

  if (finalRoll) {
    decorateCombinedFinalVerdict(finalRoll);
  }

  for (const flavor of html.querySelectorAll(".flavor-text")) {
    flavor.classList.add("evil-coc7-original-flavor");
  }
}

function createCombinedHeader(load) {
  const header = document.createElement("div");
  header.className = "evil-coc7-combined-header";

  const icon = document.createElement("div");
  icon.className = "evil-coc7-combined-header-icon";

  const symbol = document.createElement("i");
  symbol.className = "fa-solid fa-link";
  symbol.setAttribute("aria-hidden", "true");
  icon.append(symbol);

  const text = document.createElement("div");
  text.className = "evil-coc7-combined-header-text";

  const title = document.createElement("div");
  title.className = "evil-coc7-combined-title";
  title.textContent = game.i18n.localize("CoC7.CombinedRollCard");

  const subtitle = document.createElement("div");
  subtitle.className = "evil-coc7-combined-subtitle";

  if (load.combinedType === "all") {
    subtitle.textContent = localizeModule("Combined.Subtitle.All");
  } else if (load.combinedType === "any") {
    subtitle.textContent = localizeModule("Combined.Subtitle.Any");
  } else {
    subtitle.textContent = localizeModule("Combined.Subtitle.Choose");
  }

  text.append(title, subtitle);
  header.append(icon, text);

  return header;
}

function decorateCombinedActorGroup(group) {
  group.classList.add("evil-coc7-combined-actor");

  const portrait = group.querySelector(":scope > .actor-portrait");
  const image = portrait?.querySelector(":scope > img.portrait");
  const details = group.querySelector(":scope > .roll-details");
  if (!details) return;

  if (portrait) {
    portrait.classList.add("evil-coc7-combined-portrait");
  }

  let identity = details.querySelector(
    ":scope > .evil-coc7-combined-identity"
  );

  if (!identity) {
    identity = document.createElement("div");
    identity.className = "evil-coc7-combined-identity";

    const name = document.createElement("div");
    name.className = "evil-coc7-combined-actor-name";
    identity.append(name);

    details.prepend(identity);
  }

  const name = identity.querySelector(
    ":scope > .evil-coc7-combined-actor-name"
  );

  if (name) {
    name.textContent =
      image?.dataset?.tooltip?.replace(/\s+/g, " ").trim() ||
      localizeModule("Participant.Investigator");
  }

  for (const header of details.querySelectorAll(":scope > .roll-header")) {
    header.classList.add("evil-coc7-combined-roll-header");
    harmonizeRollHeaderTags(header);

    const remove = header.querySelector(
      '.item-controls.keeper-only-block > a.item-control[data-action="removeRoll"]'
    );
    if (remove) {
      remove.classList.add("evil-coc7-combined-remove-roll");
    }
  }

  for (const faux of details.querySelectorAll(".coc7-faux-button")) {
    faux.classList.add("evil-coc7-combined-waiting");
  }

  for (const button of details.querySelectorAll(
    'button[data-action="rollActor"]'
  )) {
    button.classList.add("evil-coc7-combined-roll-button");
  }

  for (const roll of details.querySelectorAll(".dice-roll")) {
    decorateCombinedDiceRoll(roll);
  }
}

function decorateCombinedDiceRoll(roll) {
  const result = roll.querySelector(":scope > .dice-result");
  const total = result?.querySelector(":scope > .dice-total");
  if (!result || !total) return;

  const state = detectState(total);
  const displayed = extractDisplayedResult(total.textContent);
  const formula = result.querySelector(":scope > .dice-formula");

  roll.classList.add(
    "evil-coc7-combined-dice-roll",
    `evil-coc7-combined-state-${state}`
  );

  formula?.classList.add("evil-coc7-combined-native-formula");
  total.classList.add("evil-coc7-combined-native-total");

  let summary = result.querySelector(
    ":scope > .evil-coc7-combined-roll-summary"
  );

  if (!summary) {
    summary = document.createElement("div");
    summary.className = "evil-coc7-combined-roll-summary";

    const value = document.createElement("div");
    value.className = "evil-coc7-combined-summary-value";

    const threshold = document.createElement("div");
    threshold.className = "evil-coc7-combined-summary-threshold";

    summary.append(value, threshold);
    result.prepend(summary);
  }

  const value = summary.querySelector(
    ":scope > .evil-coc7-combined-summary-value"
  );
  const threshold = summary.querySelector(
    ":scope > .evil-coc7-combined-summary-threshold"
  );

  if (value) {
    value.textContent = displayed.text;
    value.classList.toggle(
      "evil-coc7-combined-summary-value-3digits",
      displayed.numeric && displayed.text.length >= 3
    );
  }

  if (threshold) {
    threshold.replaceChildren();

    const icon = document.createElement("div");
    icon.className = "evil-coc7-combined-summary-icon";

    const nativeIcons = formula?.querySelector(".roll-icons");
    if (nativeIcons) {
      icon.append(nativeIcons.cloneNode(true));
    } else {
      const fallback = document.createElement("i");
      fallback.className = getOpposedFallbackIcon(state);
      fallback.setAttribute("aria-hidden", "true");
      icon.append(fallback);
    }

    const label = document.createElement("div");
    label.className = "evil-coc7-combined-summary-label";
    label.textContent = getVerdictLabel(state);

    const ornament = document.createElement("div");
    ornament.className = "evil-coc7-combined-summary-ornament";
    ornament.setAttribute("aria-hidden", "true");

    threshold.append(icon, label, ornament);
  }

  const tooltip = result.querySelector(":scope > .dice-tooltip");
  if (tooltip) {
    tooltip.classList.add("evil-coc7-combined-tooltip");

    for (const area of tooltip.querySelectorAll(".coc7-card-buttons")) {
      area.classList.add("evil-coc7-combined-roll-actions");
    }
  }
}

function decorateCombinedFinalVerdict(roll) {
  roll.classList.add("evil-coc7-combined-final");

  const total = roll.querySelector(":scope > h4.dice-total");
  if (!total) return;

  const failure = total.classList.contains("failure");
  roll.classList.add(
    failure
      ? "evil-coc7-combined-final-failure"
      : "evil-coc7-combined-final-success"
  );

  total.classList.add("evil-coc7-combined-final-native");

  let verdict = roll.querySelector(
    ":scope > .evil-coc7-combined-final-verdict"
  );

  if (!verdict) {
    verdict = document.createElement("div");
    verdict.className = "evil-coc7-combined-final-verdict";

    const icon = document.createElement("i");
    icon.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");

    verdict.append(icon, label);
    roll.append(verdict);
  }

  const icon = verdict.querySelector(":scope > i");
  const label = verdict.querySelector(":scope > span");

  if (icon) {
    icon.className = failure
      ? "fa-solid fa-xmark"
      : "fa-solid fa-check";
  }

  if (label) {
    const pushed = total.textContent
      ?.replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .includes(
        game.i18n.localize("CoC7.PushedRoll")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase()
      );

    const base = failure
      ? localizeModule("Combined.Result.Failed")
      : localizeModule("Combined.Result.Succeeded");

    label.textContent = pushed
      ? `${base} — ${game.i18n.localize("CoC7.PushedRoll")}`
      : base;
  }
}

function decorateOpposedMessage(message, html, content) {
  const load = message.flags?.CoC7?.load ?? {};
  const groups = [...content.querySelectorAll(":scope > .coc7-group-actor-roll")];
  if (!groups.length) return;

  html.classList.add(
    "evil-coc7-card",
    "evil-coc7-opposed-card",
    load.isCombat ? "evil-coc7-opposed-combat" : "evil-coc7-opposed-generic",
    load.cardOpen === false ? "evil-coc7-opposed-closed" : "evil-coc7-opposed-open",
    load.isRolling ? "evil-coc7-opposed-rolling" : "evil-coc7-opposed-setup"
  );

  if (!content.querySelector(":scope > .evil-coc7-opposed-marker")) {
    const marker = document.createElement("span");
    marker.className = "evil-coc7-opposed-marker";
    marker.hidden = true;
    content.prepend(marker);
  }

  if (!content.querySelector(":scope > .evil-coc7-opposed-header")) {
    content.prepend(createOpposedHeader(load));
  }

  for (const area of content.querySelectorAll(":scope > .coc7-card-buttons")) {
    const isCombatToggle = area.querySelector(
      '[data-action="toggleValue"][data-set="isCombat"]'
    );
    const advantage = area.querySelector(
      '[data-action="setValue"][data-set="advantage"]'
    );
    const start = area.querySelector('[data-action="rollNoPlayers"]');
    const damage = area.querySelector('[data-action="rollDamage"]');
    const close = area.querySelector(
      '[data-action="toggleValue"][data-set="cardOpen"]'
    );

    if (isCombatToggle) {
      area.classList.add("evil-coc7-opposed-mode-control");
    }

    if (advantage) {
      area.classList.add("evil-coc7-opposed-advantage-controls");
    }

    if (start || damage || close || area.querySelector("button:disabled")) {
      area.classList.add("evil-coc7-opposed-footer-actions");

      if (start) {
        start.textContent = localizeModule("Action.StartRolls");
      }

      if (damage) {
        damage.textContent = localizeModule("Action.RollDamage");
      }
    }
  }

  for (const tags of content.querySelectorAll(":scope > .coc7-tags")) {
    tags.classList.add("evil-coc7-opposed-top-tags");
  }

  groups.forEach((group) => decorateOpposedActorGroup(group));

  const result = content.querySelector(":scope > .coc7-card-result");
  if (result) {
    result.classList.add("evil-coc7-opposed-result");
  }

  for (const flavor of html.querySelectorAll(".flavor-text")) {
    flavor.classList.add("evil-coc7-original-flavor");
  }
}

function createOpposedHeader(load) {
  const header = document.createElement("div");
  header.className = "evil-coc7-opposed-header";

  const icon = document.createElement("div");
  icon.className = "evil-coc7-opposed-header-icon";

  const symbol = document.createElement("i");
  symbol.className = load.isCombat
    ? "game-icon game-icon-crossed-swords"
    : "fa-solid fa-scale-balanced";
  symbol.setAttribute("aria-hidden", "true");
  icon.append(symbol);

  const text = document.createElement("div");
  text.className = "evil-coc7-opposed-header-text";

  const title = document.createElement("div");
  title.className = "evil-coc7-opposed-title";
  title.textContent = game.i18n.localize("CoC7.OpposedRollCard");

  const subtitle = document.createElement("div");
  subtitle.className = "evil-coc7-opposed-subtitle";
  subtitle.textContent = load.isCombat
    ? game.i18n.localize("CoC7.AttackManeuver")
    : localizeModule("Opposed.Check");

  text.append(title, subtitle);
  header.append(icon, text);

  return header;
}

function decorateOpposedActorGroup(group) {
  group.classList.add("evil-coc7-opposed-actor");

  if (group.classList.contains("won")) {
    group.classList.add("evil-coc7-opposed-winner");
  }

  if (group.classList.contains("tie")) {
    group.classList.add("evil-coc7-opposed-tie");
  }

  if (group.classList.contains("attacker")) {
    group.classList.add("evil-coc7-opposed-attacker");
  }

  const portrait = group.querySelector(":scope > .actor-portrait");
  const image = portrait?.querySelector(":scope > img.portrait");
  const details = group.querySelector(":scope > .roll-details");
  if (!details) return;

  if (portrait) {
    portrait.classList.add("evil-coc7-opposed-portrait");
  }

  const participantButton = portrait?.querySelector(
    'button[data-action="participant"]'
  );

  if (participantButton) {
    participantButton.classList.add("evil-coc7-opposed-participant-button");
  }

  let identity = details.querySelector(":scope > .evil-coc7-opposed-identity");

  if (!identity) {
    identity = document.createElement("div");
    identity.className = "evil-coc7-opposed-identity";

    const name = document.createElement("div");
    name.className = "evil-coc7-opposed-actor-name";

    const role = document.createElement("div");
    role.className = "evil-coc7-opposed-role";

    identity.append(name, role);
    details.prepend(identity);
  }

  const name = identity.querySelector(":scope > .evil-coc7-opposed-actor-name");
  const role = identity.querySelector(":scope > .evil-coc7-opposed-role");

  if (name) {
    name.textContent =
      image?.dataset?.tooltip?.replace(/\s+/g, " ").trim() ||
      localizeModule("Participant.Participant");
  }

  if (role) {
    role.textContent = getOpposedParticipantLabel(participantButton);
  }

  for (const header of details.querySelectorAll(":scope > .roll-header")) {
    header.classList.add("evil-coc7-opposed-roll-header");
    harmonizeRollHeaderTags(header);
  }

  for (const faux of details.querySelectorAll(".coc7-faux-button")) {
    faux.classList.add("evil-coc7-opposed-waiting");
  }

  for (const button of details.querySelectorAll('button[data-action="rollActor"]')) {
    button.classList.add("evil-coc7-opposed-roll-button");
  }

  for (const rollResult of details.querySelectorAll(".roll-result")) {
    rollResult.classList.add("evil-coc7-opposed-roll-result");
  }

  const rolls = [...details.querySelectorAll(".dice-roll")];

  if (rolls.length) {
    group.classList.add("evil-coc7-opposed-actor-rolled");
  } else {
    group.classList.remove("evil-coc7-opposed-actor-rolled");
  }

  for (const roll of rolls) {
    decorateOpposedDiceRoll(roll);
  }

  if (
    rolls.length === 1 &&
    group.dataset.evilOpposedExpandBound !== "true"
  ) {
    group.dataset.evilOpposedExpandBound = "true";
    group.classList.add("evil-coc7-opposed-clickable");

    group.addEventListener("click", (event) => {
      if (
        event.target.closest(
          "button, a, input, select, textarea, [data-action]:not(.dice-roll)"
        )
      ) {
        return;
      }

      if (event.target.closest(".dice-roll")) return;

      const diceRoll = group.querySelector(".dice-roll");
      diceRoll?.click();
    });
  }
}

function getOpposedParticipantLabel(button) {
  const tooltip = String(button?.dataset?.tooltip ?? "");

  if (tooltip.endsWith("ParticipantAttacker")) {
    return localizeModule("Participant.Attacker");
  }

  if (tooltip.endsWith("ParticipantDefender")) {
    return localizeModule("Participant.Defender");
  }

  return localizeModule("Participant.Participant");
}

function decorateOpposedDiceRoll(roll) {
  const result = roll.querySelector(":scope > .dice-result");
  const total = result?.querySelector(":scope > .dice-total");
  if (!result || !total) return;

  const state = detectState(total);
  const displayed = extractDisplayedResult(total.textContent);
  const formula = result.querySelector(":scope > .dice-formula");

  roll.classList.add(
    "evil-coc7-opposed-dice-roll",
    `evil-coc7-opposed-state-${state}`
  );

  formula?.classList.add("evil-coc7-opposed-native-formula");
  total.classList.add("evil-coc7-opposed-native-total");

  let summary = result.querySelector(
    ":scope > .evil-coc7-opposed-roll-summary"
  );

  if (!summary) {
    summary = document.createElement("div");
    summary.className = "evil-coc7-opposed-roll-summary";

    const value = document.createElement("div");
    value.className = "evil-coc7-opposed-summary-value";

    const threshold = document.createElement("div");
    threshold.className = "evil-coc7-opposed-summary-threshold";

    summary.append(value, threshold);
    result.prepend(summary);
  }

  const value = summary.querySelector(
    ":scope > .evil-coc7-opposed-summary-value"
  );
  const threshold = summary.querySelector(
    ":scope > .evil-coc7-opposed-summary-threshold"
  );

  if (value) {
    value.textContent = displayed.text;
    value.classList.toggle(
      "evil-coc7-opposed-summary-value-3digits",
      displayed.numeric && displayed.text.length >= 3
    );
  }

  if (threshold) {
    threshold.replaceChildren();

    const icon = document.createElement("div");
    icon.className = "evil-coc7-opposed-summary-icon";

    const nativeIcons = formula?.querySelector(".roll-icons");
    if (nativeIcons) {
      icon.append(nativeIcons.cloneNode(true));
    } else {
      const fallback = document.createElement("i");
      fallback.className = getOpposedFallbackIcon(state);
      fallback.setAttribute("aria-hidden", "true");
      icon.append(fallback);
    }

    const label = document.createElement("div");
    label.className = "evil-coc7-opposed-summary-label";
    label.textContent = getVerdictLabel(state);

    const ornament = document.createElement("div");
    ornament.className = "evil-coc7-opposed-summary-ornament";
    ornament.setAttribute("aria-hidden", "true");

    threshold.append(icon, label, ornament);
  }

  const tooltip = result.querySelector(":scope > .dice-tooltip");
  if (tooltip) {
    tooltip.classList.add("evil-coc7-opposed-tooltip");

    for (const area of tooltip.querySelectorAll(".coc7-card-buttons")) {
      area.classList.add("evil-coc7-opposed-roll-actions");
    }
  }
}

function getOpposedFallbackIcon(state) {
  switch (state) {
    case "critical":
      return "fa-solid fa-star";
    case "extreme":
      return "fa-solid fa-burst";
    case "hard":
      return "fa-solid fa-star-half-stroke";
    case "regular":
      return "fa-solid fa-check";
    case "fumble":
      return "fa-solid fa-skull";
    case "failure":
      return "fa-solid fa-xmark";
    default:
      return "fa-solid fa-circle";
  }
}

function decorateRangedResultMessage(message, html, content) {
  if (content.querySelector(":scope > .evil-coc7-ranged-result-marker")) return;

  const nativeHeader = content.querySelector(":scope > .coc7-chat-header");
  const results = content.querySelector(":scope > .ranged-results");
  if (!nativeHeader || !results) return;

  html.classList.add(
    "evil-coc7-card",
    "evil-coc7-ranged-card",
    "evil-coc7-ranged-result-card"
  );

  const marker = document.createElement("span");
  marker.className = "evil-coc7-ranged-result-marker";
  marker.hidden = true;
  content.prepend(marker);

  decorateRangedPreparationHeader(nativeHeader);

  const targetPortraits = content.querySelector(
    ":scope > .ranged-targets-portraits"
  );
  if (targetPortraits) {
    targetPortraits.classList.add("evil-coc7-ranged-result-targets-hidden");
  }

  for (const targetOption of content.querySelectorAll(
    ":scope > .ranged-targets-option"
  )) {
    targetOption.classList.add("evil-coc7-ranged-result-target-hidden");
  }

  results.classList.add("evil-coc7-ranged-results");

  const rolls = [...results.querySelectorAll(":scope > .dice-roll")];
  rolls.forEach((roll, index) => {
    decorateRangedShotResult(roll, index, rolls.length);
  });

  for (const malfunction of results.querySelectorAll(
    ":scope > .coc7-malfunction"
  )) {
    malfunction.classList.add("evil-coc7-ranged-malfunction");
  }

  const consequenceArea = results.querySelector(
    ':scope > .coc7-card-buttons [data-action="useLuckForWeaponFailure"]'
  )?.closest(".coc7-card-buttons");

  if (consequenceArea) {
    consequenceArea.classList.add(
      "evil-coc7-ranged-consequence-action"
    );
  }

  const damageButton = results.querySelector(
    '[data-action="roll-range-damage"]'
  );
  const damageArea = damageButton?.closest(".coc7-card-buttons");

  if (damageButton) {
    damageButton.textContent = localizeModule("Action.RollDamage");
  }

  if (damageArea) {
    damageArea.classList.add("evil-coc7-ranged-damage-action");
  }

  decorateEmbeddedRangedDamage(content);

  for (const flavor of html.querySelectorAll(".flavor-text")) {
    flavor.classList.add("evil-coc7-original-flavor");
  }
}


function decorateEmbeddedRangedDamage(results) {
  if (!results) return;

  for (const section of results.querySelectorAll(":scope > .ranged-damage")) {
    section.classList.add("evil-coc7-ranged-damage-embedded");

    for (const roll of section.querySelectorAll(".dice-roll")) {
      roll.classList.add("evil-coc7-ranged-damage-roll");

      const appliedFormula = roll.querySelector(".dice-formula .fa-check")
        ?.closest(".dice-formula");

      if (appliedFormula) {
        roll.classList.add("evil-coc7-ranged-damage-applied-roll");
        appliedFormula.classList.add("evil-coc7-ranged-damage-applied-formula");
      }
    }

    for (const area of section.querySelectorAll(".coc7-card-buttons")) {
      area.classList.add("evil-coc7-ranged-damage-apply-action");

      for (const button of area.querySelectorAll("button")) {
        const action = button.dataset?.action ?? "";

        if (
          action === "deal-range-damage" ||
          action === "dealDamage" ||
          action === "applyValue"
        ) {
          button.textContent = localizeModule("Action.InflictDamage");
        } else if (action === "rollDamage") {
          button.textContent = localizeModule("Action.RollDamage");
        }
      }
    }

    const hasApplyButton = Boolean(section.querySelector(
      'button[data-action="deal-range-damage"], button[data-action="dealDamage"], button[data-action="applyValue"]'
    ));
    const hasAppliedDamage = Boolean(
      section.querySelector(".evil-coc7-ranged-damage-applied-formula")
    );

    section.classList.toggle(
      "evil-coc7-ranged-damage-applied-status",
      !hasApplyButton && hasAppliedDamage
    );
  }
}

function decorateRangedShotResult(roll, index, count) {
  if (roll.classList.contains("evil-coc7-ranged-shot-roll")) return;

  const result = roll.querySelector(":scope > .dice-result");
  const formula = result?.querySelector(":scope > .dice-formula");
  if (!result || !formula) return;

  const formulaText = formula.textContent
    ?.replace(/\s+/g, " ")
    .trim() ?? "";

  const totalMatch = formulaText.match(/^\s*(\d{1,3})/u);
  const resultMatch = formulaText.match(/\(([^()]*)\)\s*$/u);

  const total = totalMatch?.[1] ?? "—";
  const resultType = resultMatch?.[1]?.trim() ?? "";
  const state = getRangedShotState(formula, resultType);
  const targetName = getRangedShotTargetName(result);

  roll.classList.add(
    "evil-coc7-ranged-shot-roll",
    `evil-coc7-ranged-shot-${state}`
  );

  formula.classList.add("evil-coc7-ranged-native-formula");

  const display = document.createElement("div");
  display.className = "evil-coc7-ranged-shot-display";

  const valueColumn = document.createElement("div");
  valueColumn.className = "evil-coc7-ranged-shot-value-column";

  if (count > 1) {
    const shotIndex = document.createElement("div");
    shotIndex.className = "evil-coc7-ranged-shot-index";
    shotIndex.textContent = localizeModule("Ranged.ShotNumber", {
      number: index + 1
    });
    valueColumn.append(shotIndex);
  }

  const value = document.createElement("div");
  value.className = "evil-coc7-ranged-shot-value";
  value.textContent = total;
  valueColumn.append(value);

  const verdict = document.createElement("div");
  verdict.className = "evil-coc7-ranged-shot-verdict";

  const icon = document.createElement("div");
  icon.className = "evil-coc7-ranged-shot-icon";

  const symbol = document.createElement("i");
  symbol.className = getRangedShotIcon(state);
  symbol.setAttribute("aria-hidden", "true");
  icon.append(symbol);

  const label = document.createElement("div");
  label.className = "evil-coc7-ranged-shot-label";
  label.textContent = resultType || getRangedShotFallbackLabel(state);

  verdict.append(icon, label);

  if (targetName) {
    const target = document.createElement("div");
    target.className = "evil-coc7-ranged-shot-target";
    target.textContent = targetName;
    verdict.append(target);
  }

  display.append(valueColumn, verdict);
  result.prepend(display);

  const tooltip = result.querySelector(":scope > .dice-tooltip");
  if (tooltip) {
    tooltip.classList.add("evil-coc7-ranged-shot-tooltip");

    for (const area of tooltip.querySelectorAll(".coc7-card-buttons")) {
      area.classList.add("evil-coc7-ranged-luck-actions");
    }
  }
}

function getRangedShotState(formula, resultType) {
  if (formula.classList.contains("critical")) return "critical";
  if (formula.classList.contains("fumble")) return "fumble";
  if (formula.classList.contains("failure")) return "failure";

  if (formula.classList.contains("success")) {
    const normalized = String(resultType ?? "").trim();

    if (
      normalized === game.i18n.localize("CoC7.ExtremeSuccess")
    ) {
      return "extreme";
    }

    if (
      normalized === game.i18n.localize("CoC7.HardSuccess")
    ) {
      return "hard";
    }

    return "regular";
  }

  return "neutral";
}

function getRangedShotIcon(state) {
  switch (state) {
    case "critical":
      return "fa-solid fa-star";
    case "extreme":
      return "fa-solid fa-burst";
    case "hard":
      return "fa-solid fa-star-half-stroke";
    case "regular":
      return "fa-solid fa-crosshairs";
    case "fumble":
      return "fa-solid fa-skull";
    case "failure":
      return "fa-solid fa-xmark";
    default:
      return "fa-solid fa-circle";
  }
}

function getRangedShotFallbackLabel(state) {
  const labels = {
    critical: "CoC7.CriticalSuccess",
    extreme: "CoC7.ExtremeSuccess",
    hard: "CoC7.HardSuccess",
    regular: "CoC7.RegularSuccess",
    fumble: "CoC7.Fumble",
    failure: "CoC7.Failure"
  };

  return labels[state]
    ? game.i18n.localize(labels[state])
    : localizeModule("Ranged.Result");
}

function getRangedShotTargetName(result) {
  const targetPrefix = `${game.i18n.localize("CoC7.Target")}:`;

  for (const element of result.querySelectorAll(
    ".dice-tooltip .wrapper > div"
  )) {
    const text = element.textContent?.replace(/\s+/g, " ").trim() ?? "";

    if (text.startsWith(targetPrefix)) {
      return text.slice(targetPrefix.length).trim();
    }
  }

  return "";
}

function decorateRangedPreparationMessage(message, html, content) {
  if (content.querySelector(":scope > .evil-coc7-ranged-header-main")) return;

  const nativeHeader = content.querySelector(":scope > .coc7-chat-header");
  if (!nativeHeader) return;

  html.classList.add(
    "evil-coc7-card",
    "evil-coc7-ranged-card",
    "evil-coc7-ranged-preparation-card"
  );

  decorateRangedPreparationHeader(nativeHeader);

  const targetPortraits = content.querySelector(
    ":scope > .ranged-targets-portraits"
  );
  if (targetPortraits) {
    targetPortraits.classList.add("evil-coc7-ranged-targets-portraits");
  }

  for (const targetOption of content.querySelectorAll(
    ":scope > .ranged-targets-option"
  )) {
    decorateRangedTargetOption(targetOption);
  }

  const rangedShots = content.querySelector(":scope > .ranged-shots");
  if (rangedShots) {
    decorateRangedShotsPreparation(rangedShots);
  }

  for (const flavor of html.querySelectorAll(".flavor-text")) {
    flavor.classList.add("evil-coc7-original-flavor");
  }
}

function decorateRangedPreparationHeader(nativeHeader) {
  const nativeMainRow = nativeHeader.querySelector(":scope > .flexrow");
  const leftPortrait = nativeMainRow?.querySelector(".left-portrait");
  const images = leftPortrait ? [...leftPortrait.querySelectorAll("img")] : [];
  const hasActor =
    leftPortrait?.classList.contains("double-portrait") &&
    images.length >= 2;

  const actorImage = hasActor ? images[0] : null;
  const weaponImage = hasActor ? images[1] : images[0] ?? null;
  const itemName =
    nativeMainRow?.querySelector(".card-title")
      ?.textContent
      ?.replace(/\s+/g, " ")
      .trim() ?? "";

  const main = document.createElement("div");
  main.className = "evil-coc7-ranged-header-main";

  const portraitWrap = document.createElement("div");
  portraitWrap.className =
    "evil-coc7-card-portrait-wrap evil-coc7-ranged-portrait-wrap";

  const portrait = document.createElement("img");
  portrait.className = "evil-coc7-card-portrait";
  portrait.src =
    actorImage?.getAttribute("src") ||
    weaponImage?.getAttribute("src") ||
    "icons/svg/mystery-man.svg";
  portrait.alt =
    actorImage?.dataset?.tooltip ||
    weaponImage?.dataset?.tooltip ||
    itemName;
  portraitWrap.append(portrait);

  const identity = document.createElement("div");
  identity.className = "evil-coc7-ranged-identity";

  if (actorImage?.dataset?.tooltip) {
    const actorName = document.createElement("div");
    actorName.className = "evil-coc7-card-actor";
    actorName.textContent = actorImage.dataset.tooltip;
    identity.append(actorName);
  }

  const role = document.createElement("div");
  role.className = "evil-coc7-ranged-role";
  role.textContent = localizeModule("Ranged.Attack");

  const weaponName = document.createElement("div");
  weaponName.className = "evil-coc7-ranged-weapon-name";
  weaponName.textContent = itemName;

  identity.append(role, weaponName);

  const weaponBadge = document.createElement("div");
  weaponBadge.className = "evil-coc7-ranged-weapon-badge";

  if (weaponImage?.getAttribute("src")) {
    const image = document.createElement("img");
    image.className = "evil-coc7-ranged-weapon-image";
    image.src = weaponImage.getAttribute("src");
    image.alt = weaponImage.dataset?.tooltip || itemName;
    weaponBadge.append(image);
  } else {
    const icon = document.createElement("i");
    icon.className = "fa-solid fa-crosshairs";
    icon.setAttribute("aria-hidden", "true");
    weaponBadge.append(icon);
  }

  main.append(portraitWrap, identity, weaponBadge);
  nativeHeader.prepend(main);

  if (nativeMainRow) {
    nativeMainRow.classList.add("evil-coc7-native-hidden");
  }

  const description = nativeHeader.querySelector(
    ":scope > .coc7-chat-description"
  );
  if (description) {
    description.classList.add("evil-coc7-ranged-description");
  }

  const statusTags = nativeHeader.querySelector(":scope > .coc7-tags");
  if (statusTags) {
    statusTags.classList.add("evil-coc7-ranged-status-tags");
  }

  const modeControls = [...nativeHeader.querySelectorAll(
    ":scope > .coc7-card-buttons"
  )].find((area) =>
    area.querySelector('[data-set="singleShot"]') ||
    area.querySelector('[data-set="multipleShots"]') ||
    area.querySelector('[data-set="burst"]') ||
    area.querySelector('[data-set="fullAuto"]') ||
    area.querySelector('[data-set="aiming"]')
  );

  if (modeControls) {
    modeControls.classList.remove("flexrow", "coc7-half-buttons");
    modeControls.classList.add("evil-coc7-ranged-mode-controls");

    const aiming = modeControls.querySelector('[data-set="aiming"]');
    if (aiming) aiming.classList.add("evil-coc7-ranged-aiming-button");
  }
}


function decorateRangedShotsPreparation(rangedShots) {
  rangedShots.classList.add("evil-coc7-ranged-shots-preparation");

  // CoC7 8.15 : dans le mode semi-auto / auto, le dernier bouton
  // `range-initiator-roll` situé dans `.ranged-shots` est le jet final
  // de la séquence, distinct du bouton qui ajoute des tirs sur une cible.
  const finalRollButton = rangedShots.querySelector(
    ':scope > .owner-and-keeper-block.coc7-card-buttons > button[data-action="range-initiator-roll"]'
  );

  if (!finalRollButton) return;

  const finalArea = finalRollButton.closest(".coc7-card-buttons");
  if (finalArea) {
    finalArea.classList.add("evil-coc7-ranged-final-roll-action");
  }

  finalRollButton.classList.add("evil-coc7-ranged-final-roll-button");
}

function decorateRangedTargetOption(targetOption) {
  targetOption.classList.add("evil-coc7-ranged-target-option");

  const targetName = targetOption.querySelector(":scope > .coc7-target-name");
  if (targetName) {
    targetName.classList.add("evil-coc7-ranged-target-name");
  }

  const keeperContent = targetOption.querySelector(
    ":scope > .coc7-chat-content"
  );

  if (keeperContent) {
    keeperContent.classList.add("evil-coc7-ranged-target-settings");

    const firstButtons = keeperContent.querySelector(
      ":scope > .coc7-card-buttons"
    );

    if (
      firstButtons?.querySelector('[data-set="baseRange"]') ||
      firstButtons?.querySelector('[data-set="longRange"]') ||
      firstButtons?.querySelector('[data-set="extremeRange"]') ||
      firstButtons?.querySelector('[data-set="outOfRange"]')
    ) {
      firstButtons.classList.remove("flexrow", "coc7-half-buttons");
      firstButtons.classList.add("evil-coc7-ranged-range-controls");
    }

    for (const area of keeperContent.querySelectorAll(
      ":scope > .coc7-card-buttons"
    )) {
      if (area === firstButtons) continue;
      area.classList.remove("flexrow", "coc7-half-buttons");
      area.classList.add("evil-coc7-ranged-modifier-controls");
    }

    const selector = keeperContent.querySelector(
      ":scope > .bonus-penalty-selector"
    );
    if (selector) {
      selector.classList.add("evil-coc7-ranged-pool-selector");
    }
  }

  const summaryTags = [...targetOption.querySelectorAll(":scope > .coc7-tags")]
    .at(-1);
  if (summaryTags) {
    summaryTags.classList.add("evil-coc7-ranged-target-tags");
  }

  const actionButton =
    targetOption.querySelector('[data-action="range-initiator-roll"]') ||
    targetOption.querySelector('[data-action="range-initiator-shoot"]');

  if (actionButton) {
    const actionArea = actionButton.closest(".coc7-card-buttons");
    if (actionArea) {
      actionArea.classList.add("evil-coc7-ranged-primary-action");
    }
    actionButton.classList.add("evil-coc7-ranged-primary-button");
  }

  const disabledAction = targetOption.querySelector(
    ":scope > .coc7-card-buttons button.coc7-disabled"
  );
  if (disabledAction) {
    const area = disabledAction.closest(".coc7-card-buttons");
    if (area) area.classList.add("evil-coc7-ranged-primary-action");
    disabledAction.classList.add("evil-coc7-ranged-primary-button");
  }
}

function decorateStandardRollMessage(
  message,
  html,
  content,
  rolls,
  summaryOverride = null
) {
  if (content.querySelector(":scope > .evil-coc7-card-header")) return;

  const visibleTotals = rolls
    .map((roll) => roll.querySelector(".dice-total"))
    .filter(Boolean);

  const finalState = visibleTotals.length
    ? detectState(visibleTotals.at(-1))
    : "unknown";

  html.classList.add(
    "evil-coc7-card",
    "evil-coc7-standard-card",
    `evil-coc7-main-state-${finalState}`,
    message.flags?.CoC7?.load?.cardOpen
      ? "evil-coc7-card-open"
      : "evil-coc7-card-closed"
  );

  const actor = message.speakerActor ?? null;
  const summary = summaryOverride ?? getCheckSummary(message, actor);

  content.prepend(createHeader(message, actor, summary));

  for (const roll of rolls) {
    decorateRoll(roll);
  }

  const flavorBlocks = html.querySelectorAll(".flavor-text");
  for (const flavor of flavorBlocks) {
    flavor.classList.add("evil-coc7-original-flavor");
  }
}

function createHeader(message, actor, summary) {
  const header = document.createElement("div");
  header.className = "evil-coc7-card-header";

  const portraitWrap = document.createElement("div");
  portraitWrap.className = "evil-coc7-card-portrait-wrap";

  const portrait = document.createElement("img");
  portrait.className = "evil-coc7-card-portrait";
  portrait.src = getActorPortrait(actor);
  portrait.alt = getActorName(message, actor);
  portraitWrap.append(portrait);

  const identity = document.createElement("div");
  identity.className = "evil-coc7-card-identity";

  const actorName = document.createElement("div");
  actorName.className = "evil-coc7-card-actor";
  actorName.textContent = getActorName(message, actor);

  const checkLine = document.createElement("div");
  checkLine.className = "evil-coc7-card-check-line";

  const checkName = document.createElement("span");
  checkName.className = "evil-coc7-card-check-name";
  checkName.textContent = summary.name;

  checkLine.append(checkName);

  if (summary.threshold) {
    const separator = document.createElement("span");
    separator.className = "evil-coc7-card-separator";
    separator.textContent = "·";

    const threshold = document.createElement("span");
    threshold.className = "evil-coc7-card-threshold";
    threshold.textContent = `${summary.threshold} %`;

    checkLine.append(separator, threshold);
  }

  const difficulty = document.createElement("div");
  difficulty.className = "evil-coc7-card-difficulty";

  const difficultyIcon = document.createElement("i");
  difficultyIcon.className = "fa-solid fa-crosshairs";
  difficultyIcon.setAttribute("aria-hidden", "true");

  const difficultyText = document.createElement("span");
  difficultyText.textContent = formatDifficultyLine(summary.difficulty);

  difficulty.append(difficultyIcon, difficultyText);
  identity.append(actorName, checkLine, difficulty);
  header.append(portraitWrap, identity);

  return header;
}

function decorateRoll(roll) {
  if (roll.classList.contains("evil-coc7-roll-panel")) return;

  const total = roll.querySelector(".dice-total");
  if (!total) return;

  const state = detectState(total);
  roll.classList.add(
    "evil-coc7-roll-panel",
    `evil-coc7-state-${state}`
  );

  const result = document.createElement("div");
  result.className = "evil-coc7-result-display";

  const resultNumber = document.createElement("div");
  resultNumber.className = "evil-coc7-result-number";

  const preparedValue = roll.dataset.evilCoc7DisplayedResult;
  const displayedValue = preparedValue
    ? extractDisplayedResult(preparedValue)
    : extractDisplayedResult(total.textContent);
  resultNumber.textContent = displayedValue.text;
  if (displayedValue.numeric && displayedValue.text.length >= 3) {
    resultNumber.classList.add("evil-coc7-result-number-3digits");
  }
  if (!displayedValue.numeric) {
    resultNumber.classList.add("evil-coc7-result-number-text");
  }

  const verdict = document.createElement("div");
  verdict.className = "evil-coc7-verdict";

  const icon = document.createElement("div");
  icon.className = "evil-coc7-verdict-icon";
  populateVerdictIcon(icon, roll, state);

  const label = document.createElement("div");
  label.className = "evil-coc7-verdict-label";
  label.textContent = getVerdictLabel(state);

  const ornament = document.createElement("div");
  ornament.className = "evil-coc7-verdict-ornament";
  ornament.setAttribute("aria-hidden", "true");

  verdict.append(icon, label, ornament);
  result.append(resultNumber, verdict);

  const diceResult = roll.querySelector(".dice-result");
  if (diceResult) {
    diceResult.prepend(result);
  } else {
    roll.prepend(result);
  }

  const formula = roll.querySelector(".dice-formula");
  if (formula) formula.classList.add("evil-coc7-original-formula");
  total.classList.add("evil-coc7-original-total");
}

function populateVerdictIcon(container, roll, state) {
  const sourceIcons = roll.querySelectorAll(".dice-formula .roll-icons i");

  if (sourceIcons.length) {
    for (const source of sourceIcons) {
      const clone = source.cloneNode(true);
      clone.removeAttribute("style");
      container.append(clone);
    }
    return;
  }

  const icon = document.createElement("i");
  icon.className = `fa-solid ${STATE_DEFINITIONS[state]?.fallbackIcon ?? "fa-dice-d20"}`;
  icon.setAttribute("aria-hidden", "true");
  container.append(icon);
}






function isReadOnlyDamageViewer(content) {
  // État typique d'un autre joueur : il voit le résumé du dommage et
  // éventuellement l'armure, mais aucun contrôle de lancement/application.
  return (
    Boolean(content.querySelector(":scope > .coc7-chat-header")) &&
    Boolean(content.querySelector(":scope > .coc7-chat-content")) &&
    !content.querySelector('[data-action="rollDamage"]') &&
    !content.querySelector('[data-action="dealDamage"]') &&
    !content.querySelector('[data-action="applyValue"]') &&
    !content.querySelector(".dice-roll")
  );
}

function decorateReadOnlyDamageViewerMessage(message, html, content) {
  if (content.querySelector(":scope > .evil-coc7-damage-viewer-layout")) return;

  const nativeHeader = content.querySelector(":scope > .coc7-chat-header");
  const summary = content.querySelector(":scope > .coc7-chat-content");
  if (!nativeHeader || !summary) return;

  // Confidentialité multijoueur : uniquement le HTML déjà rendu par CoC7.
  const leftImages = [...nativeHeader.querySelectorAll(".left-portrait img")];
  const rightImage = nativeHeader.querySelector(".right-portrait img");

  const attackerName =
    leftImages.find((image) => image.dataset?.tooltip)
      ?.dataset?.tooltip ?? "";

  const weaponName =
    nativeHeader.querySelector(".card-title")
      ?.textContent
      ?.replace(/\s+/g, " ")
      .trim() ?? "";

  const targetName =
    rightImage?.dataset?.tooltip ?? "";

  html.classList.add(
    "evil-coc7-card",
    "evil-coc7-melee-damage-card",
    "evil-coc7-damage-viewer-card"
  );

  const layout = document.createElement("div");
  layout.className = "evil-coc7-damage-viewer-layout";

  const header = createCompactDamageNamesHeader({
    attackerName,
    itemName: weaponName,
    targetName
  });

  layout.append(header);
  nativeHeader.classList.add("evil-coc7-native-hidden");

  summary.classList.add("evil-coc7-damage-viewer-summary");

  const metaRow = [...content.children].find((element) =>
    element.matches?.("div.flexrow") &&
    !element.classList.contains("coc7-card-buttons") &&
    (
      element.querySelector(".coc7-tags") ||
      element.textContent?.includes(game.i18n.localize("CoC7.Armor"))
    )
  );

  if (metaRow) {
    metaRow.classList.add("evil-coc7-damage-viewer-meta");
    decorateDamageArmorReadout(metaRow);
  }

  content.prepend(layout);

  for (const flavor of html.querySelectorAll(".flavor-text")) {
    flavor.classList.add("evil-coc7-original-flavor");
  }
}

function createCompactDamageNamesHeader(context) {
  const header = document.createElement("div");
  header.className = "evil-coc7-damage-compact-header";

  const attacker = document.createElement("div");
  attacker.className =
    "evil-coc7-damage-compact-name evil-coc7-damage-compact-attacker";
  attacker.textContent = context.attackerName || "—";

  const weapon = document.createElement("div");
  weapon.className = "evil-coc7-damage-compact-weapon";
  weapon.textContent = context.itemName || "—";

  const target = document.createElement("div");
  target.className =
    "evil-coc7-damage-compact-name evil-coc7-damage-compact-target";
  target.textContent = context.targetName || "—";

  header.append(attacker, weapon, target);
  return header;
}

function isMeleeDamageMessage(message) {
  // Lorsqu'un CoC7ChatDamage provient réellement du workflow mêlée,
  // CoC7ChatCombatMelee conserve l'id de cette carte dans damageMessageId.
  // C'est le signal le plus fiable et il ne dépend pas de la résolution UUID.
  const linkedMeleeMessage = game.messages?.contents?.some?.((candidate) =>
    candidate.flags?.CoC7?.load?.as === MELEE_CARD_TYPE &&
    candidate.flags?.CoC7?.load?.damageMessageId === message.id
  );

  if (linkedMeleeMessage) return true;

  const load = message.flags?.CoC7?.load ?? {};
  let item = resolveUuidDocument(load.itemUuid);

  // Fallback utile pour certains UUID d'Items synthétiques de Token :
  // retrouver l'Item depuis l'acteur attaquant et l'id terminal de l'UUID.
  if (!item && load.itemUuid) {
    const attackerDocument = resolveUuidDocument(load.attackerUuid);
    const attackerActor = attackerDocument?.actor ?? attackerDocument ?? null;
    const itemId = String(load.itemUuid).split(".").at(-1);

    if (itemId && attackerActor?.items?.get) {
      item = attackerActor.items.get(itemId);
    }
  }

  // CoC7ChatDamage sert aussi au combat à distance. Si l'Item est disponible,
  // on garde donc l'exclusion explicite des armes ranged.
  return (
    item?.type === "weapon" &&
    item.system?.properties?.rngd !== true
  );
}

function decorateMeleeDamageMessage(message, html, content) {
  if (content.querySelector(":scope > .evil-coc7-melee-damage-layout")) return;

  const context = getMeleeDamageContext(message, content);

  const damageClasses = [
    "evil-coc7-card",
    "evil-coc7-melee-damage-card",
    `evil-coc7-damage-phase-${context.phase}`,
    context.isCritical
      ? "evil-coc7-damage-critical"
      : "evil-coc7-damage-normal",
    context.isImpale ? "evil-coc7-damage-impale" : null,
    context.ignoreArmor ? "evil-coc7-damage-ignore-armor" : null
  ].filter(Boolean);

  html.classList.add(...damageClasses);

  const layout = document.createElement("div");
  layout.className = "evil-coc7-melee-damage-layout";

  layout.append(createMeleeDamageHeader(context));

  if (!context.hasRoll) {
    layout.append(createMeleeDamagePreview(context));
  }

  const nativeHeader = content.querySelector(":scope > .coc7-chat-header");
  if (nativeHeader) nativeHeader.classList.add("evil-coc7-native-hidden");

  const nativeSummary = content.querySelector(":scope > .coc7-chat-content");
  if (nativeSummary) nativeSummary.classList.add("evil-coc7-native-hidden");

  content.prepend(layout);

  const roll = content.querySelector(":scope > .dice-roll");
  if (roll) {
    decorateMeleeDamageRoll(roll, context);
  }

  const description = content.querySelector(":scope > .coc7-chat-description");
  if (description) {
    description.classList.add("evil-coc7-damage-description");
  }

  decorateMeleeDamageControls(content, context);

  for (const flavor of html.querySelectorAll(".flavor-text")) {
    flavor.classList.add("evil-coc7-original-flavor");
  }
}

function getMeleeDamageContext(message, content) {
  const load = message.flags?.CoC7?.load ?? {};
  const attackerDocument = resolveUuidDocument(load.attackerUuid);
  const targetDocument = resolveUuidDocument(load.targetUuid);
  const itemDocument = resolveUuidDocument(load.itemUuid);

  const nativeHeader = content.querySelector(":scope > .coc7-chat-header");
  const leftPortrait = nativeHeader?.querySelector(".left-portrait");
  const leftImages = leftPortrait ? [...leftPortrait.querySelectorAll("img")] : [];
  const hasDoublePortrait =
    leftPortrait?.classList.contains("double-portrait") ?? false;

  const nativeAttackerImage = hasDoublePortrait ? leftImages[0] : null;
  const nativeItemImage =
    hasDoublePortrait ? leftImages[1] : leftImages[0] ?? null;
  const nativeTargetImage = nativeHeader?.querySelector(".right-portrait img");

  const roll = content.querySelector(":scope > .dice-roll");
  const diceTotal = roll?.querySelector(".dice-total");
  const rollDamageButton = content.querySelector('[data-action="rollDamage"]');

  const formulaFromButton = rollDamageButton
    ? getTextAfterColon(rollDamageButton.textContent)
    : "";

  const rollFormula =
    message.rolls?.[0]?.formula ??
    roll?.querySelector(".dice-formula")?.textContent?.trim() ??
    "";

  const effectText = getMeleeDamageEffectText(content);

  let phase = "prepare";
  if (load.isDamageInflicted) {
    phase = "inflicted";
  } else if (roll) {
    phase = "rolled";
  } else if (!rollDamageButton && effectText) {
    phase = "ready";
  }

  return {
    load,
    phase,
    hasRoll: Boolean(roll),
    total:
      diceTotal?.textContent?.replace(/\s+/g, " ").trim() ??
      (message.rolls?.[0]?.total != null ? String(message.rolls[0].total) : ""),
    formula: formulaFromButton || String(rollFormula ?? "").trim(),
    effectText,
    attackerName:
      nativeAttackerImage?.dataset?.tooltip ||
      getDocumentName(attackerDocument) ||
      message.speaker?.alias ||
      "",
    attackerImage:
      nativeAttackerImage?.getAttribute("src") ||
      getDocumentImage(attackerDocument),
    targetName:
      nativeTargetImage?.dataset?.tooltip ||
      getDocumentName(targetDocument) ||
      "",
    targetImage:
      nativeTargetImage?.getAttribute("src") ||
      (load.targetUuid ? getDocumentImage(targetDocument) : ""),
    itemName:
      nativeHeader?.querySelector(".card-title")
        ?.textContent
        ?.replace(/\s+/g, " ")
        .trim() ||
      getDocumentName(itemDocument) ||
      "",
    itemImage:
      nativeItemImage?.getAttribute("src") ||
      itemDocument?.img ||
      "",
    hasTarget: Boolean(load.targetUuid),
    isCritical: load.isCritical === true,
    isImpale: load.isImpale === true,
    ignoreArmor: load.ignoreArmor === true,
    isDamageInflicted: load.isDamageInflicted === true,
    targetArmor:
      load.targetArmor != null
        ? String(load.targetArmor)
        : ""
  };
}

function getTextAfterColon(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  const index = text.indexOf(":");
  return index >= 0 ? text.slice(index + 1).trim() : "";
}

function getMeleeDamageEffectText(content) {
  const fauxButton = content.querySelector(":scope > .coc7-faux-button");
  if (fauxButton) {
    return getTextAfterColon(fauxButton.textContent) ||
      fauxButton.textContent?.replace(/\s+/g, " ").trim() ||
      "";
  }

  const dealButton = content.querySelector('[data-action="dealDamage"]');
  if (dealButton) {
    const text = dealButton.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const open = text.indexOf("(");
    const close = text.lastIndexOf(")");

    if (open >= 0 && close > open) {
      return text.slice(open + 1, close).trim();
    }
  }

  const totalDamage = [...content.querySelectorAll(":scope > .coc7-faux-button")]
    .map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "")
    .find(Boolean);

  return totalDamage ? getTextAfterColon(totalDamage) || totalDamage : "";
}

function createMeleeDamageHeader(context) {
  return createCompactDamageNamesHeader(context);
}

function createMeleeDamagePreview(context) {
  const preview = document.createElement("div");
  preview.className = "evil-coc7-damage-preview evil-coc7-damage-preview-simple";

  const row = document.createElement("div");
  row.className = "evil-coc7-damage-formula-row";

  const weapon = document.createElement("div");
  weapon.className = "evil-coc7-damage-formula-weapon";

  if (context.itemImage) {
    const image = document.createElement("img");
    image.className = "evil-coc7-damage-formula-weapon-image";
    image.src = context.itemImage;
    image.alt = context.itemName || "";
    weapon.append(image);
  } else {
    const icon = document.createElement("i");
    icon.className = "game-icon game-icon-crossed-swords";
    icon.setAttribute("aria-hidden", "true");
    weapon.append(icon);
  }

  const value = document.createElement("div");
  value.className = "evil-coc7-damage-preview-value";

  const displayed =
    context.phase === "ready" || context.phase === "inflicted"
      ? context.effectText
      : context.formula;

  value.textContent = displayed || "—";

  row.append(weapon, value);
  preview.append(row);

  return preview;
}

function decorateMeleeDamageRoll(roll, context) {
  if (roll.classList.contains("evil-coc7-damage-roll")) return;

  roll.classList.add("evil-coc7-damage-roll");

  const result = roll.querySelector(".dice-result");
  const total = result?.querySelector(".dice-total");
  if (!result || !total) return;

  const verdict = document.createElement("div");
  verdict.className = "evil-coc7-damage-roll-verdict";

  const icon = document.createElement("div");
  icon.className = "evil-coc7-damage-roll-icon";

  const symbol = document.createElement("i");
  symbol.className = context.isImpale
    ? "fa-solid fa-burst"
    : context.isCritical
      ? "fa-solid fa-star"
      : "fa-solid fa-burst";
  symbol.setAttribute("aria-hidden", "true");
  icon.append(symbol);

  const label = document.createElement("div");
  label.className = "evil-coc7-damage-roll-label";
  label.textContent = context.isDamageInflicted
    ? localizeModule("Damage.Inflicted")
    : localizeModule("Damage.Title");

  const detail = document.createElement("div");
  detail.className = "evil-coc7-damage-roll-detail";
  detail.textContent = context.effectText && context.effectText !== context.total
    ? context.effectText
    : "";
  detail.hidden = !detail.textContent;

  verdict.append(icon, label, detail);
  total.insertAdjacentElement("afterend", verdict);
}


function decorateDamageArmorReadout(metaRow) {
  if (!metaRow) return;

  const armorLabel = [...metaRow.querySelectorAll("label")]
    .find((label) => {
      const text = label.textContent
        ?.replace(/\s+/g, " ")
        .trim()
        .replace(/:$/, "");

      return text === game.i18n.localize("CoC7.Armor");
    });

  const armorReadout = armorLabel?.closest("div");
  if (!armorReadout) return;

  armorReadout.classList.add("evil-coc7-damage-armor-readout");
}

function decorateMeleeDamageControls(content, context) {
  const metaRow = [...content.children].find((element) =>
    element.matches?.("div.flexrow") &&
    element.querySelector(".coc7-tags") &&
    !element.classList.contains("coc7-card-buttons")
  );

  if (metaRow) {
    metaRow.classList.add("evil-coc7-damage-meta-row");
    decorateDamageArmorReadout(metaRow);
  }

  const criticalArea = [...content.querySelectorAll(":scope > .coc7-card-buttons")]
    .find((area) =>
      area.querySelector('[data-set="isCritical"]') ||
      area.querySelector('[data-set="isImpale"]')
    );

  if (criticalArea) {
    criticalArea.classList.remove("coc7-half-buttons", "flexrow");
    criticalArea.classList.add("evil-coc7-damage-critical-controls");
  }

  const armorArea = [...content.querySelectorAll(":scope > .coc7-card-buttons")]
    .find((area) =>
      area.querySelector('[data-set="ignoreArmor"]') ||
      area.querySelector('[data-action="rollArmor"]') ||
      area.querySelector('input[type="text"]')
    );

  if (armorArea) {
    armorArea.classList.add("evil-coc7-damage-armor-controls");
  }

  const rollButton = content.querySelector('[data-action="rollDamage"]');
  const rollArea = rollButton?.closest(".coc7-card-buttons");

  if (rollButton) {
    rollButton.textContent = localizeModule("Action.RollDamage");
  }

  if (rollArea) {
    rollArea.classList.add("evil-coc7-damage-roll-action");
  }

  const applyButton =
    content.querySelector('[data-action="dealDamage"]') ||
    content.querySelector('[data-action="applyValue"]');

  if (applyButton) {
    applyButton.textContent = localizeModule("Action.InflictDamage");
  }

  const applyArea = applyButton?.closest(".coc7-card-buttons");
  if (applyArea) {
    applyArea.classList.add("evil-coc7-damage-apply-action");
  }

  const faux = content.querySelector(":scope > .coc7-faux-button");
  if (faux) {
    faux.classList.add("evil-coc7-damage-final-status");
  }
}

function decorateMeleeResolutionMessage(message, html, content) {
  if (content.querySelector(":scope > .evil-coc7-melee-resolution-layout")) return;

  const context = getMeleeResolutionContext(message);
  const kind = context.kind;

  html.classList.add(
    "evil-coc7-card",
    "evil-coc7-melee-resolution-card",
    `evil-coc7-resolution-${kind}`
  );

  const layout = document.createElement("div");
  layout.className = "evil-coc7-melee-resolution-layout";

  const header = document.createElement("div");
  header.className = "evil-coc7-resolution-header";

  const title = document.createElement("div");
  title.className = "evil-coc7-resolution-title";
  title.textContent = localizeModule("Melee.Resolution");

  const ornament = document.createElement("div");
  ornament.className = "evil-coc7-resolution-header-ornament";
  ornament.setAttribute("aria-hidden", "true");

  header.append(title, ornament);
  layout.append(header);

  if (context.actorName || context.targetName) {
    layout.append(createMeleeResolutionParticipants(context));
  }

  const verdict = document.createElement("div");
  verdict.className = "evil-coc7-resolution-verdict";

  const icon = document.createElement("div");
  icon.className = "evil-coc7-resolution-icon";

  const symbol = document.createElement("i");
  symbol.setAttribute("aria-hidden", "true");

  switch (kind) {
    case "dodge":
      symbol.className = "fa-solid fa-person-running";
      break;
    case "maneuver":
      symbol.className = "fa-solid fa-arrows-spin";
      break;
    case "miss":
      symbol.className = "fa-solid fa-xmark";
      break;
    case "no-winner":
      symbol.className = "game-icon game-icon-crossed-swords";
      break;
    default:
      symbol.className = "fa-solid fa-scale-balanced";
      break;
  }

  icon.append(symbol);

  const verdictText = document.createElement("div");
  verdictText.className = "evil-coc7-resolution-verdict-text";
  verdictText.textContent =
    context.resultText ||
    localizeModule("Melee.CombatResolved");

  verdict.append(icon, verdictText);
  layout.append(verdict);

  if (context.itemName) {
    const action = document.createElement("div");
    action.className = "evil-coc7-resolution-action";

    const actionIcon = document.createElement("i");
    actionIcon.className = "fa-solid fa-shield-halved";
    actionIcon.setAttribute("aria-hidden", "true");

    const actionText = document.createElement("span");
    actionText.textContent = context.itemName;

    action.append(actionIcon, actionText);
    layout.append(action);
  }

  const nativeHeader = content.querySelector(":scope > .coc7-chat-header");
  if (nativeHeader) nativeHeader.classList.add("evil-coc7-native-hidden");

  for (const nativeContent of content.querySelectorAll(
    ":scope > .coc7-chat-content"
  )) {
    nativeContent.classList.add("evil-coc7-native-hidden");
  }

  content.prepend(layout);

  for (const flavor of html.querySelectorAll(".flavor-text")) {
    flavor.classList.add("evil-coc7-original-flavor");
  }
}

function getMeleeResolutionContext(message) {
  const load = message.flags?.CoC7?.load ?? {};

  const actorDocument = resolveUuidDocument(load.attackerUuid);
  const targetDocument = resolveUuidDocument(load.targetUuid);
  const itemDocument = resolveUuidDocument(load.itemUuid);

  const resultText = String(load.resultText ?? "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    kind: getMeleeResolutionKind(resultText),
    resultText,
    actorName: getDocumentName(actorDocument),
    actorImage: getDocumentImage(actorDocument),
    targetName: getDocumentName(targetDocument),
    targetImage: getDocumentImage(targetDocument),
    itemName: getDocumentName(itemDocument),
    itemImage: getDocumentImage(itemDocument)
  };
}

function getMeleeResolutionKind(resultText) {
  if (matchesLocalizedTemplate(resultText, "CoC7.NoWinner")) {
    return "no-winner";
  }

  if (matchesLocalizedTemplate(resultText, "CoC7.DodgeSuccess")) {
    return "dodge";
  }

  if (matchesLocalizedTemplate(resultText, "CoC7.ManeuverSuccess")) {
    return "maneuver";
  }

  if (matchesLocalizedTemplate(resultText, "CoC7.InitiatorMissed")) {
    return "miss";
  }

  return "neutral";
}

function matchesLocalizedTemplate(text, key) {
  const template = String(game.i18n.localize(key) ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!template || !text) return false;

  const pattern = template
    .split(/(\{[^}]+\})/g)
    .map((part) =>
      /^\{[^}]+\}$/.test(part)
        ? ".+?"
        : escapeRegExp(part)
    )
    .join("");

  try {
    return new RegExp(`^${pattern}$`, "iu").test(text);
  } catch (_error) {
    return text === template;
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createMeleeResolutionParticipants(context) {
  const row = document.createElement("div");
  row.className = "evil-coc7-resolution-participants";

  if (context.actorName) {
    const actor = document.createElement("div");
    actor.className =
      "evil-coc7-resolution-participant-name evil-coc7-resolution-participant-attacker";
    actor.textContent = context.actorName;
    row.append(actor);
  }

  if (context.actorName && context.targetName) {
    const divider = document.createElement("div");
    divider.className = "evil-coc7-resolution-divider";

    const icon = document.createElement("i");
    icon.className = "game-icon game-icon-crossed-swords";
    icon.setAttribute("aria-hidden", "true");

    divider.append(icon);
    row.append(divider);
  }

  if (context.targetName) {
    const target = document.createElement("div");
    target.className =
      "evil-coc7-resolution-participant-name evil-coc7-resolution-participant-target";
    target.textContent = context.targetName;
    row.append(target);
  }

  return row;
}

function decorateMeleeTargetPreparationMessage(message, html, content) {
  if (content.querySelector(":scope > .evil-coc7-melee-defender-layout")) return;

  const context = getMeleeTargetContext(message);

  html.classList.add(
    "evil-coc7-card",
    "evil-coc7-melee-defender-card",
    "evil-coc7-defender-preparation",
    `evil-coc7-defender-reaction-${context.reaction}`
  );

  const layout = document.createElement("div");
  layout.className = "evil-coc7-melee-defender-layout";

  layout.append(
    createMeleeDefenderHeader(context),
    createMeleeDefenderContext(context),
    createMeleeDefenderHero(context)
  );

  const description = content.querySelector(":scope > .coc7-chat-description");
  if (description) {
    description.classList.add(
      "evil-coc7-melee-description",
      "evil-coc7-defender-description"
    );
    layout.append(description);
  }

  const choiceArea = [...content.querySelectorAll(
    ":scope > .owner-and-keeper-block.coc7-card-buttons"
  )].find((block) =>
    block.querySelector('[data-action="dodge"]') ||
    block.querySelector('[data-action="setNoResponse"]') ||
    block.querySelector('[data-action="setFightBack"]') ||
    block.querySelector('[data-action="setManeuvers"]')
  );

  if (choiceArea) {
    // CoC7ChatDropdown utilise le bouton natif comme ancre pour afficher
    // les listes "Rendre les coups" et "Manœuvre". Sur Foundry V14,
    // déplacer ce bloc dans notre wrapper modifie son contexte de position
    // et rend le dropdown inutilisable.
    //
    // On garde donc le bloc à sa position native et on retire seulement
    // les classes de présentation CoC7 qui imposaient les demi-boutons.
    choiceArea.classList.remove("flexrow", "coc7-half-buttons");
    choiceArea.classList.add("evil-coc7-defender-choice-area");
    decorateMeleeDefenderChoices(choiceArea);
  }

  const modifierSection = [...content.querySelectorAll(
    ":scope > .coc7-chat-content"
  )].find((section) =>
    section.querySelector('input[type="range"][name="poolModifier"]')
  );

  if (modifierSection) {
    modifierSection.classList.add(
      "evil-coc7-melee-pool-section",
      "evil-coc7-defender-pool-section"
    );
  }

  const targetRoll = content.querySelector(
    ':scope > .owner-and-keeper-block.coc7-card-buttons [data-action="targetRoll"]'
  );

  if (targetRoll) {
    const actionArea =
      targetRoll.closest(":scope > .owner-and-keeper-block.coc7-card-buttons") ??
      targetRoll.parentElement;

    if (actionArea) {
      actionArea.classList.add("evil-coc7-defender-action-area");
      decorateMeleeTargetRollButton(targetRoll, context);
    }
  }

  const nativeHeader = content.querySelector(":scope > .coc7-chat-header");
  if (nativeHeader) nativeHeader.classList.add("evil-coc7-native-hidden");

  content.prepend(layout);

  for (const flavor of html.querySelectorAll(".flavor-text")) {
    flavor.classList.add("evil-coc7-original-flavor");
  }
}

function decorateMeleeTargetRolledMessage(message, html, content, rolls) {
  if (content.querySelector(":scope > .evil-coc7-melee-defender-result-layout")) return;

  const context = getMeleeTargetContext(message);
  const totals = rolls
    .map((roll) => roll.querySelector(".dice-total"))
    .filter(Boolean);
  const state = totals.length ? detectState(totals.at(-1)) : "unknown";

  html.classList.add(
    "evil-coc7-card",
    "evil-coc7-melee-defender-card",
    "evil-coc7-defender-result",
    `evil-coc7-defender-reaction-${context.reaction}`,
    `evil-coc7-main-state-${state}`
  );

  const layout = document.createElement("div");
  layout.className = "evil-coc7-melee-defender-result-layout";
  layout.append(
    createMeleeDefenderHeader(context),
    createMeleeDefenderContext(context)
  );

  const description = content.querySelector(":scope > .coc7-chat-description");
  if (description) {
    description.classList.add(
      "evil-coc7-melee-description",
      "evil-coc7-defender-description"
    );
    layout.append(description);
  }

  const nativeHeader = content.querySelector(":scope > .coc7-chat-header");
  if (nativeHeader) nativeHeader.classList.add("evil-coc7-native-hidden");

  content.prepend(layout);

  for (const roll of rolls) {
    decorateRoll(roll);
  }

  for (const flavor of html.querySelectorAll(".flavor-text")) {
    flavor.classList.add("evil-coc7-original-flavor");
  }
}

function decorateMeleeTargetNoResponseMessage(message, html, content) {
  if (content.querySelector(":scope > .evil-coc7-melee-defender-no-response")) return;

  const context = getMeleeTargetContext(message);

  html.classList.add(
    "evil-coc7-card",
    "evil-coc7-melee-defender-card",
    "evil-coc7-defender-no-response-card",
    "evil-coc7-defender-reaction-no-response"
  );

  const layout = document.createElement("div");
  layout.className =
    "evil-coc7-melee-defender-result-layout evil-coc7-melee-defender-no-response";

  layout.append(
    createMeleeDefenderHeader(context),
    createMeleeDefenderContext(context)
  );

  const result = document.createElement("div");
  result.className = "evil-coc7-defender-no-response-result";

  const icon = document.createElement("div");
  icon.className = "evil-coc7-defender-no-response-icon";
  const shield = document.createElement("i");
  shield.className = "fa-solid fa-shield-halved";
  shield.setAttribute("aria-hidden", "true");
  icon.append(shield);

  const text = document.createElement("div");
  text.className = "evil-coc7-defender-no-response-label";
  text.textContent = getDefenderReactionLabel("no-response");

  result.append(icon, text);
  layout.append(result);

  const nativeHeader = content.querySelector(":scope > .coc7-chat-header");
  if (nativeHeader) nativeHeader.classList.add("evil-coc7-native-hidden");

  content.prepend(layout);

  for (const flavor of html.querySelectorAll(".flavor-text")) {
    flavor.classList.add("evil-coc7-original-flavor");
  }
}

function getMeleeTargetContext(message) {
  const load = message.flags?.CoC7?.load ?? {};
  const targetDocument = resolveUuidDocument(load.targetUuid);
  const targetActor = targetDocument?.actor ?? targetDocument ?? message.speakerActor ?? null;
  const attackerDocument = resolveUuidDocument(load.attackerUuid);
  const attackerActor = attackerDocument?.actor ?? attackerDocument ?? null;
  const responseItem = resolveUuidDocument(load.itemUuid);
  const attackerMessage = load.attackerMessageId
    ? game.messages.get(load.attackerMessageId)
    : null;

  const attackerItem = resolveUuidDocument(
    attackerMessage?.flags?.CoC7?.load?.itemUuid
  );

  const reaction = getMeleeTargetReaction(load, responseItem);
  const reactionSkill = getMeleeTargetReactionSkill(
    reaction,
    responseItem,
    targetActor
  );

  const dodgeSkill = targetActor?.items?.find?.(
    (item) => item.type === "skill" && item.system?.isDodge
  );

  const displaySkill =
    reaction === "none"
      ? {
          name: dodgeSkill?.name ?? "",
          value: dodgeSkill?.system?.value != null
            ? String(dodgeSkill.system.value)
            : ""
        }
      : reactionSkill;

  // IMPORTANT: CoC7 peut volontairement garder le jet de l'attaquant
  // caché (`checkRevealed === false`) et afficher sur sa propre carte
  // l'action native `revealCheck`. Ne jamais lire le HTML du message pour
  // contourner cet état : notre carte défenseur doit respecter ce masquage.
  const attackerCheckRevealed =
    attackerMessage?.flags?.CoC7?.load?.checkRevealed === true;

  const attackerResult = attackerCheckRevealed
    ? getCombatMessageResult(attackerMessage)
    : {
        state: "hidden",
        label: localizeModule("Visibility.Hidden"),
        total: ""
      };

  return {
    load,
    targetActor,
    attackerActor,
    responseItem,
    reaction,
    reactionSkill,
    displaySkill,
    targetName:
      getDocumentName(targetDocument) ||
      targetActor?.name ||
      message.speaker?.alias ||
      "",
    targetImage:
      getDocumentImage(targetDocument) ||
      getActorPortrait(targetActor),
    attackerName:
      getDocumentName(attackerDocument) ||
      attackerActor?.name ||
      "",
    attackerWeaponName:
      attackerItem?.name ||
      getCombatMessageCardTitle(attackerMessage) ||
      game.i18n.localize("CoC7.Combat"),
    attackerCheckRevealed,
    attackerResult,
    difficulty:
      localizeDifficulty(load.dicePool?.difficulty) ||
      game.i18n.localize("CoC7.RegularDifficulty")
  };
}

function getMeleeTargetReaction(load, item) {
  if (load.isNoResponse) return "no-response";
  if (item?.type === "weapon") return "fight-back";
  if (item?.type === "skill" && item.system?.isDodge) return "dodge";
  if (item?.type === "skill") return "maneuver";
  return "none";
}

function getMeleeTargetReactionSkill(reaction, item, actor) {
  if (!item || reaction === "none" || reaction === "no-response") {
    return { name: "", value: "" };
  }

  if (reaction === "fight-back") {
    const skillId = item.system?.skill?.main?.id;
    const skill = skillId && actor?.items?.get
      ? actor.items.get(skillId)
      : null;

    return {
      name: skill?.name ?? item.name ?? "",
      value: skill?.system?.value != null
        ? String(skill.system.value)
        : ""
    };
  }

  return {
    name: item.name ?? "",
    value: item.system?.value != null
      ? String(item.system.value)
      : ""
  };
}

function getCombatMessageCardTitle(message) {
  if (!message?.content) return "";

  const holder = document.createElement("div");
  holder.innerHTML = message.content;
  return holder.querySelector(".card-title")
    ?.textContent
    ?.replace(/\s+/g, " ")
    .trim() ?? "";
}

function getCombatMessageResult(message) {
  if (!message?.content) {
    return { state: "unknown", label: "", total: "" };
  }

  const holder = document.createElement("div");
  holder.innerHTML = message.content;
  const total = holder.querySelector(".dice-total");

  if (!total) {
    return { state: "unknown", label: "", total: "" };
  }

  const state = detectState(total);
  const displayed = extractDisplayedResult(total.textContent);

  return {
    state,
    label: getVerdictLabel(state),
    total: displayed.text
  };
}

function createMeleeDefenderHeader(context) {
  const header = document.createElement("div");
  header.className = "evil-coc7-melee-defender-header";

  const portraitWrap = document.createElement("div");
  portraitWrap.className =
    "evil-coc7-card-portrait-wrap evil-coc7-defender-portrait-wrap";

  const portrait = document.createElement("img");
  portrait.className = "evil-coc7-card-portrait";
  portrait.src = context.targetImage || "icons/svg/mystery-man.svg";
  portrait.alt = context.targetName;
  portraitWrap.append(portrait);

  const identity = document.createElement("div");
  identity.className = "evil-coc7-defender-identity";

  const actor = document.createElement("div");
  actor.className = "evil-coc7-card-actor";
  actor.textContent = context.targetName;

  const role = document.createElement("div");
  role.className = "evil-coc7-defender-role";
  role.textContent = localizeModule("Participant.Defender");

  const difficulty = document.createElement("div");
  difficulty.className = "evil-coc7-card-difficulty";

  const difficultyIcon = document.createElement("i");
  difficultyIcon.className = "fa-solid fa-crosshairs";
  difficultyIcon.setAttribute("aria-hidden", "true");

  const difficultyText = document.createElement("span");
  difficultyText.textContent = formatDifficultyLine(context.difficulty);

  difficulty.append(difficultyIcon, difficultyText);
  identity.append(actor, role, difficulty);

  const reactionIcon = createDefenderReactionIcon(
    context.reaction === "none" ? "defense" : context.reaction
  );
  reactionIcon.classList.add("evil-coc7-defender-header-icon");

  header.append(portraitWrap, identity, reactionIcon);
  return header;
}

function createMeleeDefenderContext(context) {
  const block = document.createElement("div");
  block.className = "evil-coc7-defender-context";

  block.append(
    createDefenderContextLine(
      localizeModule("Participant.Attacker"),
      context.attackerName
    ),
    createDefenderContextLine(
      localizeModule("Context.Weapon"),
      context.attackerWeaponName
    )
  );

  // Tant que CoC7 garde le jet de l'attaquant caché, on n'affiche aucune
  // ligne de résultat sur la carte défenseur. Une fois révélé, le vrai
  // résultat peut apparaître normalement.
  if (context.attackerCheckRevealed && context.attackerResult?.label) {
    const resultText = context.attackerResult.total
      ? `${context.attackerResult.total} · ${context.attackerResult.label}`
      : context.attackerResult.label;

    const resultLine = createDefenderContextLine(
      localizeModule("Context.AttackerResult"),
      resultText
    );
    resultLine.classList.add(
      "evil-coc7-defender-attacker-result",
      `evil-coc7-context-state-${context.attackerResult.state}`
    );
    block.append(resultLine);
  }

  if (context.reaction !== "none") {
    const reactionLine = createDefenderContextLine(
      localizeModule("Context.YourReaction"),
      getDefenderReactionLabel(context.reaction)
    );
    reactionLine.classList.add("evil-coc7-defender-current-reaction");
    block.append(reactionLine);
  }

  return block;
}

function createDefenderContextLine(labelText, valueText) {
  const line = document.createElement("div");
  line.className = "evil-coc7-defender-context-line";

  const label = document.createElement("span");
  label.className = "evil-coc7-defender-context-label";
  label.textContent = `${labelText} :`;

  const value = document.createElement("span");
  value.className = "evil-coc7-defender-context-value";
  value.textContent = valueText || "—";

  line.append(label, value);
  return line;
}

function createMeleeDefenderHero(context) {
  const hero = document.createElement("div");
  hero.className = "evil-coc7-defender-hero";

  const value = document.createElement("div");
  value.className = "evil-coc7-defender-hero-value";

  const number = document.createElement("span");
  number.className = "evil-coc7-defender-hero-number";
  number.textContent =
    context.reaction === "no-response"
      ? "—"
      : context.displaySkill?.value || "—";

  const percent = document.createElement("span");
  percent.className = "evil-coc7-defender-hero-percent";
  percent.textContent =
    context.reaction !== "no-response" && context.displaySkill?.value
      ? "%"
      : "";

  value.append(number, percent);

  const state = document.createElement("div");
  state.className = "evil-coc7-defender-state";

  const icon = createDefenderReactionIcon(
    context.reaction === "none" ? "defense" : context.reaction
  );
  icon.classList.add("evil-coc7-defender-state-icon");

  const label = document.createElement("div");
  label.className = "evil-coc7-defender-state-label";
  label.textContent = localizeModule("State.Defense");

  const detail = document.createElement("div");
  detail.className = "evil-coc7-defender-state-detail";
  detail.textContent =
    context.reaction === "none"
      ? localizeModule("Context.YourReaction")
      : getDefenderReactionLabel(context.reaction);

  const ornament = document.createElement("div");
  ornament.className = "evil-coc7-verdict-ornament";
  ornament.setAttribute("aria-hidden", "true");

  state.append(icon, label, detail, ornament);
  hero.append(value, state);
  return hero;
}

function createDefenderReactionIcon(reaction) {
  const icon = document.createElement("div");
  icon.className = `evil-coc7-defender-reaction-icon evil-coc7-reaction-${reaction}`;

  const symbol = document.createElement("i");
  symbol.setAttribute("aria-hidden", "true");

  switch (reaction) {
    case "dodge":
      symbol.className = "fa-solid fa-person-running";
      break;
    case "fight-back":
      symbol.className = "game-icon game-icon-crossed-swords";
      break;
    case "maneuver":
      symbol.className = "fa-solid fa-arrows-spin";
      break;
    case "no-response":
      symbol.className = "fa-solid fa-shield";
      break;
    default:
      symbol.className = "fa-solid fa-shield-halved";
      break;
  }

  icon.append(symbol);
  return icon;
}

function decorateMeleeDefenderChoices(container) {
  const buttons = [...container.querySelectorAll("button[data-action]")];

  for (const button of buttons) {
    const action = button.dataset.action;
    const reaction = {
      dodge: "dodge",
      setNoResponse: "no-response",
      setFightBack: "fight-back",
      setManeuvers: "maneuver"
    }[action];

    if (!reaction) continue;

    button.classList.add(
      "evil-coc7-defender-choice-button",
      `evil-coc7-choice-${reaction}`
    );

    const icon = createDefenderReactionIcon(reaction);
    icon.classList.add("evil-coc7-defender-choice-icon");

    const label = document.createElement("span");
    label.className = "evil-coc7-defender-choice-label";
    label.textContent = getDefenderReactionLabel(reaction);

    button.replaceChildren(icon, label);

    if (reaction === "fight-back" || reaction === "maneuver") {
      button.addEventListener("click", (event) => {
        armMeleeDropdownRepair(button, {
          clientX: event.clientX,
          clientY: event.clientY
        });
      });
    }
  }
}

function armMeleeDropdownRepair(button, pointer) {
  const messageElement = button.closest(".chat-message");
  const messageId = messageElement?.dataset?.messageId;
  const chatScroll = button.closest(".chat-scroll");

  if (!messageId || !chatScroll) return;

  const dropdownId = `dropdown-${messageId}`;

  const repair = () => {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return false;

    positionMeleeDropdown(dropdown, button, chatScroll, pointer);

    // CoC7 ferme le dropdown 50 ms après la sortie du bouton si la souris
    // n'est pas encore considérée comme entrée dans le menu. Comme le menu
    // est maintenant placé sous le pointeur, on synchronise immédiatement
    // cet état avec le listener natif de CoC7.
    dropdown.dispatchEvent(new MouseEvent("mouseenter", {
      bubbles: false,
      cancelable: false,
      view: window
    }));

    return true;
  };

  // Le dropdown CoC7 est construit de façon asynchrone via renderTemplate.
  // On observe donc son insertion au lieu de remplacer sa mécanique.
  if (repair()) return;

  const observer = new MutationObserver(() => {
    if (repair()) observer.disconnect();
  });

  observer.observe(chatScroll, {
    childList: true,
    subtree: true
  });

  // Garde-fou : aucune observation persistante si CoC7 n'a finalement
  // pas créé de dropdown (ex. liste vide / action non autorisée).
  window.setTimeout(() => observer.disconnect(), 1200);
}

function positionMeleeDropdown(dropdown, button, chatScroll, pointer) {
  const anchor =
    button.closest(".evil-coc7-defender-choice-area") ??
    button.closest(".coc7-card-buttons") ??
    button;

  const anchorRect = anchor.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const scrollRect = chatScroll.getBoundingClientRect();

  dropdown.style.position = "absolute";
  dropdown.style.zIndex = "1000";
  dropdown.style.width = `${anchorRect.width}px`;
  dropdown.style.left =
    `${anchorRect.left - scrollRect.left + chatScroll.scrollLeft}px`;
  dropdown.style.right = "auto";

  // Le bord supérieur du menu est placé quelques pixels au-dessus du point
  // de clic. Le curseur se retrouve donc immédiatement dans le dropdown
  // au lieu de devoir traverser Esquive / Pas de réponse pour l'atteindre.
  const pointerClientY =
    Number.isFinite(pointer?.clientY) && pointer.clientY > 0
      ? pointer.clientY
      : buttonRect.top + (buttonRect.height / 2);

  const desiredTop =
    pointerClientY -
    scrollRect.top +
    chatScroll.scrollTop -
    8;

  const visibleTop = chatScroll.scrollTop + 2;
  const visibleBottom =
    chatScroll.scrollTop +
    chatScroll.clientHeight -
    dropdown.offsetHeight -
    2;

  const clampedTop =
    visibleBottom >= visibleTop
      ? Math.min(Math.max(desiredTop, visibleTop), visibleBottom)
      : Math.max(desiredTop, visibleTop);

  dropdown.style.top = `${clampedTop}px`;
}

function decorateMeleeTargetRollButton(button, context) {
  button.classList.add("evil-coc7-defender-roll-button");

  const title = document.createElement("span");
  title.className = "evil-coc7-defender-roll-title";

  const detail = document.createElement("span");
  detail.className = "evil-coc7-defender-roll-detail";

  switch (context.reaction) {
    case "dodge":
      title.textContent = localizeModule("Action.RollDefense");
      break;
    case "fight-back":
      title.textContent = localizeModule("Action.RollFightBack");
      break;
    case "maneuver":
      title.textContent = localizeModule("Action.RollManeuver");
      break;
    case "no-response":
      title.textContent = localizeModule("Action.ConfirmResponse");
      break;
    default:
      title.textContent = localizeModule("Action.RollDefense");
  }

  if (context.reaction === "no-response") {
    detail.textContent = getDefenderReactionLabel("no-response");
  } else {
    const skillName = context.reactionSkill?.name || "";
    const skillValue = context.reactionSkill?.value
      ? `${context.reactionSkill.value} %`
      : "";
    detail.textContent = [skillName, skillValue]
      .filter(Boolean)
      .join(" · ");
  }

  button.replaceChildren(title, detail);
}

function getDefenderReactionLabel(reaction) {
  const moduleKey = {
    dodge: "Reaction.Dodge",
    "no-response": "Reaction.NoResponse",
    "fight-back": "Reaction.FightBack",
    maneuver: "Reaction.Maneuver",
    defense: "Reaction.Defense",
    none: "Reaction.Defense"
  }[reaction];

  return moduleKey ? localizeModule(moduleKey) : "";
}



function decorateMeleeInitiatorHiddenMessage(message, html, content) {
  const nativeHeader = content.querySelector(":scope > .coc7-chat-header");
  if (!nativeHeader || content.querySelector(":scope > .evil-coc7-melee-hidden-layout")) return;

  // Cet état correspond au rendu reçu par un autre client lorsque CoC7
  // conserve encore le résultat de l'attaquant caché. On reconstruit
  // uniquement à partir du HTML déjà rendu par CoC7 pour éviter toute fuite
  // d'information depuis les flags/UUID.
  const leftPortrait = nativeHeader.querySelector(".left-portrait");
  const leftImages = leftPortrait ? [...leftPortrait.querySelectorAll("img")] : [];
  const rightImage = nativeHeader.querySelector(".right-portrait img");
  const titleText = nativeHeader.querySelector(".card-title")
    ?.textContent
    ?.replace(/\s+/g, " ")
    .trim();

  html.classList.add(
    "evil-coc7-card",
    "evil-coc7-melee-attacker-hidden-card"
  );

  const layout = document.createElement("div");
  layout.className = "evil-coc7-melee-hidden-layout";

  const left = document.createElement("div");
  left.className = "evil-coc7-melee-hidden-left";

  if (leftImages[0]?.getAttribute("src")) {
    const actorWrap = document.createElement("div");
    actorWrap.className = "evil-coc7-melee-hidden-actor-wrap";

    const actorImage = document.createElement("img");
    actorImage.className = "evil-coc7-melee-hidden-actor";
    actorImage.src = leftImages[0].getAttribute("src");
    actorImage.alt = leftImages[0].dataset?.tooltip || "";

    actorWrap.append(actorImage);

    if (leftImages[1]?.getAttribute("src")) {
      const badge = document.createElement("img");
      badge.className = "evil-coc7-melee-hidden-badge";
      badge.src = leftImages[1].getAttribute("src");
      badge.alt = leftImages[1].dataset?.tooltip || "";
      actorWrap.append(badge);
    }

    left.append(actorWrap);
  }

  const title = document.createElement("div");
  title.className = "evil-coc7-melee-hidden-title";
  title.textContent = titleText || localizeModule("Combat.Title");

  const right = document.createElement("div");
  right.className = "evil-coc7-melee-hidden-right";

  if (rightImage?.getAttribute("src")) {
    const targetImage = document.createElement("img");
    targetImage.className = "evil-coc7-melee-hidden-target";
    targetImage.src = rightImage.getAttribute("src");
    targetImage.alt = rightImage.dataset?.tooltip || "";
    right.append(targetImage);
  }

  layout.append(left, title, right);

  nativeHeader.classList.add("evil-coc7-native-hidden");
  content.prepend(layout);

  for (const flavor of html.querySelectorAll(".flavor-text")) {
    flavor.classList.add("evil-coc7-original-flavor");
  }
}

function decorateMeleeInitiatorRolledMessage(message, html, content) {
  if (content.querySelector(":scope > .evil-coc7-melee-attacker-result-layout")) return;

  const load = message.flags?.CoC7?.load ?? {};
  const nativeHeader = content.querySelector(":scope > .coc7-chat-header");
  const roll = content.querySelector(":scope > .dice-roll");
  if (!nativeHeader || !roll) return;

  const attackerDocument = resolveUuidDocument(load.attackerUuid);
  const attackerActor =
    attackerDocument?.actor ??
    attackerDocument ??
    message.speakerActor ??
    null;

  const leftPortrait = nativeHeader.querySelector(".left-portrait");
  const leftImages = leftPortrait ? [...leftPortrait.querySelectorAll("img")] : [];
  const hasDoublePortrait =
    leftPortrait?.classList.contains("double-portrait") ?? false;

  const nativeActorImage = hasDoublePortrait ? leftImages[0] : null;
  const nativeWeaponImage =
    hasDoublePortrait ? leftImages[1] : leftImages[0] ?? null;
  const nativeTargetImage = nativeHeader.querySelector(".right-portrait img");

  const actorName =
    nativeActorImage?.dataset?.tooltip ||
    getDocumentName(attackerDocument) ||
    attackerActor?.name ||
    message.speaker?.alias ||
    "";

  const actorImage =
    nativeActorImage?.getAttribute("src") ||
    getDocumentImage(attackerDocument) ||
    getActorPortrait(attackerActor);

  const itemName =
    nativeHeader.querySelector(".card-title")
      ?.textContent
      ?.replace(/\s+/g, " ")
      .trim() ||
    game.i18n.localize("CoC7.Combat");

  const targetName =
    nativeTargetImage?.dataset?.tooltip ||
    getDocumentName(resolveUuidDocument(load.targetUuid)) ||
    "";

  const threshold = formatThreshold(load.dicePool ?? {});
  const difficulty =
    localizeDifficulty(load.dicePool?.difficulty) ||
    game.i18n.localize("CoC7.RegularDifficulty");

  const total = roll.querySelector(".dice-total");
  const state = total ? detectState(total) : "unknown";

  html.classList.add(
    "evil-coc7-card",
    "evil-coc7-melee-attacker-result-card",
    `evil-coc7-main-state-${state}`
  );

  const layout = document.createElement("div");
  layout.className = "evil-coc7-melee-attacker-result-layout";

  const header = document.createElement("div");
  header.className = "evil-coc7-melee-attacker-result-header";

  const portraitWrap = document.createElement("div");
  portraitWrap.className =
    "evil-coc7-card-portrait-wrap evil-coc7-melee-attacker-result-portrait-wrap";

  const portrait = document.createElement("img");
  portrait.className = "evil-coc7-card-portrait";
  portrait.src = actorImage || "icons/svg/mystery-man.svg";
  portrait.alt = actorName;
  portraitWrap.append(portrait);

  const identity = document.createElement("div");
  identity.className = "evil-coc7-melee-attacker-result-identity";

  const actor = document.createElement("div");
  actor.className = "evil-coc7-card-actor";
  actor.textContent = actorName;

  const role = document.createElement("div");
  role.className = "evil-coc7-melee-attacker-result-role";
  role.textContent = localizeModule("Participant.Attacker");

  const itemLine = document.createElement("div");
  itemLine.className = "evil-coc7-melee-attacker-result-item-line";

  const item = document.createElement("span");
  item.className = "evil-coc7-melee-attacker-result-item";
  item.textContent = itemName;
  itemLine.append(item);

  if (threshold) {
    const separator = document.createElement("span");
    separator.className = "evil-coc7-card-separator";
    separator.textContent = "·";

    const thresholdText = document.createElement("span");
    thresholdText.className = "evil-coc7-card-threshold";
    thresholdText.textContent = `${threshold} %`;

    itemLine.append(separator, thresholdText);
  }

  const difficultyLine = document.createElement("div");
  difficultyLine.className = "evil-coc7-card-difficulty";

  const difficultyIcon = document.createElement("i");
  difficultyIcon.className = "fa-solid fa-crosshairs";
  difficultyIcon.setAttribute("aria-hidden", "true");

  const difficultyText = document.createElement("span");
  difficultyText.textContent = formatDifficultyLine(difficulty);

  difficultyLine.append(difficultyIcon, difficultyText);
  identity.append(actor, role, itemLine, difficultyLine);

  const weaponIcon = document.createElement("div");
  weaponIcon.className = "evil-coc7-melee-attacker-result-weapon-icon";

  if (nativeWeaponImage?.getAttribute("src")) {
    const weaponImage = document.createElement("img");
    weaponImage.className = "evil-coc7-melee-attacker-result-weapon-image";
    weaponImage.src = nativeWeaponImage.getAttribute("src");
    weaponImage.alt = itemName;
    weaponIcon.append(weaponImage);
  } else {
    const combatIcon = document.createElement("i");
    combatIcon.className = "game-icon game-icon-crossed-swords";
    combatIcon.setAttribute("aria-hidden", "true");
    weaponIcon.append(combatIcon);
  }

  header.append(portraitWrap, identity, weaponIcon);
  layout.append(header);

  if (targetName) {
    const target = document.createElement("div");
    target.className = "evil-coc7-melee-attacker-result-target";

    const label = document.createElement("span");
    label.className = "evil-coc7-melee-attacker-result-target-label";
    label.textContent = localizeModule("Context.TargetLabel");

    const value = document.createElement("span");
    value.className = "evil-coc7-melee-attacker-result-target-name";
    value.textContent = targetName;

    target.append(label, value);
    layout.append(target);
  }

  nativeHeader.classList.add("evil-coc7-native-hidden");
  content.prepend(layout);

  decorateRoll(roll);

  const revealArea = [...content.querySelectorAll(
    ":scope > .coc7-card-buttons"
  )].find((block) =>
    block.querySelector('[data-action="revealCheck"]')
  );

  if (revealArea) {
    revealArea.classList.add("evil-coc7-melee-attacker-reveal-area");
  }

  for (const flavor of html.querySelectorAll(".flavor-text")) {
    flavor.classList.add("evil-coc7-original-flavor");
  }
}

function decorateMeleeInitiatorMessage(message, html, content) {
  if (content.querySelector(":scope > .evil-coc7-melee-layout")) return;

  const load = message.flags?.CoC7?.load ?? {};
  const nativeHeader = content.querySelector(":scope > .coc7-chat-header");
  if (!nativeHeader) return;

  const attackButtons = [
    ...content.querySelectorAll(
      ':scope > .owner-and-keeper-block.coc7-card-buttons [data-action="attackerRoll"]'
    )
  ];
  if (!attackButtons.length) return;

  const attackerDocument = resolveUuidDocument(load.attackerUuid);
  const attackerActor = attackerDocument?.actor ?? attackerDocument ?? message.speakerActor ?? null;

  const leftPortrait = nativeHeader.querySelector(".left-portrait");
  const leftImages = leftPortrait ? [...leftPortrait.querySelectorAll("img")] : [];
  const hasDoublePortrait = leftPortrait?.classList.contains("double-portrait") ?? false;

  const nativeActorImage = hasDoublePortrait ? leftImages[0] : null;
  const nativeWeaponImage = hasDoublePortrait ? leftImages[1] : leftImages[0] ?? null;
  const nativeTargetImage = nativeHeader.querySelector(".right-portrait img");

  const actorName =
    nativeActorImage?.dataset?.tooltip ||
    getDocumentName(attackerDocument) ||
    attackerActor?.name ||
    message.speaker?.alias ||
    "";

  const actorImageSource =
    nativeActorImage?.getAttribute("src") ||
    getDocumentImage(attackerDocument) ||
    getActorPortrait(attackerActor);

  const weaponName =
    nativeHeader.querySelector(".card-title")?.textContent?.replace(/\s+/g, " ").trim() ||
    game.i18n.localize("CoC7.Combat");

  const skills = attackButtons.map((button) =>
    getMeleeSkillSummary(button, attackerActor)
  );
  const primarySkill = skills[0] ?? { name: "", value: "" };

  const nativeTargetLabel = content.querySelector(":scope > .coc7-target-name label");
  const targetName =
    nativeTargetLabel?.textContent
      ?.replace(/\s+/g, " ")
      .trim()
      .replace(/^.*?:\s*/u, "") ||
    nativeTargetImage?.dataset?.tooltip ||
    game.i18n.localize("CoC7.NoTarget");

  const difficulty =
    localizeDifficulty(load.dicePool?.difficulty) ||
    game.i18n.localize("CoC7.RegularDifficulty");

  html.classList.add(
    "evil-coc7-card",
    "evil-coc7-melee-initiator-card",
    "evil-coc7-combat-preparation"
  );

  const layout = document.createElement("div");
  layout.className = "evil-coc7-melee-layout";

  const header = createMeleeInitiatorHeader({
    actorName,
    actorImageSource,
    nativeActorImage,
    weaponName,
    nativeWeaponImage,
    skill: primarySkill,
    difficulty
  });

  const target = createMeleeTargetRow({
    targetName,
    nativeTargetImage
  });

  const hero = createMeleeHero(primarySkill);

  const controls = document.createElement("div");
  controls.className = "evil-coc7-melee-controls";

  const autoSuccessBlock = [...content.querySelectorAll(
    ":scope > .keeper-only-block.coc7-card-buttons"
  )].find((block) =>
    block.querySelector(
      '[data-action="toggleValue"][data-set="isAutoSuccess"]'
    )
  );

  if (autoSuccessBlock) {
    autoSuccessBlock.classList.add("evil-coc7-melee-auto-success");
    controls.append(autoSuccessBlock);
  }

  const nativeContentSections = [
    ...content.querySelectorAll(":scope > .coc7-chat-content")
  ];

  for (const section of nativeContentSections) {
    if (section.querySelector('input[type="range"][name="poolModifier"]')) {
      section.classList.add("evil-coc7-melee-pool-section");
    } else {
      section.classList.add("evil-coc7-melee-modifier-section");
    }
    controls.append(section);
  }

  const actionArea = attackButtons[0]?.closest(
    ":scope > .owner-and-keeper-block.coc7-card-buttons"
  ) ?? attackButtons[0]?.parentElement;

  if (actionArea) {
    actionArea.classList.add("evil-coc7-melee-action-area");

    attackButtons.forEach((button, index) => {
      decorateMeleeAttackButton(button, skills[index]);
    });

    controls.append(actionArea);
  }

  const description = content.querySelector(":scope > .coc7-chat-description");
  if (description) {
    description.classList.add("evil-coc7-melee-description");
  }

  layout.append(header, target, hero);

  if (description) {
    layout.append(description);
  }

  layout.append(controls);

  nativeHeader.classList.add("evil-coc7-native-hidden");

  const nativeTargetRow = content.querySelector(":scope > .coc7-target-name");
  if (nativeTargetRow) {
    nativeTargetRow.classList.add("evil-coc7-native-hidden");
  }

  content.prepend(layout);

  const flavorBlocks = html.querySelectorAll(".flavor-text");
  for (const flavor of flavorBlocks) {
    flavor.classList.add("evil-coc7-original-flavor");
  }
}

function createMeleeInitiatorHeader({
  actorName,
  actorImageSource,
  nativeActorImage,
  weaponName,
  nativeWeaponImage,
  skill,
  difficulty
}) {
  const header = document.createElement("div");
  header.className = "evil-coc7-melee-header";

  const portraitWrap = document.createElement("div");
  portraitWrap.className = "evil-coc7-card-portrait-wrap evil-coc7-melee-actor-portrait";

  const portrait = nativeActorImage ?? document.createElement("img");
  portrait.classList.add("evil-coc7-card-portrait");
  if (!nativeActorImage) {
    portrait.src = actorImageSource;
    portrait.alt = actorName;
  }
  portraitWrap.append(portrait);

  const identity = document.createElement("div");
  identity.className = "evil-coc7-melee-identity";

  const actor = document.createElement("div");
  actor.className = "evil-coc7-card-actor";
  actor.textContent = actorName;

  const weaponLine = document.createElement("div");
  weaponLine.className = "evil-coc7-melee-weapon-line";

  const weapon = document.createElement("span");
  weapon.className = "evil-coc7-melee-weapon-name";
  weapon.textContent = weaponName;
  weaponLine.append(weapon);

  if (skill?.value) {
    const separator = document.createElement("span");
    separator.className = "evil-coc7-card-separator";
    separator.textContent = "·";

    const threshold = document.createElement("span");
    threshold.className = "evil-coc7-card-threshold";
    threshold.textContent = `${skill.value} %`;

    weaponLine.append(separator, threshold);
  }

  const difficultyLine = document.createElement("div");
  difficultyLine.className = "evil-coc7-card-difficulty";

  const difficultyIcon = document.createElement("i");
  difficultyIcon.className = "fa-solid fa-crosshairs";
  difficultyIcon.setAttribute("aria-hidden", "true");

  const difficultyText = document.createElement("span");
  difficultyText.textContent = formatDifficultyLine(difficulty);

  difficultyLine.append(difficultyIcon, difficultyText);
  identity.append(actor, weaponLine, difficultyLine);

  const weaponIcon = document.createElement("div");
  weaponIcon.className = "evil-coc7-melee-weapon-icon";

  if (nativeWeaponImage) {
    nativeWeaponImage.classList.add("evil-coc7-melee-weapon-image");
    weaponIcon.append(nativeWeaponImage);
  } else {
    const icon = document.createElement("i");
    icon.className = "game-icon game-icon-knife-thrust";
    icon.setAttribute("aria-hidden", "true");
    weaponIcon.append(icon);
  }

  header.append(portraitWrap, identity, weaponIcon);
  return header;
}

function createMeleeTargetRow({ targetName, nativeTargetImage }) {
  const row = document.createElement("div");
  row.className = "evil-coc7-melee-target-row";

  const text = document.createElement("div");
  text.className = "evil-coc7-melee-target-text";

  const label = document.createElement("span");
  label.className = "evil-coc7-melee-target-label";
  label.textContent = localizeModule("Context.TargetLabel");

  const name = document.createElement("span");
  name.className = "evil-coc7-melee-target-name";
  name.textContent = targetName;

  text.append(label, name);
  row.append(text);

  if (nativeTargetImage) {
    const portraitWrap = document.createElement("div");
    portraitWrap.className = "evil-coc7-melee-target-portrait-wrap";

    nativeTargetImage.classList.add("evil-coc7-melee-target-portrait");
    portraitWrap.append(nativeTargetImage);
    row.append(portraitWrap);
  }

  return row;
}

function createMeleeHero(skill) {
  const hero = document.createElement("div");
  hero.className = "evil-coc7-melee-hero";

  const value = document.createElement("div");
  value.className = "evil-coc7-melee-hero-value";

  const number = document.createElement("span");
  number.className = "evil-coc7-melee-hero-number";
  number.textContent = skill?.value || "—";

  const percent = document.createElement("span");
  percent.className = "evil-coc7-melee-hero-percent";
  percent.textContent = skill?.value ? "%" : "";

  value.append(number, percent);

  const state = document.createElement("div");
  state.className = "evil-coc7-melee-state";

  const icon = document.createElement("div");
  icon.className = "evil-coc7-melee-state-icon";

  const crossedSwords = document.createElement("i");
  crossedSwords.className = "game-icon game-icon-crossed-swords";
  crossedSwords.setAttribute("aria-hidden", "true");
  icon.append(crossedSwords);

  const label = document.createElement("div");
  label.className = "evil-coc7-melee-state-label";
  label.textContent = localizeModule("State.Attack");

  const ornament = document.createElement("div");
  ornament.className = "evil-coc7-verdict-ornament";
  ornament.setAttribute("aria-hidden", "true");

  state.append(icon, label, ornament);
  hero.append(value, state);
  return hero;
}

function decorateMeleeAttackButton(button, skill) {
  button.classList.add("evil-coc7-melee-attack-button");

  const title = document.createElement("span");
  title.className = "evil-coc7-melee-attack-title";
  title.textContent = localizeModule("Action.RollAttack");

  const detail = document.createElement("span");
  detail.className = "evil-coc7-melee-attack-detail";

  const skillName = skill?.name || "";
  const skillValue = skill?.value ? `${skill.value} %` : "";
  detail.textContent = [skillName, skillValue].filter(Boolean).join(" · ");

  // CoC7 8.15 lit event.target.dataset.skill dans attackerRoll.
  // On duplique donc le data-skill sur les sous-éléments pour ne jamais
  // casser le comportement natif, même si le clic cible un span.
  if (button.dataset.skill) {
    title.dataset.skill = button.dataset.skill;
    detail.dataset.skill = button.dataset.skill;
  }

  button.replaceChildren(title, detail);
}

function getMeleeSkillSummary(button, actor) {
  const text = String(button.textContent ?? "").replace(/\s+/g, " ").trim();

  const match = text.match(/^(.*?):\s*\(\s*(\d+(?:[.,]\d+)?)\s*%\s*\)\s*$/u);
  if (match) {
    return {
      name: match[1].trim(),
      value: match[2].replace(",", ".")
    };
  }

  const skillId = button.dataset.skill;
  const skill = skillId && actor?.items?.get ? actor.items.get(skillId) : null;

  return {
    name: skill?.name ?? text.replace(/\(\s*\d+(?:[.,]\d+)?\s*%\s*\)/u, "").replace(/:\s*$/u, "").trim(),
    value: skill?.system?.value != null ? String(skill.system.value) : extractPercentValue(text)
  };
}

function extractPercentValue(text) {
  const match = String(text ?? "").match(/(\d+(?:[.,]\d+)?)\s*%/u);
  return match ? match[1].replace(",", ".") : "";
}

function resolveUuidDocument(uuid) {
  if (!uuid || typeof fromUuidSync !== "function") return null;

  try {
    return fromUuidSync(uuid);
  } catch (_error) {
    return null;
  }
}

function getDocumentName(document) {
  return document?.name ?? document?.actor?.name ?? "";
}

function getDocumentImage(document) {
  return (
    document?.texture?.src ||
    document?.actor?.img ||
    document?.img ||
    "icons/svg/mystery-man.svg"
  );
}

function getVerdictLabel(state) {
  const moduleKey = MODULE_STATE_LABEL_KEYS[state];
  return moduleKey ? localizeModule(moduleKey) : "";
}

function formatDifficultyLine(difficulty) {
  if (!difficulty) return game.i18n.localize("CoC7.RollDifficulty");

  return localizeModule("RollDifficultyLine", { difficulty });
}

function normalizeDifficultyDisplayLabel(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function harmonizeRollHeaderTags(header) {
  if (!header) return;

  const tags = [...header.querySelectorAll(":scope .coc7-tags > .tag")];
  if (!tags.length) return;

  const skillTag = tags[0];
  if (skillTag) {
    skillTag.classList.add("evil-coc7-skill-name");
  }

  const difficultyTag = tags[1];
  if (difficultyTag) {
    difficultyTag.classList.add("evil-coc7-difficulty-tag");
    difficultyTag.textContent = normalizeDifficultyDisplayLabel(
      difficultyTag.textContent
    );
  }
}

function detectState(total) {
  if (total.classList.contains("critical")) return "critical";
  if (total.classList.contains("fumble")) return "fumble";
  if (total.classList.contains("success-extreme")) return "extreme";
  if (total.classList.contains("success-hard")) return "hard";
  if (total.classList.contains("success-regular")) return "regular";
  if (total.classList.contains("failure")) return "failure";
  return "unknown";
}

function extractDisplayedResult(text) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  const match = clean.match(/(^|\s)(100|[1-9]?\d)(?=\s|$|[-(])/);

  if (!match) {
    return {
      text: clean || "?",
      numeric: false
    };
  }

  const value = Number(match[2]);
  return {
    text: value === 100 ? "100" : String(value).padStart(2, "0"),
    numeric: true
  };
}

function getCheckSummary(message, actor) {
  const load = message.flags?.CoC7?.load ?? {};
  const pool = load.dicePool ?? {};

  return {
    name: resolveCheckName(load, actor, message.flavor),
    threshold: formatThreshold(pool),
    difficulty: localizeDifficulty(pool.difficulty)
  };
}

function resolveCheckName(load, actor, flavor) {
  const type = load.type;
  const key = String(load.key ?? "");

  if ((type === "skill" || type === "item") && actor?.items) {
    const item = actor.items.find((candidate) => (
      candidate.uuid === key ||
      candidate.id === key ||
      key.endsWith(`.Item.${candidate.id}`)
    ));

    if (item?.name) return item.name;
  }

  if (type === "characteristic" && key) {
    const localizationKey = `CHARAC.${key.toUpperCase()}`;
    const localized = game.i18n.localize(localizationKey);
    if (localized !== localizationKey) return localized;
  }

  if (type === "attribute" && key) {
    const localizationKey = ATTRIBUTE_LABELS[key.toLowerCase()];
    if (localizationKey) {
      const localized = game.i18n.localize(localizationKey);
      if (localized !== localizationKey) return localized;
    }
  }

  return cleanFlavorLabel(flavor) || game.i18n.localize("CoC7.Roll");
}

function cleanFlavorLabel(flavor) {
  if (!flavor) return "";

  const holder = document.createElement("div");
  holder.innerHTML = String(flavor);
  let text = holder.textContent?.replace(/\s+/g, " ").trim() ?? "";

  text = text.replace(/\s+-\s+[^-]+$/u, "").trim();
  text = text.replace(/\s*\([^)]*%\)\s*$/u, "").trim();

  const prefixes = [
    /^jet\s+de\s+/iu,
    /^roll\s+of\s+/iu
  ];

  for (const prefix of prefixes) {
    text = text.replace(prefix, "");
  }

  return text.trim();
}

function formatThreshold(pool) {
  const rawThreshold = Number(pool.threshold);
  if (!Number.isFinite(rawThreshold)) return "";

  const modifier = Number(pool.flatThresholdModifier ?? 0);
  if (!Number.isFinite(modifier) || modifier === 0) {
    return String(rawThreshold);
  }

  return `${rawThreshold}${modifier > 0 ? "+" : ""}${modifier}`;
}

function localizeDifficulty(value) {
  const difficulty = Number(value);

  const key = {
    [-1]: "CoC7.UnknownDifficulty",
    0: "CoC7.RegularDifficulty",
    1: "CoC7.RegularDifficulty",
    2: "CoC7.HardDifficulty",
    3: "CoC7.ExtremeDifficulty",
    4: "CoC7.CriticalDifficulty",
    9: "CoC7.RollDifficultyImpossible"
  }[difficulty];

  return key ? game.i18n.localize(key) : "";
}

function getActorName(message, actor) {
  return message.speaker?.alias || actor?.name || "";
}

function getActorPortrait(actor) {
  if (!actor) return "icons/svg/mystery-man.svg";

  if (actor.isToken && actor.token?.texture?.src) {
    return actor.token.texture.src;
  }

  return actor.img || "icons/svg/mystery-man.svg";
}
