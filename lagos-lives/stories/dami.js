/*
  LAGOS LIVES — Dami's story: "Last Born"
  Same shape as femi.js. The player character is "dami".

  Content note: Chapter 2 deals with sexual assault. It is never shown — the scene
  cuts away — and the story stays with the aftermath: shame, silence, blackmail.
*/
(function () {
  const N = (en) => ({ k: "n", en });
  const T = (en, pg) => ({ k: "t", en, pg });
  const S = (who, en, pg) => ({ k: "s", who, en, pg });
  const C = (who, en, pg) => ({ k: "c", who, en, pg });
  const A = (en) => ({ k: "a", en });
  const when = (test, ...lines) => lines.map((l) => Object.assign({}, l, { if: test }));
  const has = (f) => (s) => !!s.flags[f];
  const not = (f) => (s) => !s.flags[f];

  window.LAGOS_STORIES = window.LAGOS_STORIES || {};
  window.LAGOS_STORIES.dami = {
    id: "dami",
    player: "dami",
    hero: "Dami",
    title: "Last Born",
    tagline: "Senator’s son. Banana Island. A G-Wagon, unlimited money, and nobody home.",
    contentNote: "This story includes drug use and sexual assault (never shown on screen).",
    start: "d_house",
    stats: { money: 4750000, cgpa: 2.4, peace: 4, nkechi: 8, dad: 3, halita: 5, wahala: 0 },
    ui: [
      ["money"], ["cgpa", "CGPA"], ["peace", "Peace"], ["nkechi", "Aunty"], ["dad", "Dad"], ["halita", "Halita"],
    ],
    hiddenMeter: {
      title: "The Dependence Meter",
      desc: "Hidden the whole time. Every pill, every drink, every escape filled it a little.",
      low: "Low. You kept reaching for something other than the bag.",
      mid: "Rising. Some nights it was holding you more than you were holding it.",
      high: "Red. It was running your life.",
      max: 16,
    },

    cast: {
      dami: { name: "Dami", color: "#7fc8ff" },
      nkechi: { name: "Aunty Nkechi", color: "#ffb38a" },
      mummy: { name: "Mummy", color: "#f2c46d" },
      senator: { name: "Daddy", color: "#c9a7ff" },
      tolu: { name: "Tolu (London)", color: "#ff9ec7" },
      seun: { name: "Seun (Houston)", color: "#9fe0a8" },
      kunle: { name: "Kunle", color: "#ff8a4c" },
      halita: { name: "Halita", color: "#ff7aa8" },
      skido: { name: "Skido", color: "#d8d27a" },
      gbenga: { name: "Uncle Gbenga", color: "#e0a36b" },
      femi: { name: "Femi", color: "#f4b81c" },
      lecturer: { name: "Dr. Adekola", color: "#7fe3e0" },
      officer: { name: "Officer", color: "#b9c3c9" },
      musa: { name: "Musa (Driver)", color: "#d8d27a" },
      unknown: { name: "Unknown Number", color: "#ff5a5a" },
      pa: { name: "Daddy’s PA", color: "#b9c3c9" },
    },

    chapters: {
      pro: { num: "Prologue", title: "Last Born" },
      c1: { num: "Chapter 1", title: "Owambe Money" },
      c2: { num: "Chapter 2", title: "Uncle" },
      c3: { num: "Chapter 3", title: "Exam Season" },
      c4: { num: "Chapter 4", title: "Third Mainland" },
      c5: { num: "Chapter 5", title: "Rock Bottom" },
    },

    scenes: {
      /* ───────────── PROLOGUE ───────────── */
      d_house: {
        ch: "pro",
        lines: [
          N("Banana Island, 9:40pm. Eleven bedrooms. Seven bathrooms. One cinema. One person home."),
          N("You are Damilola Ogunleye. 19. 200 Level, FUTIK. Last born of Senator Babatunde Ogunleye."),
          N("On the 85-inch TV in the living room, your father is shaking hands with market women. “OGUNLEYE FOR GOVERNOR. A FATHER TO ALL.”"),
          T("A father to all. Just not this house."),
          N("Your phone rings. Video call. Mummy, in Dubai."),
          S("mummy", "Dami, my baby! I’m in Dubai Mall, the network is bad. Are you eating? Good. Kisses!", "Dami, my baby! I dey Dubai Mall, network bad. You dey chop? Good. Kisses!"),
          N("Forty-one seconds. Most of it was the ceiling of a Gucci store."),
          N("Then the family group chat lights up."),
          C("tolu", "Dami, Daddy called me today. He said at least he still has one child who isn’t a disgrace. Don’t spoil it o.", "Dami, Daddy call me today. Him talk say at least him still get one pikin wey no be disgrace. No spoil am o."),
          C("seun", "Lol. No pressure, baby bro. Rehab here has a pool though 🏊🏾", "Lol. No pressure, baby bro. This rehab get pool sha 🏊🏾"),
          T("Tolu is in rehab in London. Seun is in rehab in Houston. And you are the ‘normal one.’"),
          S("nkechi", "Dami, your food is ready. Jollof and the turkey you like. Will you eat here with me, or should I bring it upstairs?", "Dami, your food don ready. Jollof and that turkey wey you like. You go chop here with me, or make I carry am go upstairs?"),
          N("Aunty Nkechi has worked in this house since you were six. She knows you hate onions. Your mother doesn’t."),
        ],
        choices: [
          { en: "Eat in the kitchen with Aunty Nkechi.", pg: "Chop for kitchen with Aunty Nkechi.", fx: { nkechi: 1, peace: 1, flag: "kitchen" }, to: "d_kitchen", log: "Ate in the kitchen with Aunty Nkechi" },
          { en: "Take the plate to your room. Alone.", pg: "Carry the plate go your room. You alone.", fx: { peace: -1, wahala: 1, flag: "alone" }, to: "d_alone", log: "Ate alone in your room" },
        ],
      },
      d_kitchen: {
        ch: "pro",
        lines: [
          N("The kitchen is the only room in the house that feels like a house. Fluorescent light. A small radio playing old highlife."),
          S("nkechi", "You’re too thin. Your father’s money can’t eat for you.", "You don too lean. Your papa money no fit chop for you."),
          S("dami", "Aunty, do you ever get tired of this house?", "Aunty, this house no dey tire you?"),
          S("nkechi", "I get tired of it being empty. Eat.", "Na the emptiness dey tire me. Chop."),
        ],
        next: "c1_campus",
      },
      d_alone: {
        ch: "pro",
        lines: [
          N("Your room has a gaming setup worth more than a car. You scroll for two hours. The jollof goes cold."),
          N("Downstairs, Aunty Nkechi eats alone too."),
          T("Everyone in this family is somewhere else. Even when they’re here."),
        ],
        next: "c1_campus",
      },

      /* ───────────── CHAPTER 1: OWAMBE MONEY ───────────── */
      c1_campus: {
        ch: "c1",
        lines: [
          N("FUTIK car park. Your white G-Wagon takes up two spaces. Nobody says anything. Nobody ever does."),
          S("kunle", "THE SENATOR’S SON! Make way, make way! Dami, you dey shine like new generator!", "THE SENATOR PIKIN! Make way, make way! Dami, you dey shine like new generator!"),
          N("Kunle. Your “best friend” since 100 Level. He has never once paid for a meal."),
          S("halita", "Babe! You came. Stand there, let me take a picture with the car.", "Babe! You don come. Stand there make I snap with the motor."),
          N("Halita. Abuja girl. 3 million followers who know your car better than they know you."),
          N("Then you spot Femi Adeyemi outside the engineering block, the broke genius with the cracked Tecno. You still have two assignments and a lab report due."),
        ],
        choices: [
          { en: "Pay Femi ₦30k to do them.", pg: "Pay Femi ₦30k make e do am.", fx: { money: -30000, flag: "paid_femi" }, to: "c1_femi", log: "Paid Femi to do your assignments" },
          { en: "Try to do them yourself tonight.", pg: "Try do am yourself tonight.", fx: { cgpa: 0.1, peace: -1, flag: "own_work" }, to: "c1_own", log: "Did your own assignments" },
        ],
      },
      c1_femi: {
        ch: "c1",
        lines: [
          S("dami", "Guy, they say you’re the brain. Two assignments, one lab report. ₦30k. Cash.", "Guy, dem talk say you be the brain. Two assignment, one lab report. ₦30k. Cash."),
          N("Femi hesitates for one second. You know that second. It’s the sound of somebody needing money."),
          S("femi", "Okay. Send it.", "Okay. Send am."),
          T("Four hours of his life for what you spend on suya. Weird how that works."),
        ],
        next: "c1_party",
      },
      c1_own: {
        ch: "c1",
        lines: [
          N("2am. Your third energy drink. You understand maybe half of it."),
          N("It’s bad work. But it’s yours. You feel something strange. It might be pride."),
        ],
        next: "c1_party",
      },
      c1_party: {
        ch: "c1",
        lines: [
          N("Saturday. A rooftop in Lekki. Kunle’s cousin’s birthday that you are, somehow, paying for."),
          N("A guy in a bucket hat is leaning on the bar like he owns it. Kunle pulls you over."),
          S("kunle", "Dami, meet Skido. Skido is family.", "Dami, meet Skido. Skido na family."),
          S("skido", "Senator’s son. I’ve heard about you. First time?", "Senator pikin. I don hear about you. First time?"),
          N("He opens his palm. A small pink pill with a smiley face pressed into it."),
          S("kunle", "Relax. It’s not like weed. It just makes you happy. Everybody here is on something.", "Relax. E no be like igbo. E just dey make you happy. Everybody for here dey on something."),
          S("skido", "If you’re taking it, take half. Drink water. Don’t mix it with alcohol. I don’t want wahala.", "If you go take am, take half. Drink water. No mix am with alcohol. I no want wahala."),
        ],
        choices: [
          { en: "Take it.", pg: "Take am.", fx: { wahala: 3, peace: 1, flag: "molly" }, to: "c1_high", log: "Took your first Molly" },
          { en: "“I’m good, thanks.”", pg: "“I dey alright, thanks.”", fx: { flag: "refused_molly" }, to: "c1_sober", log: "Turned down the pill" },
        ],
      },
      c1_high: {
        ch: "c1",
        lines: [
          N("Forty minutes later, the music starts living inside your chest."),
          N("Everyone is beautiful. Everyone loves you. For four hours, nothing in your life hurts."),
          N("Monday, 6am. The crash. A grey, heavy sadness you can’t explain. You lie in bed until noon."),
          T("Just once. That’s all it was."),
          C("skido", "You good? Drink water. Next time, half o.", "You dey alright? Drink water. Next time, na half o."),
        ],
        next: "c1_halita",
      },
      c1_sober: {
        ch: "c1",
        lines: [
          S("kunle", "Ajebutter! Senator’s son is scared of small pill!", "Ajebutter! Senator pikin dey fear small pill!"),
          N("Everybody laughs. You laugh too. You go home at 1am with your ears ringing and your head clear."),
          T("It was boring. It was also fine. Why does fine feel like losing?"),
        ],
        on: { peace: -1 },
        next: "c1_halita",
      },
      c1_halita: {
        ch: "c1",
        lines: [
          N("Tuesday. A voice note from Halita."),
          C("halita", "Babe 🥺 my cousin’s school fees… and my Dubai trip is next week and my card is acting up. ₦500k. You know I love you.", "Babe 🥺 my cousin school fees… and my Dubai trip na next week and my card dey misbehave. ₦500k. You know say I love you."),
          T("She said “I love you” in the same sentence as an account number."),
        ],
        choices: [
          { en: "Send it. It’s just money.", pg: "Send am. Na just money.", fx: { money: -500000, halita: 2, flag: "paid_halita" }, to: "c2_gbenga", log: "Sent Halita ₦500k" },
          { en: "“Not this time, babe.”", pg: "“No be this time, babe.”", fx: { halita: -3, peace: 1, flag: "refused_halita" }, to: "c2_gbenga", log: "Said no to Halita" },
        ],
      },

      /* ───────────── CHAPTER 2: UNCLE ───────────── */
      c2_gbenga: {
        ch: "c2",
        lines: [
          N("Campaign season. Your father comes home for one night with a man you vaguely remember from childhood."),
          S("senator", "Dami, you remember your Uncle Gbenga? My cousin from Ijebu. I picked him up when he had nothing. He will manage the house while I’m on the road.", "Dami, you remember your Uncle Gbenga? My cousin from Ijebu. I carry am when e no get anything. Him go manage the house while I dey road."),
          S("gbenga", "Look at you! Last time I saw you, you were this small. Your father is a great man. A great man.", "Look you! Last time I see you, you be this small. Your papa na great man. Great man."),
          N("Your father leaves for Abuja at 5am. Uncle Gbenga moves into the guest wing."),
          N("He’s friendly. Too friendly. He buys you drinks. Calls you “champion.” Says “we are men, we understand each other.”"),
          S("nkechi", "Dami. That man. Lock your door at night. Don’t ask me why.", "Dami. That man. Lock your door for night. No ask me why."),
        ],
        next: "c2_night",
      },
      c2_night: {
        ch: "c2",
        lines: [
          N("Friday night. Aunty Nkechi is at her sister’s in Ajegunle for the weekend. The house is empty."),
          N("A knock on your door. Uncle Gbenga, with two glasses and a bottle."),
          S("gbenga", "Champion! Let’s celebrate your father’s poll numbers. Just one drink.", "Champion! Make we celebrate your papa poll numbers. Just one drink."),
          N("He closes the door behind him."),
          N("—"),
          N("The next morning, you stand in the shower for an hour. You can’t look at your own reflection."),
          N("At breakfast, Uncle Gbenga is reading the newspaper like nothing happened."),
          S("gbenga", "Morning, champion. You slept well?", "Morning, champion. You sleep well?"),
          T("You want to scream. Nothing comes out."),
        ],
        on: { peace: -3 },
        choices: [
          { en: "When Aunty Nkechi returns, tell her.", pg: "When Aunty Nkechi come back, tell am.", fx: { nkechi: 2, peace: 1, flag: "told_nkechi" }, to: "c2_told", log: "Told Aunty Nkechi what happened" },
          { en: "Call Mummy in Dubai.", pg: "Call Mummy for Dubai.", fx: { peace: -1, flag: "called_mummy" }, to: "c2_mummy", log: "Tried to tell Mummy" },
          { en: "Say nothing. Text Skido. Go out tonight.", pg: "No talk anything. Text Skido. Go out tonight.", fx: { wahala: 3, flag: "silent" }, to: "c2_escape", log: "Told no one and went out to forget" },
        ],
      },
      c2_told: {
        ch: "c2",
        lines: [
          N("Sunday evening. Aunty Nkechi walks in with her bag. You’re sitting on the kitchen floor. She looks at your face and drops the bag."),
          N("You tell her. Not all of it. Enough."),
          S("nkechi", "Dami. Look at me. This is not your fault. You hear me? Not. Your. Fault.", "Dami. Look me. This no be your fault. You hear? E no be. Your. Fault."),
          S("nkechi", "We have to tell your father.", "We must tell your papa."),
          T("Daddy. The campaign. The election. Gbenga is his cousin. Who would he believe?"),
        ],
        next: "c2_blackmail",
      },
      c2_mummy: {
        ch: "c2",
        lines: [
          N("It takes four calls before she picks up."),
          S("mummy", "Gbenga? Ah ah. Dami, don’t say such things about family. You must have misunderstood. Do you know what this would do to your father right now?", "Gbenga? Ah ah. Dami, no talk that kind thing about family. You don misunderstand. You know wetin this go do your papa now?"),
          S("mummy", "Let me call you back, I’m at a dinner.", "Make I call you back, I dey dinner."),
          N("She doesn’t call back."),
        ],
        next: "c2_blackmail",
      },
      c2_escape: {
        ch: "c2",
        lines: [
          C("skido", "Tonight? Island club. I have something.", "Tonight? Island club. I get something."),
          N("You take a whole one this time. Then a drink. Then whatever Kunle hands you."),
          N("For six hours you don’t exist. That’s the point."),
        ],
        next: "c2_blackmail",
      },
      c2_blackmail: {
        ch: "c2",
        lines: [
          N("Wednesday, 11:58pm. A message from an unknown number. A blurred picture. Your room. You."),
          C("unknown", "If you talk, everybody sees this. The blogs. Your school. Your father’s campaign is finished the day it drops.", "If you talk, everybody go see this. The blogs. Your school. Your papa campaign go finish the day wey e drop."),
          C("unknown", "₦2 million by Friday. Be a good son.", "₦2 million before Friday. Be good pikin."),
          T("You know exactly who it is. He doesn’t even try to hide it."),
          T("Daddy is ten points ahead. One scandal and it’s over. Everything he’s worked for."),
        ],
        choices: [
          { en: "Pay. Protect Daddy’s campaign.", pg: "Pay. Protect Daddy campaign.", fx: { money: -2000000, wahala: 1, peace: -1, flag: "paid_gbenga" }, to: "c2_paid", log: "Paid Gbenga’s blackmail to protect Dad’s campaign" },
          { en: "Don’t pay. Block the number.", pg: "No pay. Block the number.", fx: { peace: -2, flag: "refused_gbenga" }, to: "c2_refused", log: "Refused to pay the blackmail" },
        ],
      },
      c2_paid: {
        ch: "c2",
        lines: [
          A("DEBIT ALERT  ·  Acct **0917  ·  ₦2,000,000.00  ·  TO: G. ADEBAYO"),
          N("At dinner, Uncle Gbenga raises his glass to you."),
          S("gbenga", "To family.", "To family."),
          T("You bought his silence. So why does it feel like he bought yours?"),
        ],
        next: "c3_fail",
      },
      c2_refused: {
        ch: "c2",
        lines: [
          N("Friday passes. Saturday morning, a new number."),
          C("unknown", "Okay. One picture to your class group, then. Or ₦3 million. Your choice, champion.", "Okay. One picture to your class group then. Or ₦3 million. Your choice, champion."),
          N("You don’t pay. You also don’t sleep. You start checking your class group every ten minutes."),
          ...when(has("told_nkechi"), S("nkechi", "He is bluffing. People like him live on fear. We will find a way.", "Him dey bluff. People like am dey live on fear. We go find way.")),
        ],
        on: { wahala: 1 },
        next: "c3_fail",
      },

      /* ───────────── CHAPTER 3: EXAM SEASON ───────────── */
      c3_fail: {
        ch: "c3",
        lines: [
          N("Results week. Your portal shows a CGPA of 1.48. Below it, in red: ACADEMIC PROBATION."),
          N("Your phone rings. Not Daddy. Daddy’s PA."),
          S("pa", "Dami, the Senator says: fix it. No embarrassment before the election. Whatever it costs.", "Dami, Senator talk say: fix am. No embarrassment before election. Anything wey e cost."),
          N("Dr. Adekola, your Fluid Mechanics lecturer, is known to be “flexible.” Femi could sit the resit for you. Or you could actually try."),
        ],
        on: { set: { cgpa: 1.48 } },
        choices: [
          { en: "Pay Dr. Adekola ₦1 million to change the grades.", pg: "Pay Dr. Adekola ₦1 million make e change the grade.", fx: { money: -1000000, cgpa: 1.2, wahala: 1, flag: "bought_grade" }, to: "c3_bought", log: "Bought your grades from a lecturer" },
          { en: "Pay Femi ₦50k to write the resit for you.", pg: "Pay Femi ₦50k make e write the resit for you.", fx: { money: -50000, flag: "femi_exam" }, to: "c3_caught", log: "Paid Femi to write your exam" },
          { en: "Actually study. For real this time.", pg: "Read book. For real this time.", fx: { cgpa: 0.5, peace: -1, dad: 1, flag: "studied" }, to: "c3_study", log: "Studied for the resit yourself" },
        ],
      },
      c3_bought: {
        ch: "c3",
        lines: [
          N("Dr. Adekola’s office. You leave an envelope on his desk. He doesn’t even look up."),
          S("lecturer", "Your father is a good man. Greet him for me.", "Your papa na good man. Greet am for me."),
          N("Two days later, your portal shows a B. No questions. Nobody ever asks questions."),
          T("If everything can be bought, what’s the point of anything?"),
        ],
        next: "c4_skido",
      },
      c3_caught: {
        ch: "c3",
        lines: [
          N("Exam day. You wait in your car outside Hall B with the AC on. Forty minutes in, your phone explodes."),
          C("kunle", "GUY. Femi don enter trouble. Dr. Nwosu catch am with your exam card. They’re looking for you.", "GUY. Femi don enter trouble. Dr. Nwosu catch am with your exam card. Dem dey find you."),
          N("Disciplinary panel. Femi sits across the table from you. He won’t look at you. His hands are shaking."),
          N("You step out to call Daddy’s PA. Twenty minutes later, the panel chairman takes a phone call and goes quiet."),
          S("pa", "It’s handled. You will get a one-semester suspension. The other boy… that’s not our problem.", "E don handle. Dem go give you one semester suspension. The other boy… e no be our problem."),
          T("Femi is going to be expelled. For writing YOUR exam. For ₦50k you didn’t even notice leaving your account."),
        ],
        choices: [
          { en: "Walk back in and tell the panel: “It was my idea. I paid him.”", pg: "Waka go back tell the panel: “Na my idea. Na me pay am.”", fx: { dad: -2, nkechi: 1, peace: 2, flag: "owned_up" }, to: "c3_owned", log: "Told the panel the truth about Femi" },
          { en: "Stay quiet. Let Daddy’s call handle it.", pg: "Keep quiet. Make Daddy call handle am.", fx: { peace: -2, wahala: 2, flag: "let_femi_fall" }, to: "c3_silent", log: "Let Femi take the fall" },
        ],
      },
      c3_owned: {
        ch: "c3",
        lines: [
          N("You walk back in. The room goes silent. You say it. All of it. The ₦50k. The exam card. Your idea."),
          N("The panel changes its decision. Femi gets a suspension, not expulsion. You get the same."),
          S("femi", "Why did you do that?", "Why you do that?"),
          S("dami", "Because it was mine. For once, something was actually mine.", "Because na my own. For once, something be my own."),
          S("pa", "The Senator is very, very angry with you.", "Senator vex for you well-well."),
        ],
        next: "c4_skido",
      },
      c3_silent: {
        ch: "c3",
        lines: [
          N("A week later, you drive past the school gate. Femi is there with a bag of clothes and a bucket, waiting for a danfo to Ikorodu."),
          N("He sees your car. He doesn’t wave. He doesn’t do anything."),
          T("Daddy made a call. That’s all it took. One call, and a whole life moved out of your way."),
        ],
        next: "c4_skido",
      },
      c3_study: {
        ch: "c3",
        lines: [
          N("Three weeks. No parties. Aunty Nkechi brings you pepper soup at 1am and pretends she was “just passing.”"),
          N("The resit is hard. You actually know some of it."),
          N("Result: C. Not a B. Not bought. Yours."),
          S("nkechi", "See! Your head is correct after all!", "See! Your head dey correct after all!"),
        ],
        next: "c4_skido",
      },

      /* ───────────── CHAPTER 4: THIRD MAINLAND ───────────── */
      c4_skido: {
        ch: "c4",
        lines: [
          N("Months later. It isn’t “just weekends” anymore. Tuesdays. Thursdays. Before lectures."),
          ...when(has("paid_gbenga"), N("Uncle Gbenga has asked for money twice more. You paid twice more.")),
          S("skido", "Dami, no. Not tonight. You’re doing too much. You think I haven’t been giving you half all this time? You didn’t even notice.", "Dami, no. Not tonight. You don dey do too much. You think say I no dey give you half all this time? You no even notice."),
          T("He’s been watering it down. To protect you. Or to keep you buying. Maybe both."),
          S("kunle", "Forget Skido. I know a guy. Real stuff. Not that baby powder.", "Forget Skido. I know one guy. Correct stuff. No be that baby powder."),
        ],
        choices: [
          { en: "Buy Kunle’s “real stuff.”", pg: "Buy Kunle “correct stuff.”", fx: { wahala: 4, money: -150000, flag: "strong" }, to: "c4_party", log: "Bought stronger pills from Kunle’s guy" },
          { en: "Stick with Skido’s half.", pg: "Stay with Skido half.", fx: { wahala: 1 }, to: "c4_party", log: "Stayed with Skido’s weaker doses" },
          { en: "Flush what you have. Try to stop.", pg: "Flush wetin you get. Try stop.", fx: { peace: -2, nkechi: 1, flag: "trying" }, to: "c4_party", log: "Tried to stop using" },
        ],
      },
      c4_party: {
        ch: "c4",
        lines: [
          N("Saturday. A club on Victoria Island. Bottles with sparklers. You’re buying, as usual."),
          ...when(has("trying"), N("You’re only drinking tonight. Only drinking. Six shots in, that feels like a technicality.")),
          ...when(has("strong"), N("Kunle’s guy’s pills hit different. Your heart is running too fast. Your jaw won’t stop moving.")),
          N("2:10am. Aunty Nkechi calls."),
          S("nkechi", "Dami, where are you? Don’t drive. Let Musa come and carry you. Please.", "Dami, where you dey? No drive. Make Musa come carry you. Abeg."),
          S("kunle", "Ah, the house help is your mummy now? Let’s go! Third Mainland is empty at this hour!", "Ah, house help don turn your mummy? Make we go! Third Mainland empty this time!"),
        ],
        choices: [
          { en: "Drive yourself.", pg: "Drive yourself.", fx: { wahala: 1, flag: "drove" }, to: "c4_checkpoint", log: "Drove home drunk" },
          { en: "Wait for Musa.", pg: "Wait for Musa.", fx: { nkechi: 2, peace: 1, flag: "waited" }, to: "c4_musa", log: "Waited for the driver" },
        ],
      },
      c4_musa: {
        ch: "c4",
        lines: [
          N("Musa arrives in 25 minutes. He doesn’t say anything. He just hands you a bottle of water."),
          N("At home, the kitchen light is on. Aunty Nkechi is still awake, in her wrapper, with pepper soup."),
          S("nkechi", "Thank God. Thank God.", "Thank God. Thank God."),
          N("The next morning, a video is trending: a G-Wagon flipped on Third Mainland. Another rich kid. Another 3am."),
          T("That could have been my car."),
        ],
        next: "c5_collide",
      },
      c4_checkpoint: {
        ch: "c4",
        lines: [
          N("Third Mainland Bridge, 2:40am. The lagoon is black on both sides. You’re doing 160."),
          N("Torchlights. A police checkpoint. Three officers. One waves you down."),
          S("officer", "Oga, park well. Come down. Wetin you drink?", "Oga, park well. Come down. Wetin you drink?"),
          ...when(has("strong"), N("You can’t stop grinding your teeth. Your pupils are huge. Even you can hear how fast you’re talking.")),
          T("Two hundred thousand. That’s usually enough. Or you could drop Daddy’s name. Or you could just… go."),
        ],
        choices: [
          { en: "Bribe him. “Officer, let’s settle this.”", pg: "Bribe am. “Officer, make we settle am.”", fx: { money: -200000, flag: "bribed" }, to: "c4_bribe", log: "Tried to bribe the police" },
          { en: "“Do you know who my father is?”", pg: "“You know who be my papa?”", fx: { flag: "arrogant" }, to: "c4_arrogant", log: "Threatened the police with your father’s name" },
          { en: "Floor it. Speed off.", pg: "Press am. Zoom comot.", fx: { flag: "sped" }, to: "e_bridge", log: "Sped off from the checkpoint" },
        ],
      },
      c4_bribe: {
        ch: "c4",
        lines: [
          N("You fold the notes into your licence and hand it over."),
        ],
        route: (s) => (s.flags.strong ? "c4_bribe_fail" : "c4_bribe_ok"),
      },
      c4_bribe_ok: {
        ch: "c4",
        lines: [
          N("He counts it with one thumb, quickly, like a bank teller."),
          S("officer", "Oga, drive carefully o. Greet your father.", "Oga, drive jeje o. Greet your papa."),
          N("You drive off. At home, you can’t remember the rest of the journey."),
          T("It worked. It always works. Why are your hands shaking?"),
        ],
        next: "c5_collide",
      },
      c4_bribe_fail: {
        ch: "c4",
        lines: [
          N("He looks at the money. Then at your eyes. Then at the white powder on your shirt collar."),
          S("officer", "You dey high, and you wan bribe me? Come down from this car NOW.", "You dey high, and you wan bribe me? Come down from this motor NOW."),
          N("Someone at the checkpoint is filming. The torchlight is in your face."),
        ],
        next: "e_cell",
      },
      c4_arrogant: {
        ch: "c4",
        lines: [
          S("dami", "Do you know who my father is? Senator Ogunleye. One call and you’re posted to Sambisa.", "You know who be my papa? Senator Ogunleye. One call and dem go post you go Sambisa."),
          S("officer", "Ehen? Call am. Make we hear.", "Ehen? Call am. Make we hear."),
          N("You call Daddy. It rings out. You call his PA."),
          S("pa", "Dami… it’s election week. The Senator cannot be connected to this. Not this week. I’m sorry.", "Dami… na election week. Senator no fit near this matter. Not this week. Sorry."),
        ],
        next: "e_cell",
      },

      /* ───────────── CHAPTER 5: ROCK BOTTOM ───────────── */
      c5_collide: {
        ch: "c5",
        lines: [
          N("Election is in nine days. Everything happens at once."),
          C("unknown", "₦20 million. Before the election. Or the pictures go to every blog in Nigeria the night before voting.", "₦20 million. Before election. Or the pictures go reach every blog for Nigeria the night before voting."),
          N("Then Daddy comes home. With a zip-lock bag. The housekeeper found it in your room."),
          S("senator", "Pills? PILLS? I have two children in rehab abroad, and now you? Nine days to the election, Damilola!", "Pills? PILLS? Two of my pikin dey rehab abroad, and now you? Nine days to election, Damilola!"),
          N("He freezes every card you have. In one hour, your banking app shows ₦0."),
          ...when(has("paid_halita"), C("halita", "Babe… I can’t do this broke thing. It’s not you, it’s your account. Take care 💔", "Babe… I no fit do this broke thing. No be you, na your account. Take care 💔")),
          ...when(has("refused_halita"), C("halita", "Heard about your father’s wahala. Good luck 🙏🏽", "I hear your papa wahala. Good luck 🙏🏽")),
          C("kunle", "Bro, I’m a bit busy this week. Talk later.", "Bro, I dey a bit busy this week. We go talk."),
          N("Uncle Gbenga passes you in the corridor and smiles."),
          T("Nine days. Twenty million. Zero naira. And a bag in your drawer that still has three pills in it."),
        ],
        on: { set: { money: 0 } },
        choices: [
          { en: "Sell the G-Wagon. Pay Gbenga. Protect Daddy.", pg: "Sell the G-Wagon. Pay Gbenga. Protect Daddy.", fx: { wahala: 2, flag: "paid_again" }, to: "e_cage", log: "Sold your car to keep paying the blackmail" },
          { en: "Tell Daddy the truth. All of it. About Gbenga.", pg: "Tell Daddy the truth. Everything. About Gbenga.", fx: { peace: 2, flag: "told_dad" }, to: "c5_truth", log: "Told Dad the truth about Gbenga" },
          { en: "Take everything in the bag. Just to make it stop.", pg: "Swallow everything wey dey the bag. Just make e stop.", fx: { wahala: 5, flag: "bag" }, to: "c5_bag", log: "Took everything in the bag" },
        ],
      },
      c5_truth: {
        ch: "c5",
        lines: [
          N("Daddy’s study. 11pm. You close the door. Your voice shakes so much you have to start three times."),
          ...when(has("told_nkechi"), N("Aunty Nkechi stands beside you. She has been waiting months for this. She holds your shoulder the whole time.")),
          N("You tell him. Uncle Gbenga. That night. The pictures. The money. The pills."),
          N("Your father doesn’t say anything for a long time. Then he takes off his glasses."),
        ],
        route: (s) => (s.flags.told_nkechi || s.flags.owned_up || s.stats.dad >= 4 ? "c5_father" : "c5_campaign"),
      },
      c5_father: {
        ch: "c5",
        lines: [
          S("senator", "He was in my house. In MY house. And you carried this alone… to protect my campaign?", "E dey my house. MY house. And you carry this thing alone… to protect my campaign?"),
          N("Your father, the man who shakes ten thousand hands a day, holds you. You can’t remember the last time."),
          S("senator", "Let them publish whatever they want. I can lose an election. I can’t lose another child.", "Make dem publish anything wey dem want. I fit lose election. I no fit lose another pikin."),
          N("The next morning, Uncle Gbenga is arrested. The election is lost by 40,000 votes."),
        ],
        next: "e_clean",
      },
      c5_campaign: {
        ch: "c5",
        lines: [
          S("senator", "Gbenga is family. Do you understand what you’re saying? NINE DAYS to the election!", "Gbenga na family. You understand wetin you dey talk? NINE DAYS to election!"),
          S("senator", "We will handle this quietly. After the election. Until then, you say nothing. And you are not my problem until you’re clean.", "We go handle am quietly. After election. Till then, you no talk anything. And you no be my problem until you clean."),
          N("You pack one bag. Aunty Nkechi presses an envelope into your hand at the gate. Her own savings."),
          S("nkechi", "Go. Get well. I’m not far.", "Go. Get well. I no far."),
        ],
        next: "e_starting",
      },
      c5_bag: {
        ch: "c5",
        lines: [
          N("You swallow all three. Then you lie down on your bedroom floor because the bed feels too far away."),
          N("Your heart is going too fast. Then too slow. Then too fast."),
        ],
        route: (s) => (s.flags.strong ? "e_overdose" : "c5_wake"),
      },
      c5_wake: {
        ch: "c5",
        lines: [
          N("You wake up in Reddington Hospital. A drip in your arm. Aunty Nkechi asleep in the chair, still in her apron."),
          N("The doctor says you’re lucky. The pills were weak. Cut with something. Half-strength."),
          T("Skido. Skido’s half. The thing that was keeping you hooked is the thing that kept you alive."),
          S("nkechi", "Dami… don’t ever do that to me again. You hear? Ever.", "Dami… no ever do me like this again. You hear? Ever."),
          N("You tell her everything. And this time, you let her call your father."),
        ],
        route: (s) => (s.flags.told_nkechi || s.flags.owned_up || s.stats.dad >= 4 ? "c5_father" : "c5_campaign"),
      },
    },

    /* ───────────── ENDINGS ───────────── */
    endingScenes: {
      e_clean: {
        id: "clean",
        lines: [
          N("Ninety days at a rehab centre in Abeokuta. No phone. No G-Wagon. Group therapy with a bus driver, a banker’s wife and a 16-year-old from Ajegunle."),
          N("A therapist helps you say the word “assault” out loud for the first time. It takes four weeks."),
          N("Uncle Gbenga’s trial is still ongoing. But he is not in your house anymore. He is not in your head every minute anymore."),
          N("Six years later…"),
          ...when(has("owned_up"), N("A message from a number you saved as “Femi (owe him)”: “ColdRoom is raising Series A. I need someone who knows how rich people think. Interested?”")),
          ...when(has("owned_up"), N("You become ColdRoom’s Chief Marketing Officer. Your first campaign is about Mama Femi’s pepper stall. It goes viral for the right reasons.")),
          ...when(not("owned_up"), N("You start a foundation for young men who were abused and never told anyone. The first year, 2,000 people reach out.")),
          N("Your father comes to your two-year sobriety celebration. He sits in the front row. He doesn’t check his phone once."),
        ],
      },
      e_starting: {
        id: "starting",
        lines: [
          N("Rehab, paid for with Aunty Nkechi’s envelope and a loan from a church welfare fund."),
          N("Then a one-room apartment in Yaba. No AC. A ceiling fan that only works when NEPA is in a good mood."),
          N("You get a job at a digital agency. ₦180,000 a month. You learn what transport money is."),
          N("Your father wins the election. He doesn’t call."),
          T("For the first time in your life, everything you have is yours. It isn’t much. It’s real."),
        ],
      },
      e_cage: {
        id: "cage",
        lines: [
          N("You sell the G-Wagon. You pay Gbenga. Your father wins the election by a landslide. Nobody ever finds out."),
          N("You graduate. A Second Class Upper, partly bought. Daddy gets you a job at a federal agency. You show up twice a month."),
          N("Every month, on the 1st, ₦2 million leaves your account. To G. ADEBAYO. You stopped reading the debit alerts."),
          N("You still use. Thursdays. Saturdays. Before meetings."),
          T("On paper, you won. Money fixed everything. So why are you still in that room?"),
        ],
      },
      e_cell: {
        id: "cell",
        lines: [
          N("Panti Police Station, Yaba. A cell built for 12 holding 40."),
          N("The video from the checkpoint is everywhere by morning. “SENATOR’S SON CAUGHT HIGH ON THIRD MAINLAND.”"),
          N("Daddy’s office releases a statement: “The Senator does not interfere in matters of the law.” Election week."),
          N("Your phone is taken. Kunle doesn’t come. Halita posts a cryptic quote about “energy.”"),
          N("On day six, Aunty Nkechi arrives with food and a lawyer she found herself. She has been sleeping on a bench outside."),
          T("Daddy’s money couldn’t get you out. Daddy’s name got you in."),
        ],
      },
      e_bridge: {
        id: "bridge",
        lines: [
          N("You floor it. The officers jump back. In the rear-view mirror, torchlights shrink."),
          N("180. 190. The bridge curves. You don’t."),
          N("—"),
          N("The video goes viral by 6am: a white G-Wagon, upside down at the edge of Third Mainland, the barrier gone."),
          N("At Banana Island, Aunty Nkechi is still sitting in the kitchen. The pepper soup has gone cold. Her phone rings."),
        ],
      },
      e_overdose: {
        id: "overdose",
        lines: [
          N("Kunle’s guy’s pills were not half-strength."),
          N("—"),
          N("Aunty Nkechi comes up at 7am with tea, the way she has every morning since you were six."),
          N("The cup is still on the floor of your room when the ambulance comes. Nobody has moved it."),
          N("The family group chat has 214 unread messages. Tolu and Seun fly home from rehab for the burial."),
          N("Your father loses the election. He doesn’t notice."),
        ],
      },
    },

    endings: {
      clean: { title: "Clean", tone: "good", blurb: "The truth cost an election. It saved a life.", real: "Abuse thrives on silence. Telling one safe person is often the first step out, for boys and men too. In Lagos, the Mirabel Centre (at LASUTH, Ikeja) offers free, confidential support to survivors of sexual assault." },
      starting: { title: "Starting Over", tone: "mid", blurb: "Disowned. Sober. Free.", real: "Recovery often starts with losing the things that were enabling you. Having less can be the beginning, not the end." },
      cage: { title: "Golden Cage", tone: "bad", blurb: "Money fixed everything. Nothing got fixed.", real: "Paying a blackmailer rarely ends it; it usually teaches them you will keep paying. And money can numb a problem for years without solving it." },
      cell: { title: "Locked Up", tone: "bad", blurb: "Even a senator’s son can be forgotten.", real: "Drink-driving and drug-driving endanger everyone on the road. And powerful families protect their reputation first. Don’t bet your life on someone’s phone call." },
      bridge: { title: "Third Mainland", tone: "bad", blurb: "The bridge curves. He didn’t.", real: "Alcohol and drugs slow your reactions and make you feel more in control than you are. Call a driver, a friend, anyone. A wasted night is better than a wasted life." },
      overdose: { title: "Overdose", tone: "bad", blurb: "The ‘real stuff’ was real.", real: "Party pills are often not what the seller says. Strength varies wildly, and mixing them with alcohol is especially dangerous. If someone collapses, get emergency help immediately." },
    },
  };
})();
