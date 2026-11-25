/*
  LAGOS LIVES — Dami's staging. Same format as femi.stage.js.
  "femi"/"variant" keys refer to the PLAYER (here: Dami). hideFemi hides the player.
*/
(function () {
  window.LAGOS_STAGE = window.LAGOS_STAGE || {};
  window.LAGOS_STAGE.dami = {
    // Dami's default look: home hoodie early on; wrecked once dependence is high late in the story.
    look: (run) => (["c4", "c5"].includes(run.ch) && run.stats.wahala >= 7 ? "wrecked" : "home"),
    endings: {
      clean: { bg: "boardroom", variant: "suit", mood: "happy" },
      starting: { bg: "yaba", variant: "rehab", mood: "neutral" },
      cage: { bg: "mansion", variant: "party", mood: "sad" },
      cell: { bg: "prison", variant: "cell", mood: "sad" },
      bridge: { bg: "bridge", hero: "nkechi", mood: "sad" },
      overdose: { bg: "bedroom", hero: "nkechi", mood: "sad" },
    },
    scenes: {
      d_house: { bg: "mansion", calls: ["mummy"], moods: { mummy: "happy", nkechi: "happy" }, femi: "neutral", at: { 3: { femi: "sad" }, 6: { femi: "sad" }, 10: { femi: "worried" }, 11: { bg: "kitchen", femi: "neutral" } } },
      d_kitchen: { bg: "kitchen", cast: ["nkechi"], moods: { nkechi: "happy" }, femi: "neutral", at: { 3: { femi: "happy", moods: { nkechi: "sad" } } } },
      d_alone: { bg: "bedroom", femi: "sad" },

      c1_campus: { bg: "faculty", variant: "party", femi: "smug", moods: { kunle: "happy", halita: "happy", femi: "worried" }, at: { 5: { leave: ["kunle", "halita"], join: ["femi"], femi: "neutral" } } },
      c1_femi: { bg: "faculty", variant: "party", cast: ["femi"], moods: { femi: "worried" }, femi: "smug", at: { 3: { femi: "neutral" } } },
      c1_own: { bg: "bedroom", femi: "worried", at: { 1: { femi: "happy" } } },
      c1_party: { bg: "party", variant: "party", femi: "neutral", moods: { kunle: "happy", skido: "smug" }, at: { 1: { join: ["skido"] }, 4: { femi: "worried" } } },
      c1_high: { bg: "party", variant: "party", femi: "happy", at: { 2: { bg: "bedroom", variant: "wrecked", femi: "sad" } } },
      c1_sober: { bg: "party", variant: "party", femi: "neutral", moods: { kunle: "smug" }, at: { 1: { femi: "happy" }, 2: { bg: "bedroom", variant: "home", leave: ["kunle"], femi: "sad" } } },
      c1_halita: { bg: "bedroom", femi: "neutral", at: { 2: { femi: "sad" } } },

      c2_gbenga: { bg: "mansion", femi: "neutral", moods: { senator: "neutral", gbenga: "happy", nkechi: "worried" }, at: { 3: { leave: ["senator"] }, 4: { moods: { gbenga: "smug" }, femi: "worried" }, 5: { leave: ["gbenga"] } } },
      c2_night: { bg: "bedroom", femi: "neutral", moods: { gbenga: "smug" }, at: { 1: { join: ["gbenga"] }, 3: { femi: "worried" }, 4: { bg: "black", leave: ["gbenga"], hideFemi: true }, 5: { bg: "bedroom", variant: "wrecked", femi: "sad" }, 6: { bg: "mansion" }, 8: { femi: "angry" } } },
      c2_told: { bg: "kitchen", variant: "wrecked", femi: "sad", moods: { nkechi: "shocked" }, at: { 0: { join: ["nkechi"] }, 2: { moods: { nkechi: "sad" } }, 3: { moods: { nkechi: "angry" } }, 4: { femi: "worried" } } },
      c2_mummy: { bg: "bedroom", variant: "wrecked", calls: ["mummy"], moods: { mummy: "worried" }, femi: "sad", at: { 3: { femi: "angry" } } },
      c2_escape: { bg: "club", variant: "party", femi: "neutral", at: { 1: { femi: "happy" }, 2: { femi: "sad" } } },
      c2_blackmail: { bg: "bedroom", variant: "wrecked", femi: "shocked", at: { 3: { femi: "angry" }, 4: { femi: "worried" } } },
      c2_paid: { bg: "mansion", femi: "sad", moods: { gbenga: "smug" }, at: { 1: { join: ["gbenga"] } } },
      c2_refused: { bg: "bedroom", variant: "wrecked", femi: "worried", moods: { nkechi: "angry" } },

      c3_fail: { bg: "bedroom", calls: ["pa"], femi: "shocked", moods: { pa: "neutral" }, at: { 3: { femi: "worried" } } },
      c3_bought: { bg: "nwosu", variant: "party", femi: "neutral", moods: { lecturer: "smug" }, at: { 0: { join: ["lecturer"] }, 2: { leave: ["lecturer"], bg: "bedroom" }, 3: { femi: "sad" } } },
      c3_caught: { bg: "faculty", variant: "party", calls: ["pa"], femi: "neutral", moods: { femi: "sad", pa: "neutral" }, at: { 1: { femi: "shocked" }, 2: { bg: "nwosu", join: ["femi"], femi: "worried" }, 5: { femi: "sad" } } },
      c3_owned: { bg: "nwosu", cast: ["femi"], calls: ["pa"], femi: "worried", moods: { femi: "shocked", pa: "angry" }, at: { 1: { moods: { femi: "neutral" } }, 3: { femi: "happy" } } },
      c3_silent: { bg: "faculty", variant: "party", cast: ["femi"], moods: { femi: "sad" }, femi: "sad" },
      c3_study: { bg: "kitchen", femi: "worried", moods: { nkechi: "happy" }, at: { 0: { join: ["nkechi"] }, 2: { femi: "happy" } } },

      c4_skido: { bg: "club", variant: "party", femi: "neutral", moods: { skido: "angry", kunle: "smug" }, at: { 3: { femi: "shocked" } } },
      c4_party: { bg: "club", variant: "party", calls: ["nkechi"], femi: "happy", moods: { nkechi: "worried", kunle: "happy" } },
      c4_musa: { bg: "bridge", femi: "neutral", moods: { musa: "neutral", nkechi: "sad" }, at: { 0: { join: ["musa"] }, 1: { bg: "kitchen", leave: ["musa"] }, 3: { femi: "shocked" }, 4: { femi: "sad" } } },
      c4_checkpoint: { bg: "bridge", variant: "party", femi: "happy", moods: { officer: "angry" }, at: { 1: { bg: "checkpoint", femi: "worried" } } },
      c4_bribe: { bg: "checkpoint", variant: "party", cast: ["officer"], moods: { officer: "neutral" }, femi: "smug" },
      c4_bribe_ok: { bg: "checkpoint", variant: "party", cast: ["officer"], moods: { officer: "happy" }, femi: "smug", at: { 2: { bg: "bedroom", leave: ["officer"], femi: "worried" } } },
      c4_bribe_fail: { bg: "checkpoint", variant: "party", cast: ["officer"], moods: { officer: "angry" }, femi: "shocked", at: { 2: { fx: "siren" } } },
      c4_arrogant: { bg: "checkpoint", variant: "party", cast: ["officer"], calls: ["pa"], moods: { officer: "smug", pa: "sad" }, femi: "angry", at: { 2: { femi: "worried" }, 3: { femi: "shocked" } } },

      c5_collide: { bg: "bedroom", femi: "worried", moods: { senator: "angry", gbenga: "smug" }, at: { 2: { bg: "study" }, 3: { femi: "shocked" }, 4: { femi: "sad" }, 5: { leave: ["senator"], bg: "bedroom" }, 8: { bg: "mansion", join: ["gbenga"] }, 9: { leave: ["gbenga"], bg: "bedroom", femi: "sad" } } },
      c5_truth: { bg: "study", cast: ["senator"], castIf: { nkechi: "told_nkechi" }, moods: { senator: "neutral", nkechi: "sad" }, femi: "worried", at: { 2: { femi: "sad" }, 3: { moods: { senator: "sad" } } } },
      c5_father: { bg: "study", cast: ["senator"], castIf: { nkechi: "told_nkechi" }, moods: { senator: "sad", nkechi: "happy" }, femi: "sad", at: { 1: { femi: "shocked" }, 2: { moods: { senator: "neutral" }, femi: "happy" }, 3: { fx: "siren" } } },
      c5_campaign: { bg: "study", cast: ["senator"], moods: { senator: "angry", nkechi: "sad" }, femi: "shocked", at: { 1: { femi: "sad" }, 2: { bg: "mansion", leave: ["senator"], join: ["nkechi"] } } },
      c5_bag: { bg: "bedroom", variant: "wrecked", femi: "sad", at: { 1: { fx: "shake", femi: "worried" } } },
      c5_wake: { bg: "hospital", variant: "hospital", femi: "sad", moods: { nkechi: "sad" }, at: { 0: { join: ["nkechi"] }, 2: { femi: "shocked" }, 4: { femi: "neutral" } } },

      e_clean: { bg: "rehab", variant: "rehab", femi: "neutral", moods: { femi: "happy", senator: "happy" }, at: { 1: { femi: "sad" }, 2: { femi: "neutral" }, 3: { bg: "boardroom", variant: "suit", femi: "happy" }, 4: { join: ["femi"] }, 7: { join: ["senator"] } } },
      e_starting: { bg: "rehab", variant: "rehab", femi: "neutral", at: { 1: { bg: "yaba" }, 3: { femi: "sad" }, 4: { femi: "happy" } } },
      e_cage: { bg: "mansion", variant: "party", femi: "smug", moods: { gbenga: "smug" }, at: { 2: { join: ["gbenga"] }, 3: { leave: ["gbenga"], bg: "club" }, 4: { bg: "bedroom", femi: "sad" } } },
      e_cell: { bg: "prison", variant: "cell", femi: "sad", moods: { nkechi: "sad" }, at: { 4: { join: ["nkechi"] } } },
      e_bridge: { bg: "checkpoint", variant: "party", femi: "shocked", moods: { nkechi: "worried" }, at: { 1: { bg: "bridge", fx: "shake" }, 2: { bg: "black", hideFemi: true }, 3: { bg: "bridge" }, 4: { bg: "kitchen", join: ["nkechi"] } } },
      e_overdose: { bg: "bedroom", variant: "wrecked", femi: "sad", moods: { nkechi: "shocked" }, at: { 1: { bg: "black", hideFemi: true }, 2: { bg: "bedroom" }, 3: { join: ["nkechi"] }, 4: { moods: { nkechi: "sad" } } } },
    },
  };
})();
