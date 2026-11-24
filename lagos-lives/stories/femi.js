/*
  LAGOS LIVES — Femi's story: "First Son"

  This file is the SCRIPT. The engine (index.html) reads it.
  To add a new character later, copy this file's shape into a new file.

  Line helpers:
    N(text)                 narration (same in both languages)
    T(text)                 Femi's inner thoughts
    S(who, english, pidgin) someone speaks (pidgin optional; falls back to english)
    C(who, english, pidgin) a WhatsApp-style chat message
    A(text)                 a bank alert / SMS
    when(test, ...lines)    only show these lines if test(state) is true

  Effects (fx) on choices or scenes:
    money, cgpa, peace, mum, dele, lola, wahala  -> add/subtract
    set: { money: 4200 }                         -> set exactly
    flag: "name" or flags: ["a","b"]             -> remember a choice
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
  window.LAGOS_STORIES.femi = {
    id: "femi",
    hero: "Femi",
    title: "First Son",
    tagline: "200 Level Mechanical Engineering. First in his family to enter university. Very smart. Very broke.",
    start: "p_market",
    stats: { money: 0, cgpa: 3.8, peace: 6, mum: 8, dele: 8, lola: 1, wahala: 0 },

    cast: {
      femi: { name: "Femi", color: "#f4b81c" },
      mama: { name: "Mama", color: "#ffb38a" },
      kemi: { name: "Kemi", color: "#ff9ec7" },
      dele: { name: "Dele", color: "#6fdc9f" },
      kaycee: { name: "Kaycee", color: "#ff8a4c" },
      chairman: { name: "Chairman", color: "#c9a7ff" },
      lola: { name: "Lola", color: "#ff7aa8" },
      dami: { name: "Dami", color: "#7fc8ff" },
      nwosu: { name: "Dr. Nwosu", color: "#7fe3e0" },
      okon: { name: "Mr. Okon", color: "#d8d27a" },
      baba: { name: "Baba", color: "#e0a36b" },
      conductor: { name: "Conductor", color: "#d8d27a" },
    },

    chapters: {
      pro: { num: "Prologue", title: "Our Engineer" },
      c1: { num: "Chapter 1", title: "Sapa" },
      c2: { num: "Chapter 2", title: "The Plug" },
      c3: { num: "Chapter 3", title: "Exam Season" },
      c4: { num: "Chapter 4", title: "Soft Life" },
      c5: { num: "Chapter 5", title: "The Night" },
    },

    scenes: {
      /* ───────────── PROLOGUE ───────────── */
      p_market: {
        ch: "pro",
        lines: [
          N("Ikorodu Market, 6:40am. Generator smoke, fresh pepper, and Mama’s voice above everything."),
          S("mama", "Femi! Carry that basket properly. An engineer can’t carry a basket like someone who hasn’t eaten.", "Femi! Carry that basket well. Engineer no fit dey carry basket like person wey never chop."),
          N("You are Femi Adeyemi. 19 years old. 200 Level Mechanical Engineering at FUTIK. The first person in this family to enter university."),
          N("Since Baba died, everyone calls you “our engineer.” It sounds like pride. Most days it feels like weight."),
          S("kemi", "Brother Femi, when you finish school, you’ll buy me an iPhone, abi?", "Brother Femi, when you finish school, you go buy me iPhone abi?"),
          S("mama", "Kemi, face your front. Your own school fees haven’t even finished paying.", "Kemi, face your front. Your own school fees never even finish."),
        ],
        next: "p_park",
      },
      p_park: {
        ch: "pro",
        lines: [
          N("Ikorodu garage. A conductor is hanging off a yellow danfo, already shouting."),
          S("conductor", "FUTIK! FUTIK! Enter with your change o!", "FUTIK! FUTIK! Enter with your change o!"),
          N("Mama unties the knot at the edge of her wrapper and presses some folded notes into your hand."),
          S("mama", "Take. Fifteen thousand. Manage it.", "Take. Fifteen thousand. Manage am."),
          T("Hostel fee alone is ₦85,000. Handouts. Lab coat. Transport. She doesn’t know."),
          S("mama", "Femi. How is the money for school? Are you managing?", "Femi. How school money dey? You dey manage?"),
        ],
        on: { set: { money: 15000 } },
        choices: [
          { en: "Tell her the truth: “Mama, it’s not enough.”", pg: "Tell am true: “Mama, e no reach.”", fx: { mum: 1, peace: 1, flag: "told_truth" }, to: "p_truth", log: "Told Mama the truth about money" },
          { en: "“I’m fine, Ma. Don’t worry about me.”", pg: "“I dey alright, Ma. No worry about me.”", fx: { peace: -1, flag: "hid_struggle" }, to: "p_fine", log: "Told Mama you were fine" },
        ],
      },
      p_truth: {
        ch: "pro",
        lines: [
          N("Her face falls for one second. Then she fixes it, the way she always does."),
          S("mama", "I will talk to Iya Basira about the cooperative. God will make a way.", "I go talk to Iya Basira for cooperative. God go make way."),
          T("You know what “cooperative” means. Interest. Debt. Her sleeping less."),
        ],
        next: "p_send",
      },
      p_fine: {
        ch: "pro",
        lines: [
          S("mama", "My engineer! I knew you would manage.", "My engineer! I know say you go manage."),
          T("You smile back. One more thing to carry alone."),
        ],
        next: "p_send",
      },
      p_send: {
        ch: "pro",
        lines: [
          S("mama", "Femi. Whatever you do in that school, don’t bring shame to your father’s name.", "Femi. Anything wey you dey do for that school, no bring shame come your papa name."),
          N("The danfo pulls off. You watch her in the side mirror until she’s too small to see."),
        ],
        next: "c1_hostel",
      },

      /* ───────────── CHAPTER 1: SAPA ───────────── */
      c1_hostel: {
        ch: "c1",
        on: { set: { money: 4200 } },
        lines: [
          N("FUTIK. Block C, Room 14. Six boys, four bunks, one socket, zero light."),
          N("Two weeks into the semester. Your ₦15,000 is now ₦4,200."),
          N("Across the room, Kaycee is unboxing a brand-new iPhone. Everyone crowds around like it’s a naming ceremony."),
          S("kaycee", "Femo! Come and see this camera. It can snap your destiny.", "Femo! Come see camera. This thing fit snap your destiny."),
          N("Your Tecno buzzes. The screen is so cracked you read the message through a spiderweb."),
          C("kemi", "Brother Femi 😭 they sent us home today. Me and Tayo. Principal said no more owing. ₦65,000 for both of us.", "Brother Femi 😭 dem pursue us comot school today. Me and Tayo. Principal talk say no more owing. ₦65,000 for both of us."),
          C("kemi", "Please don’t tell Mama I told you. She was crying in the kitchen.", "Abeg no tell Mama say I tell you. She dey cry for kitchen."),
          T("₦65,000 for them. ₦85,000 for hostel. You have ₦4,200."),
          S("dele", "Why are you staring at that phone like it owes you money?", "Why you dey look that phone like say e owe you money?"),
          N("Dele Okafor. Your guy since JSS1. Broke like you, but somehow always calm. He says exactly what he thinks, every time."),
        ],
        next: "c1_lola",
      },
      c1_lola: {
        ch: "c1",
        lines: [
          N("Next morning, the ENG 201 lecture hall. You came early to charge your phone. That’s when Lola walks in."),
          N("Lola Bankole. 200 Level Architecture. The kind of girl who makes a lecture hall quiet without trying."),
          S("lola", "Hi, sorry… is this socket free?", "Hi, abeg… this socket free?"),
          N("Your charger is in it. Your phone is on 3%."),
        ],
        choices: [
          { en: "Unplug your phone. “It’s all yours.”", pg: "Comot your phone. “Na your own.”", fx: { lola: 1 }, to: "c1_lola_a", log: "Gave Lola the socket" },
          { en: "“Sorry, my phone is almost dead.”", pg: "“Sorry, my phone don almost die.”", fx: { peace: -1 }, to: "c1_lola_b", log: "Kept the socket" },
        ],
      },
      c1_lola_a: {
        ch: "c1",
        lines: [
          S("lola", "Ah, thank you! A gentleman.", "Ah, thank you! Gentleman."),
          N("She sits two seats away. Her friend sees your cracked Tecno and whispers something. They both laugh."),
          T("Maybe it wasn’t about you. It felt like it was about you."),
        ],
        next: "c1_offers",
      },
      c1_lola_b: {
        ch: "c1",
        lines: [
          S("lola", "No wahala.", "No wahala."),
          N("She finds another socket. Her friend sees your cracked Tecno and whispers something. They both laugh."),
          T("Maybe it wasn’t about you. It felt like it was about you."),
        ],
        next: "c1_offers",
      },
      c1_offers: {
        ch: "c1",
        lines: [
          N("After class, Kaycee walks up with a boy in designer slides and sunglasses. Indoors."),
          N("Dami. 200 Level. His father owns half of a bank. He has never written his own assignment."),
          S("dami", "Guy, they say you’re the brain. I have two assignments and one lab report. ₦30k. Cash.", "Guy, dem talk say you be the brain. I get two assignment and one lab report. ₦30k. Cash."),
          S("kaycee", "Or… I have a sure banker this weekend. Arsenal, Madrid, Napoli. Stake ₦4k, collect ₦90k. Simple.", "Or… I get sure banker this weekend. Arsenal, Madrid, Napoli. Drop ₦4k, carry ₦90k. Simple."),
          N("Later, Dele has his own idea."),
          S("dele", "Mr. Okon at the cyber café needs someone to fix computers. It’s small money, but it’s clean.", "Mr. Okon for that cyber café need person wey go dey repair system. Na small money, but e clean."),
          T("You need ₦150,000. Where do you start?"),
        ],
        choices: [
          { en: "Take Dami’s ₦30k. It’s just homework.", pg: "Collect Dami ₦30k. Na just homework.", fx: { wahala: 1, flag: "dami_work" }, to: "c1_r_dami", log: "Did Dami’s assignments for cash" },
          { en: "Stake ₦4k on Kaycee’s “sure” banker.", pg: "Drop ₦4k for Kaycee “sure” banker.", fx: { wahala: 2, flag: "bet" }, to: "c1_r_bet", log: "Bet on Kaycee’s banker" },
          { en: "Go and see Mr. Okon at the cyber café.", pg: "Go see Mr. Okon for cyber café.", fx: { dele: 1, peace: 1, flag: "okon" }, to: "c1_r_okon", log: "Took the cyber café job" },
          { en: "Call Mama and tell her about Kemi.", pg: "Call Mama tell am about Kemi.", fx: { mum: 1, peace: -1, flag: "called_mama" }, to: "c1_r_mama", log: "Called Mama about Kemi’s fees" },
        ],
      },
      c1_r_dami: {
        ch: "c1",
        lines: [
          N("It takes you four hours. Four hours you were supposed to spend on your own lab report."),
          A("CREDIT ALERT  ·  Acct **4471  ·  ₦30,000.00  ·  FRM: DAMILOLA O."),
          S("dami", "My guy! Same time next week.", "My guy! Same time next week."),
          T("₦30k in four hours. Why have you been suffering?"),
        ],
        on: { money: 30000, cgpa: -0.15 },
        next: "c1_end",
      },
      c1_r_bet: {
        ch: "c1",
        lines: [
          N("Saturday night. Arsenal win. Madrid win. Napoli… draw. 94th minute."),
          S("kaycee", "Ah! Only one game cut! Next week it will enter, I swear.", "Ah! Na only one game cut! Next week e go enter, I swear."),
          T("₦4,200 to ₦200. And he’s already sending next week’s slip."),
        ],
        on: { money: -4000, peace: -1 },
        next: "c1_end",
      },
      c1_r_okon: {
        ch: "c1",
        lines: [
          N("Mr. Okon’s cyber café smells of dust and hot plastic. You fix his printer in ten minutes."),
          S("okon", "Ten minutes? Young man, you have hands. ₦8,000 a week, and charge your phone free.", "Ten minutes? Young man, you get hand. ₦8,000 every week, and charge your phone free."),
          T("₦8,000. It’s not ₦150,000. But nobody can take it from you."),
        ],
        on: { money: 8000 },
        next: "c1_end",
      },
      c1_r_mama: {
        ch: "c1",
        lines: [
          N("A long silence on the line. You can hear the market behind her."),
          S("mama", "I will go to the cooperative. Don’t worry yourself. Face your book.", "I go go cooperative. No worry yourself. Face your book."),
          A("CREDIT ALERT  ·  Acct **4471  ·  ₦20,000.00  ·  FRM: ADEYEMI FUNMILAYO"),
          T("You know what that ₦20,000 cost her. Interest. Pride. Sleep."),
        ],
        on: { money: 20000 },
        next: "c1_end",
      },
      c1_end: {
        ch: "c1",
        lines: [
          N("That night, NEPA takes light again. You and Dele sit on the hostel roof because it’s cooler."),
          S("dele", "Femi, I know things are hard. Just don’t let hard make you stupid.", "Femi, I know say things hard. Just no let hard make you mumu."),
        ],
        next: "c2_benz",
      },

      /* ───────────── CHAPTER 2: THE PLUG ───────────── */
      c2_benz: {
        ch: "c2",
        lines: [
          N("Three weeks later. A black Benz GLE stops beside you outside the Faculty of Engineering. The window slides down."),
          N("Chairman. 300 Level. Nobody knows his department. Everybody knows his car."),
          S("chairman", "You’re Femi. Kaycee says you fixed every laptop in Block C. I like sharp people.", "You be Femi. Kaycee talk say na you fix every laptop for Block C. I like sharp person."),
          S("chairman", "I run a small digital business. I need someone on the tech side. Set up laptops, VPNs, write some scripts. ₦100k a month. To start.", "I dey run small digital business. I need person for tech side. Set up laptop, VPN, write small script. ₦100k every month. To start."),
          T("₦100,000. A month."),
          S("femi", "What kind of digital business?", "Which kind digital business?"),
          S("chairman", "Femi. Do I ask what kind of engineer you are? Come to the office on Friday. Just look. Looking is free.", "Femi. I dey ask you which kind engineer you be? Come office Friday. Just look. To look no cost money."),
        ],
        next: "c2_ponzi",
      },
      c2_ponzi: {
        ch: "c2",
        lines: [
          N("That evening, a broadcast message lands in every WhatsApp group you’re in."),
          C("kaycee", "🚀 DOUBLE GAIN INVESTMENT 🚀 Invest ₦20k, collect ₦40k in 21 days! 100% GUARANTEED. CAC registered. LIMITED SLOTS!!", "🚀 DOUBLE GAIN INVESTMENT 🚀 Invest ₦20k, collect ₦40k in 21 days! 100% GUARANTEED. CAC registered. LIMITED SLOTS!!"),
          C("kaycee", "Femo, I put my own. My cousin collected ₦200k last month. Don’t dull yourself.", "Femo, I don put my own. My cousin collect ₦200k last month. No dull yourself."),
        ],
        choices: [
          { en: "Invest ₦20k. Double is double.", pg: "Put ₦20k. Double na double.", req: (s) => s.stats.money >= 20000, reqText: "You don’t have ₦20k", fx: { money: -20000, wahala: 1, flag: "ponzi" }, to: "c2_dele", log: "Put ₦20k into Double Gain" },
          { en: "Mute the group.", pg: "Mute the group.", fx: { peace: 1 }, to: "c2_dele", log: "Ignored the Ponzi scheme" },
        ],
      },
      c2_dele: {
        ch: "c2",
        lines: [
          N("Friday afternoon at the buka. Kaycee is telling everyone you’re “joining Chairman’s team.” Dele puts his spoon down."),
          S("dele", "Femi. I’ll say it once. Chairman doesn’t do “help.” Whatever he’s giving you, he’s buying something.", "Femi. I go talk am once. Chairman no dey do “help.” Wetin him dey give you, na something him dey buy."),
          S("femi", "You’re just jealous that money is finally touching my hand.", "You just dey jealous say money don finally touch my hand."),
          S("dele", "Jealous of what? Of a man who can’t explain where his Benz came from?", "Jealous of wetin? Of person wey no fit explain where him Benz come from?"),
          S("kaycee", "Dele, abeg rest. Not everybody wants to be poor and righteous.", "Dele, abeg rest. No be everybody wan dey poor dey righteous."),
          N("Your phone buzzes."),
          C("chairman", "Office is open. 7pm. Your choice.", "Office dey open. 7pm. Your choice."),
        ],
        choices: [
          { en: "Go to the office. Just to look.", pg: "Go office. Just to look.", fx: { wahala: 2, flag: "office" }, to: "c2_office", log: "Went to Chairman’s “office”" },
          { en: "Text Chairman: “I’m not interested.”", pg: "Text Chairman: “I no dey interested.”", fx: { dele: 1, peace: 1, flag: "refused_chairman" }, to: "c2_night", log: "Turned Chairman down" },
        ],
      },
      c2_office: {
        ch: "c2",
        lines: [
          N("The “office” is a duplex in a quiet estate. Ring lights. Five laptops. Boys in slides typing sweet messages to men in Ohio."),
          N("Someone has a printed script taped to his screen: “Hello dear, my name is Jennifer, I am a nurse in Texas…”"),
          S("chairman", "You don’t have to chat anybody. Just keep the systems running, keep the VPNs clean, and write me something that sends messages faster. Engineering.", "You no need chat anybody. Just make the systems dey run, make VPN dey clean, write me something wey go send message fast. Engineering."),
          T("It’s just code. You’re not the one lying to anybody. …Right?"),
        ],
        choices: [
          { en: "Take the job. ₦100k is ₦100k.", pg: "Take the work. ₦100k na ₦100k.", fx: { wahala: 3, peace: -2, mum: -1, flag: "yahoo" }, to: "c2_yahoo", log: "Joined Chairman’s yahoo operation" },
          { en: "Walk out.", pg: "Waka comot.", fx: { peace: -1, flag: "walked_out" }, to: "c2_night", log: "Walked out of the office" },
        ],
      },
      c2_yahoo: {
        ch: "c2",
        lines: [
          A("CREDIT ALERT  ·  Acct **4471  ·  ₦100,000.00  ·  FRM: GOLDEN TREE VENTURES"),
          N("The first time you see six figures in your account, your hands shake."),
          N("You send ₦65,000 to Kemi’s school the same night. You tell Mama it’s from “a scholarship.”"),
        ],
        on: { money: 100000 },
        next: "c2_night",
      },
      c2_night: {
        ch: "c2",
        lines: [
          N("Midnight. Dele’s message comes in."),
          C("dele", "Femi. Are we good? I don’t want to lose you to these people.", "Femi. We dey alright? I no wan lose you to these people."),
        ],
        choices: [
          { en: "“We’re good. Thank you for always telling me the truth.”", pg: "“We dey alright. Thank you say you dey always tell me true.”", fx: { dele: 2, peace: 1, flag: "kept_dele" }, to: "c3_office", log: "Kept Dele close" },
          { en: "“Abeg, leave me. You’re blocking my blessings.”", pg: "“Abeg, leave me. You dey block my blessing.”", fx: { dele: -5, wahala: 2, flag: "cut_dele" }, to: "c3_office", log: "Cut Dele off" },
          { en: "Leave him on read.", pg: "Leave am for read.", fx: { dele: -2, wahala: 1, flag: "ignored_dele" }, to: "c3_office", log: "Left Dele on read" },
        ],
      },

      /* ───────────── CHAPTER 3: EXAM SEASON ───────────── */
      c3_office: {
        ch: "c3",
        lines: [
          N("Two weeks to exams. A message on the class group: “FEMI ADEYEMI should see Dr. Nwosu in her office. URGENTLY.”"),
          N("Dr. (Mrs.) Nwosu. Thermodynamics. Thirty years of teaching. Has never smiled in a lecture."),
          S("nwosu", "Sit. Your first test was 18 over 20. Your second was 9. What happened?", "Sit down. Your first test na 18 over 20. Your second na 9. Wetin happen?"),
          ...when(has("yahoo"), T("Nights at the office. Days sleeping through lectures. You say nothing.")),
          ...when(has("dami_work"), T("Dami’s assignments. Every week. Then his friends’ assignments. You say nothing.")),
          S("nwosu", "There is the National Young Engineers Innovation Challenge. I want to nominate you. But I don’t nominate students with Cs. Your exam decides.", "National Young Engineers Innovation Challenge dey. I wan nominate you. But I no dey nominate student wey get C. Your exam go decide."),
          S("nwosu", "I see many brilliant boys in this school, Femi. Brilliance is common. Discipline is rare.", "I don see plenty brilliant boys for this school, Femi. To get sense common. Discipline na im rare."),
        ],
        next: "c3_expo",
      },
      c3_expo: {
        ch: "c3",
        lines: [
          N("Night before the Thermodynamics exam. You’ve barely touched the handout."),
          C("kaycee", "Expo for MEE 202 is available. ₦5k. The real one, straight from inside.", "Expo for MEE 202 dey. ₦5k. Na the real one, from inside."),
          C("dami", "Bro. Sit the exam for me tomorrow? ₦50k. Same hall, they never check ID properly.", "Bro. Abeg write the exam for me tomorrow? ₦50k. Same hall, dem no dey check ID well."),
          ...when(not("cut_dele"), N("Dele knocks with two sachets of Nescafé and the past questions.")),
          ...when(has("cut_dele"), N("The room is quiet. Dele used to come over the night before exams. Not anymore.")),
        ],
        choices: [
          { en: "Buy the expo. Everybody’s doing it.", pg: "Buy the expo. Everybody dey do am.", fx: { money: -5000, wahala: 2, flag: "expo" }, to: "c3_expo_fake", log: "Bought exam “expo”" },
          { en: "Write Dami’s exam for him. ₦50k.", pg: "Write Dami exam for am. ₦50k.", fx: { wahala: 4, flag: "impersonate" }, to: "c3_caught", log: "Sat an exam for Dami" },
          { en: "Read all night.", pg: "Read all night.", fx: { peace: -1, flag: "studied" }, to: "c3_study", log: "Read all night for the exam" },
        ],
      },
      c3_expo_fake: {
        ch: "c3",
        lines: [
          N("Exam hall. You turn the paper over. Not one question matches the expo. Not one."),
          N("Behind you, someone actually groans out loud."),
          S("kaycee", "Ahh. That’s how it goes sometimes. Next semester we’ll get the correct one.", "Ehn. Na so e dey be sometimes. Next semester we go get the correct one."),
          N("A week later, the class group: “Dr. Nwosu’s nominee for the Innovation Challenge: Adaeze Obi.”"),
        ],
        on: { cgpa: -0.5, peace: -1, flag: "no_nomination" },
        next: "c4_route",
      },
      c3_caught: {
        ch: "c3",
        lines: [
          N("Hall B. You sit in Dami’s seat with Dami’s exam card. Your heart is beating in your ears."),
          N("Forty minutes in, an invigilator stops beside you. He looks at the photo on the card. He looks at you. He looks at the photo again."),
          S("nwosu", "Femi Adeyemi? This is not your hall. This is not your name.", "Femi Adeyemi? This no be your hall. This no be your name."),
          N("Dr. Nwosu herself. Of all the invigilators in FUTIK."),
        ],
        next: "e_expelled",
      },
      c3_study: {
        ch: "c3",
        lines: [
          ...when(not("cut_dele"), N("You and Dele go question by question until 4am. He falls asleep on the handout.")),
          ...when(has("cut_dele"), N("You go question by question alone until 4am.")),
          N("Exam hall. The paper is hard. But you know it. Your hand cramps from writing."),
          N("Results come out: an A in Thermodynamics. A week later, the class group:"),
          N("“Dr. Nwosu’s nominee for the National Young Engineers Innovation Challenge: FEMI ADEYEMI.”"),
        ],
        on: { cgpa: 0.3, peace: 1, flag: "nominated" },
        next: "c4_route",
      },

      /* ───────────── CHAPTER 4: SOFT LIFE ───────────── */
      c4_route: {
        ch: "c4",
        lines: [],
        route: (s) => (s.flags.yahoo ? "c4_soft" : s.flags.nominated ? "c4_grind" : "c4_mid"),
      },
      c4_soft: {
        ch: "c4",
        lines: [
          N("The money is landing now. ₦100k. ₦250k. A ₦400k “bonus” when a client in Texas “finally paid.”"),
          A("CREDIT ALERT  ·  Acct **4471  ·  ₦400,000.00  ·  FRM: GOLDEN TREE VENTURES"),
          N("New iPhone. New sneakers. You stop taking danfo."),
          S("lola", "Femi? Since when do you dress like this?", "Femi? Since when you dey dress like this?"),
          N("Lola is laughing at your jokes now. She invites you to a birthday party in Lekki."),
          N("At the party, a girl in a green dress keeps stepping away from an older man at the bar. He keeps following. Someone calls her PC. (Her story comes later.)"),
          ...when(has("ponzi"), N("Sunday morning: the Double Gain website is gone. Kaycee’s cousin’s number is switched off. Kaycee says he lost ₦600k. Your ₦20k is gone.")),
          N("Then Mama calls."),
          S("mama", "Femi. Iya Basira’s son said he saw you in Lekki in a Benz. Where is this money coming from?", "Femi. Iya Basira pikin talk say e see you for Lekki inside Benz. Where this money dey come from?"),
        ],
        on: { money: 650000, lola: 3, peace: -1 },
        choices: [
          { en: "Tell her the truth.", pg: "Tell am the truth.", fx: { mum: -2, peace: 2, flag: "confessed" }, to: "c4_confess", log: "Confessed to Mama" },
          { en: "Lie: “I’m doing freelance design for a company.”", pg: "Lie: “I dey do freelance design for one company.”", fx: { peace: -2, wahala: 1, flag: "lied_mama" }, to: "c4_lie", log: "Lied to Mama about the money" },
        ],
      },
      c4_confess: {
        ch: "c4",
        lines: [
          N("You tell her everything. The office. The scripts. Golden Tree Ventures."),
          N("She doesn’t shout. That is worse. She just breathes."),
          S("mama", "Your father sold pepper with me for nineteen years. Nineteen years, Femi, and nobody could ever point at us.", "Your papa sell pepper with me for nineteen years. Nineteen years, Femi, and nobody fit point finger for us."),
          S("mama", "Come out of it. Whatever it costs. Come out.", "Comot from am. Anything wey e cost. Comot."),
        ],
        next: "c4_baba_offer",
      },
      c4_lie: {
        ch: "c4",
        lines: [
          S("mama", "Freelance design… okay. God bless your hustle, my son.", "Freelance design… okay. God bless your hustle, my pikin."),
          T("She believed you. Somehow that feels worse than if she hadn’t."),
        ],
        next: "c4_baba_offer",
      },
      c4_baba_offer: {
        ch: "c4",
        lines: [
          N("Late night at the office. Chairman closes the door and sits on the edge of your desk."),
          S("chairman", "Femi. This small-small money is finished. Clients are getting wise. We’re going to the next level.", "Femi. This small-small money don finish. Clients don dey get sense. We dey go next level."),
          S("kaycee", "Yahoo plus, my guy. There’s a Baba in Ijebu. One trip, and the money will never stop.", "Yahoo plus, my guy. One Baba dey Ijebu. One trip, and money no go stop again."),
          S("chairman", "We leave Saturday. You’re coming. You’re part of the team now.", "We go comot Saturday. You dey come. You don be part of the team."),
          T("Part of the team. Why does that sound like a cage?"),
        ],
        choices: [
          { en: "Go with them to see Baba.", pg: "Follow them go see Baba.", fx: { wahala: 5, flag: "baba" }, to: "c5_baba", log: "Went to see “Baba” in Ijebu" },
          { en: "Quit. Tonight. Wipe your laptop and walk.", pg: "Quit. Tonight. Clear your laptop and waka.", fx: { wahala: -2, peace: 2, flag: "quit" }, to: "c4_quit", log: "Quit Chairman’s operation" },
        ],
      },
      c4_quit: {
        ch: "c4",
        lines: [
          N("You wipe the scripts. You hand back the office key. Chairman doesn’t shout either. He just smiles."),
          S("chairman", "No problem, Femi. Nobody forces anybody. But remember, your hands are not clean. Nobody’s hands are clean.", "No problem, Femi. Nobody dey force anybody. But remember, your hand no clean. Nobody hand clean."),
          ...when(not("cut_dele"), N("You call Dele at 2am. He picks up on the first ring.")),
          ...when(has("cut_dele"), N("You open Dele’s chat. The last message is yours: “You’re blocking my blessings.” You close it again.")),
        ],
        next: "c5_party",
      },
      c4_grind: {
        ch: "c4",
        lines: [
          N("The Innovation Challenge brief: “Design a solution for a real Nigerian problem.”"),
          T("Mama throws away pepper every week because it spoils before she can sell it."),
          N("Your idea: a cheap solar cold-storage box for market women. Pay small-small, daily, from your phone."),
          ...when(not("cut_dele"), N("Dele carries scrap metal with you from the mechanic village. You build it in the faculty workshop after midnight.")),
          ...when(has("cut_dele"), N("You carry the scrap metal alone. Some nights you sleep in the workshop.")),
          N("You’re broke again. Your Tecno finally dies for good."),
          S("dami", "Bro. Do my whole final year project and I’ll pay ₦150k. You’re the only one I trust.", "Bro. Do my whole final year project, I go pay ₦150k. Na only you I trust."),
          S("lola", "Wait, you’re the guy building the fridge thing? That’s actually… really cool.", "Wait, na you be the guy wey dey build that fridge thing? E actually… sweet me."),
        ],
        choices: [
          { en: "Say no to Dami. Focus on the prototype.", pg: "Tell Dami no. Face the prototype.", fx: { peace: -1, lola: 2, flag: "grind" }, to: "c5_party", log: "Focused on the prototype" },
          { en: "Take Dami’s ₦150k AND build the prototype. Sleep is for later.", pg: "Collect Dami ₦150k AND build the prototype. Sleep na for later.", fx: { money: 150000, peace: -4, cgpa: -0.2, flag: "overwork" }, to: "c5_party", log: "Took on everything at once, no sleep" },
        ],
      },
      c4_mid: {
        ch: "c4",
        lines: [
          N("No nomination. A C in Thermodynamics. Hostel fees are due again."),
          ...when(has("ponzi"), N("Double Gain’s website is gone. Kaycee’s cousin’s number is switched off. Your ₦20k is gone.")),
          N("Chairman’s Benz stops beside you again. He doesn’t even say anything this time. He just holds out a key."),
          T("Or you could do everything at once. Dami’s work. Mr. Okon’s café. Night shifts. Sleep when you’re dead."),
        ],
        choices: [
          { en: "Take the key. You’re tired of being broke.", pg: "Collect the key. You don tire to dey broke.", fx: { wahala: 3, peace: -2, money: 200000, flag: "yahoo" }, to: "c4_baba_offer", log: "Joined Chairman’s operation late" },
          { en: "Hustle every legit job at once. Sleep is for later.", pg: "Run every legit work at once. Sleep na for later.", fx: { money: 60000, peace: -4, cgpa: -0.2, flag: "overwork" }, to: "c5_party", log: "Took on every job, no sleep" },
        ],
      },

      /* ───────────── CHAPTER 5: THE NIGHT ───────────── */
      c5_party: {
        ch: "c5",
        lines: [
          N("Friday. Chairman’s birthday. The party is at the office. Half of 300 Level is going."),
          N("Lola posts a story: a ring light, a cake, “Chairman’s 24th 🎉 pull up.”"),
          ...when(has("quit"), S("kaycee", "Femo, come and show face. No hard feelings. It’s just a party.", "Femo, come show face. No hard feelings. Na just party.")),
          ...when(not("quit"), S("kaycee", "Femo, everybody will be there. Lola too. Come and enjoy yourself for once.", "Femo, everybody go dey there. Lola too. Come enjoy yourself for once.")),
          ...when(has("grind"), N("The Innovation Challenge finals are in Abuja on Monday.")),
        ],
        choices: [
          { en: "Go. It’s just a party.", pg: "Go. Na just party.", fx: { flag: "party" }, to: "c5_at_party", log: "Went to Chairman’s birthday party" },
          { en: "Stay back tonight.", pg: "Stay back tonight.", fx: { peace: 1 }, to: "c5_stayed", log: "Stayed away from the party" },
        ],
      },
      c5_at_party: {
        ch: "c5",
        lines: [
          N("Loud music. Smoke machine. Chairman spraying dollars. Lola dancing near the speaker."),
          N("1:40am. Your phone buzzes."),
          ...when(not("cut_dele"), C("dele", "Femi. Where are you? Some boys at the gate say they saw EFCC buses on the expressway. Please come out now.", "Femi. Where you dey? Some boys for gate talk say dem see EFCC bus for expressway. Abeg comot now.")),
          ...when(has("cut_dele"), N("It’s just a notification. Data bundle expiring. Nobody is looking for you.")),
        ],
        route: null,
        choices: [
          { en: "Leave now. Climb the back fence.", pg: "Comot now. Climb back fence.", if: not("cut_dele"), fx: { flag: "escaped" }, to: "c5_escape", log: "Listened to Dele and left" },
          { en: "Stay. Dele is always paranoid.", pg: "Stay. Dele too dey fear.", if: not("cut_dele"), fx: { wahala: 2 }, to: "c5_raid", log: "Ignored Dele’s warning" },
          { en: "Keep dancing.", pg: "Dey dance dey go.", if: has("cut_dele"), to: "c5_raid", log: "Stayed at the party" },
        ],
      },
      c5_escape: {
        ch: "c5",
        lines: [
          N("You climb the back fence and tear your trousers. You’re three streets away when the sirens start."),
          N("By morning it’s on every blog: “EFCC arrests 42 suspected internet fraudsters at birthday party in Ikorodu.”"),
          N("Lola is in one of the photos, crying, being pushed into a bus. Kaycee too."),
          T("That could have been you. It nearly was."),
        ],
        route: (s) => (s.flags.yahoo && !s.flags.quit ? "e_trial_late" : "c5_after"),
      },
      c5_raid: {
        ch: "c5",
        lines: [
          N("2:13am. The music cuts. Floodlights through the windows. Men in black vests."),
          N("“EFCC! Nobody move! Everybody face the wall!”"),
          ...when(has("quit"), T("You quit. You QUIT. Three weeks ago. You start explaining. Nobody is listening.")),
          N("They take every phone. Every laptop. Every boy in the building. And yours is the name on the VPN invoices."),
        ],
        next: "e_trial",
      },
      c5_stayed: {
        ch: "c5",
        lines: [
          N("You stay in. At 6am your phone is exploding."),
          N("“EFCC arrests 42 suspected internet fraudsters at birthday party in Ikorodu.” Chairman. Kaycee. Half of 300 Level."),
        ],
        route: (s) => (s.flags.yahoo && !s.flags.quit ? "e_trial_late" : "c5_after"),
      },
      c5_after: {
        ch: "c5",
        lines: [],
        route: (s) => {
          if (s.flags.overwork && s.stats.peace <= 3) return "e_burnout";
          if (s.flags.grind && !s.flags.yahoo) return "e_founder";
          return "e_standing";
        },
      },
      c5_baba: {
        ch: "c5",
        lines: [
          N("Saturday. Chairman’s Benz. Kaycee in the back with you. Nobody is talking."),
          N("Ijebu-Ode, then a smaller road, then no road. A path through bush. It’s getting dark."),
          ...when(not("cut_dele"), C("femi", "Dele, if you don’t hear from me by 9pm, my location is…", "Dele, if you no hear from me by 9pm, my location na…")),
          ...when(not("cut_dele"), N("No network. The message doesn’t deliver. One grey tick.")),
          N("The shrine is smaller than you imagined. Red cloth. Smoke. An old man who doesn’t look at you. He looks at Chairman."),
          S("baba", "You brought what I asked for?", "You bring wetin I talk?"),
          S("chairman", "Yes, Baba. He is young. He is the first son of his mother.", "Yes, Baba. Him young. Na first son for him mama."),
          N("Kaycee won’t meet your eyes. Two men you didn’t notice are standing behind you."),
          T("“You’re part of the team now.” You finally understand what he meant."),
        ],
        next: "e_missing",
      },
    },

    /* ───────────── ENDINGS ───────────── */
    endingScenes: {
      e_founder: {
        id: "founder",
        lines: [
          N("Abuja. The Innovation Challenge finals. Your cold-storage box keeps tomatoes fresh for nine days. The judges ask for a second demo."),
          N("You win. ₦5 million in seed funding. Dr. Nwosu actually smiles. Briefly."),
          N("Twelve years later…"),
          N("ColdRoom has 80,000 solar cold-storage units in markets across West Africa. Traders pay small daily amounts from their phones. The company is valued at $1.2 billion."),
          N("The first unit ever installed is still at Ikorodu Market. It belongs to Mama."),
          ...when(not("cut_dele"), N("Dele is the CTO. He still tells you the truth. Every single time.")),
          ...when(has("cut_dele"), N("You think about Dele sometimes. You never found the courage to call him back.")),
        ],
      },
      e_standing: {
        id: "standing",
        lines: [
          N("You graduate with a Second Class Lower. Not what Dr. Nwosu once saw in you. But you graduate."),
          N("A job at a manufacturing plant in Agbara. ₦280,000 a month. Danfo every morning."),
          N("Kemi finishes secondary school. Tayo too. Slowly, Mama’s debts close."),
          T("Some nights you wonder who you could have been. Then you remember who you nearly became."),
        ],
      },
      e_expelled: {
        id: "expelled",
        lines: [
          N("Disciplinary panel. Dami’s father makes a phone call. Dami gets a one-semester suspension."),
          N("You get expelled."),
          N("The danfo back to Ikorodu. Same garage. Same conductor shouting."),
          N("Mama is at her stall. She sees your bags before she sees your face."),
          S("mama", "Our engineer… what happened?", "Our engineer… wetin happen?"),
          T("You have no words. Just ₦50k that Dami never sent."),
        ],
      },
      e_trial: {
        id: "trial",
        lines: [
          N("Ikoyi Correctional Centre. “Awaiting trial.”"),
          N("Chairman is out on bail in three weeks. His father knows people. Your mother knows a pepper stall."),
          N("Your case file gets lost. Then your lawyer stops coming. Then your hearing is adjourned. Again. Again. Again."),
          ...when(has("quit"), T("You had quit three weeks before that party. The court never got far enough to hear it.")),
          N("Femi Adeyemi has been awaiting trial for 11 years. He is 31."),
          N("Kemi left school to help Mama at the stall. Tayo stopped telling people he has a big brother."),
        ],
      },
      e_trial_late: {
        id: "trial",
        lines: [
          N("You weren’t at the party. It doesn’t matter. Chairman’s laptops were full of your scripts. Your account was full of Golden Tree Ventures."),
          N("They come for you in the hostel two days later."),
          N("Chairman is out on bail in three weeks. His father knows people. Your mother knows a pepper stall."),
          N("Femi Adeyemi has been awaiting trial for 11 years. He is 31."),
          N("Kemi left school to help Mama at the stall. Tayo stopped telling people he has a big brother."),
        ],
      },
      e_burnout: {
        id: "burnout",
        lines: [
          N("Second semester exams. Three hours of sleep in four days. Halfway through Fluid Mechanics, the paper goes blurry."),
          N("You wake up in the school clinic, then a general hospital. Joints swollen. Fever that won’t break. A rash across your face."),
          N("Weeks of tests. Then a word you have to google: an autoimmune disease. Your body has started attacking itself."),
          N("The doctor says stress didn’t cause it alone. But it lit the fire, and the flares will come back for the rest of your life."),
          N("You survive. You graduate one year late. Mama now spends part of her pepper money on your drugs every month."),
          T("You were trying to carry everyone. Nobody told you that you were allowed to put something down."),
        ],
      },
      e_missing: {
        id: "missing",
        lines: [
          N("Your phone dies at 7:14pm."),
          N("—"),
          N("Three days later, Dele prints a poster at Mr. Okon’s cyber café. MISSING: FEMI ADEYEMI, 19. LAST SEEN IN A BLACK BENZ GLE."),
          N("Chairman tells the police Femi “went to see family.” Kaycee transfers to a school in Ghana."),
          N("Some cases go cold. This one goes cold fast."),
          N("Ikorodu Market. Three years later. Mama still keeps a photo of you taped beside the pepper. Every customer who asks, she tells them:"),
          S("mama", "My son is an engineer. He will come back.", "My pikin na engineer. E go come back."),
        ],
      },
    },

    endings: {
      founder: { title: "The Founder", tone: "good", blurb: "Slow, legit, and real. It took twelve years.", real: "Most success stories that look overnight took a decade of boring, honest work. The shortcut is the long way." },
      standing: { title: "Still Standing", tone: "mid", blurb: "Not the dream. But free.", real: "An ordinary life you can walk around in freely is worth more than a big one you have to hide." },
      expelled: { title: "Expelled", tone: "bad", blurb: "Caught writing someone else’s exam.", real: "Exam malpractice and impersonation carry expulsion and possible prosecution. The rich kid usually has a way out. You might not." },
      trial: { title: "Awaiting Trial", tone: "bad", blurb: "Eleven years. No verdict.", real: "Many people in Nigerian custodial centres are awaiting trial, some for years. Being in the wrong place, or in the wrong group chat, is enough to start that clock." },
      burnout: { title: "Burnout", tone: "bad", blurb: "He survived. His body keeps the score.", real: "Hustle culture celebrates no sleep. Long-term stress is hard on the body. Rest is not laziness. Asking for help is not weakness." },
      missing: { title: "Missing", tone: "bad", blurb: "Some doors don’t open back.", real: "Ritual-related “yahoo plus” is real, and the people who promise you the money are not your friends. If you are being pulled in, tell someone you trust today." },
    },
  };
})();
