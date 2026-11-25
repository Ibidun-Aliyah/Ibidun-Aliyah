/*
  LAGOS LIVES — Femi's staging (the "director's notes").
  The story text lives in ../../stories/femi.js. This file only says, for each scene:
    bg      which place to show
    cast    who is on screen from the start (speakers also walk in when they first talk)
    castIf  extra cast that only appear if a test passes, e.g. { dele: "not:cut_dele" }
    calls   people talking on the phone (shown with an "on call" badge)
    moods   each character's expression in this scene
    femi    Femi's expression (otherwise it follows his Peace of Mind)
    variant Femi's look (otherwise it follows his choices)
    at      changes that happen when a given line (by its number in the scene, from 0) appears:
            { bg, join: [...], leave: [...], moods: {...}, femi, variant, hideFemi, fx: "siren" | "shake" | "flash" }
*/
(function () {
  window.LAGOS_STAGE = window.LAGOS_STAGE || {};
  window.LAGOS_STAGE.femi = {
    scenes: {
      p_market: { bg: "market", cast: ["mama", "kemi"], moods: { mama: "happy", kemi: "happy" }, femi: "happy", at: { 5: { moods: { kemi: "sad", mama: "smug" } } } },
      p_park: { bg: "garage", cast: ["mama"], femi: "neutral", at: { 1: { join: ["conductor"], moods: { conductor: "happy" } }, 2: { leave: ["conductor"] }, 4: { femi: "worried" }, 5: { moods: { mama: "worried" } } } },
      p_truth: { bg: "garage", cast: ["mama"], moods: { mama: "sad" }, femi: "sad", at: { 1: { moods: { mama: "neutral" } } } },
      p_fine: { bg: "garage", cast: ["mama"], moods: { mama: "happy" }, femi: "happy", at: { 1: { femi: "worried" } } },
      p_send: { bg: "garage", cast: ["mama"], moods: { mama: "worried" }, femi: "neutral", at: { 1: { leave: ["mama"], femi: "sad" } } },

      c1_hostel: { bg: "hostel", cast: ["kaycee"], moods: { kaycee: "happy", dele: "neutral" }, femi: "neutral", at: { 4: { femi: "worried" }, 7: { femi: "sad" }, 8: { leave: ["kaycee"] } } },
      c1_lola: { bg: "lecture", moods: { lola: "neutral" }, femi: "neutral", at: { 1: { join: ["lola"] }, 3: { femi: "worried" } } },
      c1_lola_a: { bg: "lecture", cast: ["lola"], moods: { lola: "happy" }, femi: "happy", at: { 1: { moods: { lola: "smug" } }, 2: { femi: "sad" } } },
      c1_lola_b: { bg: "lecture", cast: ["lola"], moods: { lola: "neutral" }, femi: "worried", at: { 1: { moods: { lola: "smug" } }, 2: { femi: "sad" } } },
      c1_offers: { bg: "faculty", moods: { dami: "smug", kaycee: "smug", dele: "neutral" }, femi: "neutral", at: { 1: { join: ["dami"] }, 4: { leave: ["dami", "kaycee"] }, 6: { femi: "worried" } } },
      c1_r_dami: { bg: "hostelnight", femi: "tired", at: { 2: { moods: { dami: "happy" } }, 3: { femi: "smug" } } },
      c1_r_bet: { bg: "hostelnight", cast: ["kaycee"], moods: { kaycee: "worried" }, femi: "shocked", at: { 2: { femi: "angry" } } },
      c1_r_okon: { bg: "cafe", cast: ["okon"], moods: { okon: "happy" }, femi: "happy" },
      c1_r_mama: { bg: "hostel", calls: ["mama"], moods: { mama: "worried" }, femi: "worried", at: { 3: { femi: "sad" } } },
      c1_end: { bg: "rooftop", cast: ["dele"], moods: { dele: "neutral" }, femi: "sad" },

      c2_benz: { bg: "faculty", cast: ["chairman"], moods: { chairman: "smug" }, femi: "shocked", at: { 2: { femi: "neutral" }, 4: { femi: "happy" }, 5: { femi: "worried" } } },
      c2_ponzi: { bg: "hostelnight", femi: "neutral" },
      c2_dele: { bg: "buka", cast: ["dele", "kaycee"], moods: { dele: "angry", kaycee: "smug" }, femi: "angry", at: { 5: { femi: "worried" } } },
      c2_office: { bg: "office", cast: ["chairman"], moods: { chairman: "smug" }, femi: "shocked", at: { 2: { femi: "worried" } } },
      c2_yahoo: { bg: "hostelnight", femi: "shocked", at: { 1: { femi: "happy" }, 2: { femi: "worried" } } },
      c2_night: { bg: "hostelnight", femi: "worried" },

      c3_office: { bg: "nwosu", cast: ["nwosu"], moods: { nwosu: "angry" }, femi: "worried", at: { 5: { moods: { nwosu: "neutral" } }, 6: { moods: { nwosu: "sad" } } } },
      c3_expo: { bg: "hostelnight", castIf: { dele: "not:cut_dele" }, moods: { dele: "neutral" }, femi: "tired" },
      c3_expo_fake: { bg: "exam", femi: "shocked", moods: { kaycee: "worried" }, at: { 2: { bg: "faculty" }, 3: { leave: ["kaycee"], femi: "sad" } } },
      c3_caught: { bg: "exam", femi: "worried", moods: { nwosu: "angry" }, at: { 1: { femi: "shocked" }, 2: { fx: "shake" } } },
      c3_study: { bg: "hostelnight", castIf: { dele: "not:cut_dele" }, moods: { dele: "happy" }, femi: "tired", at: { 2: { bg: "exam", leave: ["dele"], femi: "worried" }, 3: { femi: "happy" }, 4: { fx: "flash" } } },

      c4_soft: { bg: "hostelnight", calls: ["mama"], femi: "happy", moods: { lola: "happy", pc: "worried", mama: "worried" }, at: { 2: { bg: "faculty", femi: "smug" }, 5: { bg: "party", join: ["pc"] }, 6: { leave: ["pc", "lola"], bg: "hostelnight", femi: "shocked" }, 7: { leave: ["pc", "lola"], bg: "hostelnight", femi: "worried" } } },
      c4_confess: { bg: "hostelnight", calls: ["mama"], moods: { mama: "sad" }, femi: "sad", at: { 3: { moods: { mama: "angry" } } } },
      c4_lie: { bg: "hostelnight", calls: ["mama"], moods: { mama: "happy" }, femi: "sad" },
      c4_baba_offer: { bg: "office", cast: ["chairman"], moods: { chairman: "smug", kaycee: "happy" }, femi: "worried", at: { 4: { femi: "sad" } } },
      c4_quit: { bg: "office", cast: ["chairman"], moods: { chairman: "smug" }, femi: "angry", at: { 1: { moods: { chairman: "angry" } }, 2: { bg: "rooftop", leave: ["chairman"], femi: "sad" } } },
      c4_grind: { bg: "market", femi: "neutral", castIf: { dele: "not:cut_dele" }, moods: { dele: "happy", dami: "smug", lola: "happy" }, at: { 2: { bg: "workshop", femi: "happy" }, 5: { femi: "tired" }, 7: { leave: ["dami"] } } },
      c4_mid: { bg: "faculty", femi: "sad", moods: { chairman: "smug" }, at: { 2: { join: ["chairman"] }, 3: { femi: "tired" } } },

      c5_party: { bg: "hostelnight", femi: "neutral", moods: { kaycee: "happy" } },
      c5_at_party: { bg: "party", cast: ["lola"], moods: { lola: "happy" }, femi: "happy", at: { 1: { femi: "worried" } } },
      c5_escape: { bg: "street", femi: "shocked", at: { 1: { fx: "siren", femi: "worried" }, 3: { femi: "sad" } } },
      c5_raid: { bg: "party", femi: "shocked", at: { 0: { fx: "flash" }, 1: { fx: "siren" }, 2: { femi: "sad" } } },
      c5_stayed: { bg: "hostelnight", femi: "neutral", at: { 1: { femi: "shocked", fx: "siren" } } },
      c5_baba: { bg: "bush", cast: ["chairman", "kaycee"], moods: { chairman: "neutral", kaycee: "worried", baba: "neutral" }, femi: "worried", at: { 4: { bg: "shrine", leave: ["kaycee"], join: ["baba"] }, 6: { moods: { chairman: "smug" } }, 7: { join: ["kaycee"], moods: { kaycee: "sad" }, femi: "shocked" }, 8: { fx: "shake" } } },

      e_founder: { bg: "stage", variant: "suit", femi: "happy", moods: { nwosu: "happy", mama: "happy", dele: "happy" }, at: { 1: { join: ["nwosu"], fx: "flash" }, 3: { bg: "market", leave: ["nwosu"] }, 4: { join: ["mama"] }, 5: { join: ["dele"] } } },
      e_standing: { bg: "factory", femi: "neutral", moods: { mama: "happy" }, at: { 2: { bg: "market", join: ["mama"] }, 3: { femi: "sad" } } },
      e_expelled: { bg: "nwosu", femi: "worried", moods: { mama: "sad", nwosu: "angry" }, at: { 0: { join: ["nwosu"] }, 1: { femi: "sad" }, 2: { bg: "garage", leave: ["nwosu"] }, 3: { bg: "market" }, 4: { moods: { mama: "shocked" } } } },
      e_trial: { bg: "prison", variant: "prison", femi: "sad" },
      e_trial_late: { bg: "hostel", femi: "shocked", at: { 1: { fx: "siren" }, 2: { bg: "prison", variant: "prison", femi: "sad" } } },
      e_burnout: { bg: "exam", variant: "tired", femi: "worried", at: { 0: { fx: "shake" }, 1: { bg: "hospital", variant: "hospital", femi: "sad" }, 4: { join: ["mama"], moods: { mama: "sad" } } } },
      e_missing: { bg: "shrine", femi: "shocked", at: { 1: { bg: "black", hideFemi: true }, 2: { bg: "cafe", join: ["dele"], moods: { dele: "sad" } }, 3: { join: ["chairman"], moods: { chairman: "smug" } }, 4: { leave: ["chairman"] }, 5: { bg: "market", leave: ["dele"], join: ["mama"], moods: { mama: "sad" } } } },
    },
  };
})();
