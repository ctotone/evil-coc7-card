const MODULE_ID = "evil-coc7-card";
const HIDE_CONCEALED_MELEE_DICE = "hideConcealedMeleeDice";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, HIDE_CONCEALED_MELEE_DICE, {
    name: "EVILCOC7CARD.Settings.HideConcealedMeleeDice",
    hint: "EVILCOC7CARD.Settings.HideConcealedMeleeDiceHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

// Skip the local 3D render without cancelling Dice So Nice's chat lifecycle.
Hooks.on("diceSoNiceRollStart", (messageId, context) => {
  if (!messageId || context.blind || game.system.id !== "CoC7" || game.user.isGM) return;

  const message = game.messages.get(messageId);
  if (message?.isContentVisible !== true) return;

  const load = message.flags?.CoC7?.load;
  if (load?.as !== "CoC7ChatCombatMelee" || load.checkRevealed !== false
    || (load.participant !== 0 && load.participant !== "0")) return;
  if (!game.settings.get(MODULE_ID, HIDE_CONCEALED_MELEE_DICE)) return;

  // CoC7 shows the keeper-only block to trusted users when this setting is enabled.
  if (game.user.isTrusted && game.settings.settings.has("CoC7.trustedCanSeeChatCard")
    && game.settings.get("CoC7", "trustedCanSeeChatCard")) return;

  context.blind = true;
});
