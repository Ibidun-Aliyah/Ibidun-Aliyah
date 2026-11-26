/*
  LAGOS LIVES — the "world" layer around each story:
    map       where each chapter sits on the Lagos map
    explore   the hidden-item scene played before each chapter (items: icon, name, the story note it reveals)
    profiles  people cards; each fact unlocks once the player has visited the named scene
  Also draws the Lagos map itself: LL_ART.lagosMap().
*/
(function () {
  const ST = (window.LAGOS_STAGE = window.LAGOS_STAGE || {});
  const it = (icon, name, note) => ({ icon, name, note });

  /* ───────────── FEMI ───────────── */
  Object.assign(ST.femi, {
    map: {
      pro: { x: 330, y: 112, label: "Ikorodu Market" },
      c1: { x: 292, y: 168, label: "FUTIK · Block C" },
      c2: { x: 140, y: 190, label: "Chairman’s Estate" },
      c3: { x: 238, y: 214, label: "FUTIK · Hall B" },
      c4: { x: 312, y: 420, label: "Lekki" },
      c5: { x: 214, y: 104, label: "The Office" },
    },
    explore: {
      pro: { place: "market", title: "Mama’s stall", items: [
        it("pepper", "Basket of pepper", "Half of it will spoil before Friday. It always does."),
        it("naira", "Folded naira", "₦15,000, tied in the corner of Mama’s wrapper. Everything she has this week."),
        it("letter", "School letter", "Kemi’s fees: OWING. Mama hid it under the tomatoes."),
        it("photo", "Baba’s photo", "Baba, smiling, at the stall. Taken two years before he died."),
        it("ticket", "Danfo ticket", "Ikorodu → FUTIK. One way."),
      ] },
      c1: { place: "hostel", title: "Room 14, Block C", items: [
        it("phone_cracked", "Cracked Tecno", "The crack runs right through the WhatsApp icon. Fitting."),
        it("iphone_box", "iPhone box", "Kaycee’s. He left it on your bunk on purpose. You’re sure of it."),
        it("extension", "Extension box", "One socket. Six boys. Daily war."),
        it("betslip", "Betting slip", "Arsenal, Madrid, Napoli. Kaycee’s handwriting: ‘SURE BANKER!!’"),
        it("bucket", "Blue bucket", "Your bathing water. Fetched at 5am, before the queue."),
      ] },
      c2: { place: "office", title: "Chairman’s ‘office’", items: [
        it("ringlight", "Ring light", "For ‘video calls’ with clients who think they’re talking to a nurse in Texas."),
        it("script", "Printed script", "‘Hello dear, my name is Jennifer.’ Laminated. Used a lot."),
        it("laptop", "Laptop", "Five VPNs. Twelve open chats. None of them honest."),
        it("carkey", "Benz key", "The GLE. Nobody knows how Chairman paid for it. Everybody knows."),
        it("envelope", "Golden Tree envelope", "GOLDEN TREE VENTURES. A company with no office and a lot of money."),
      ] },
      c3: { place: "hostelnight", title: "Night before the exam", items: [
        it("handout", "Thermo handout", "Barely touched. The spine isn’t even cracked."),
        it("expo", "‘Expo’ paper", "₦5k. ‘Straight from inside.’ Nothing is straight from inside."),
        it("sachet", "Nescafé sachets", "Dele’s. He always brings two, one for you."),
        it("examcard", "Exam card", "Your face. Your name. Hall B, 9am."),
        it("calculator", "Calculator", "Borrowed. The 7 key sticks."),
      ] },
      c4: (run) => run.flags.yahoo
        ? { place: "party", title: "Soft life", items: [
            it("iphone_box", "New iPhone", "Yours now. You kept the box on your shelf like a trophy."),
            it("sunglasses", "Designer shades", "₦180k. You wear them indoors now."),
            it("cup", "Red cup", "Lola’s friend handed it to you. ‘For the big boy.’"),
            it("naira", "Bundle of cash", "₦400k ‘bonus’. Someone in Texas lost their savings for this."),
            it("photo", "Party photo", "You, Lola, Chairman. Everyone’s smiling. Nobody’s looking at the camera."),
          ] }
        : run.flags.nominated
        ? { place: "workshop", title: "The workshop", items: [
            it("solar", "Solar panel", "Scrap from the mechanic village. Cleaned it with your own hands."),
            it("wrench", "Wrench", "Dele’s dad’s. He made you swear you’d bring it back."),
            it("blueprint", "Cold box sketch", "Version 1. Mama’s pepper deserves better."),
            it("pepper", "Spoiled pepper", "Mama threw these away last week. Your test sample."),
            it("phone_cracked", "Dead Tecno", "It finally gave up. You understand the feeling."),
          ] }
        : { place: "faculty", title: "Results week", items: [
            it("letter", "Result slip", "Thermodynamics: C. No nomination."),
            it("betslip", "Old betting slip", "Kaycee’s ‘sure banker’. Still in your pocket."),
            it("naira", "Last ₦2,000", "Transport money. Or food money. Not both."),
            it("carkey", "Benz key", "Chairman left it on your desk. He didn’t say anything. He didn’t need to."),
            it("ticket", "Danfo ticket", "Home to Ikorodu. You keep not using it."),
          ] },
      c5: (run) => run.flags.baba
        ? { place: "bush", title: "The road to Ijebu", items: [
            it("redcloth", "Red cloth", "Tied to a tree at the start of the path. A marker."),
            it("cowrie", "Cowrie shells", "Scattered on the ground. Someone has walked this path before you."),
            it("candle", "Candle stub", "Still warm."),
            it("phone_cracked", "Your phone", "No network. One grey tick."),
            it("ticket", "Bus ticket", "Ikorodu → Ijebu-Ode. Chairman paid."),
          ] }
        : { place: "hostelnight", title: "Friday night", items: [
            it("flyer", "Party flyer", "Chairman’s 24th. ‘Pull up.’ Half of 300 Level is going."),
            it("phone_cracked", "Lola’s story", "A ring light, a cake. She’s already there."),
            it("newspaper", "Yesterday’s paper", "‘EFCC intensifies crackdown on internet fraud.’ Page 4."),
            it("blueprint", "Cold box sketch", "Monday’s finals. Or Friday’s party."),
            it("letter", "Dele’s note", "Taped to the door: ‘Don’t go. – D’"),
          ] },
    },
    profiles: {
      femi: { role: "The First Son", facts: [[null, "19. 200 Level Mechanical Engineering, FUTIK."], [null, "First in his family to go to university."], ["c1_hostel", "Needs ₦150,000 he doesn’t have."], ["c3_office", "Dr. Nwosu thinks he’s brilliant but undisciplined."]] },
      mama: { role: "Pepper seller, Ikorodu Market", facts: [[null, "Widowed. Raised three children on one stall."], ["p_park", "Gives Femi money she doesn’t have."], ["c1_r_mama", "Borrows from the cooperative to cover fees."]] },
      kemi: { role: "Femi’s sister, SS2", facts: [[null, "Wants an iPhone when Femi ‘makes it’."], ["c1_hostel", "Sent home from school over unpaid fees."]] },
      dele: { role: "Best friend since JSS1", facts: [[null, "Broke, calm, brutally honest."], ["c1_offers", "Found Femi a clean job at the cyber café."], ["c2_dele", "Warned Femi about Chairman in front of everyone."]] },
      kaycee: { role: "Roommate, hype man", facts: [[null, "Always has a ‘sure banker’."], ["c2_ponzi", "Promotes Double Gain Investment."], ["c4_soft", "Lost ₦600k when Double Gain vanished."]] },
      chairman: { role: "300 Level. Nobody knows his department.", facts: [[null, "Drives a black Benz GLE."], ["c2_office", "Runs a yahoo operation from a duplex."], ["c4_baba_offer", "Wants to go ‘to the next level’."]] },
      lola: { role: "200 Level Architecture", facts: [[null, "Way out of Femi’s league. She knows it."], ["c4_soft", "Notices Femi once he has money."], ["c4_grind", "Notices Femi when he builds something real."]] },
      dami: { role: "Rich kid, 200 Level", facts: [[null, "Pays other students to do his work."], ["c3_expo", "Offered ₦50k for someone to sit his exam."]] },
      nwosu: { role: "Thermodynamics lecturer", facts: [[null, "Thirty years teaching. Has never smiled in a lecture."], ["c3_office", "‘Brilliance is common. Discipline is rare.’"]] },
      okon: { role: "Okon Cyber Café", facts: [[null, "Pays ₦8,000 a week. Free phone charging."]] },
      baba: { role: "The man in Ijebu", facts: [[null, "Doesn’t look at Femi. Looks at Chairman."]] },
    },
  });

  /* ───────────── DAMI ───────────── */
  Object.assign(ST.dami, {
    map: {
      pro: { x: 196, y: 388, label: "Banana Island" },
      c1: { x: 318, y: 426, label: "Lekki Rooftop" },
      c2: { x: 262, y: 350, label: "The Guest Wing" },
      c3: { x: 286, y: 170, label: "FUTIK" },
      c4: { x: 150, y: 300, label: "Third Mainland" },
      c5: { x: 128, y: 426, label: "Daddy’s Study" },
    },
    explore: {
      pro: { place: "mansion", title: "The living room", items: [
        it("remote", "TV remote", "The TV is always on Daddy’s campaign. Nobody changes it."),
        it("postcard", "Postcard from Dubai", "‘Miss you! – Mummy’. Unsigned. Her assistant wrote it."),
        it("photo", "Family photo", "Five people, 2015. The last time all of them were in one room."),
        it("plate", "Cold jollof", "Aunty Nkechi made it at 7pm. It’s 9:40."),
        it("gamepad", "Game controller", "₦250k setup. Played alone."),
      ] },
      c1: { place: "party", title: "The rooftop", items: [
        it("cup", "Red cup", "Kunle’s third. Your tab."),
        it("pill", "Pink pill", "A smiley face pressed into it. Like it’s a joke."),
        it("receipt", "Bar receipt", "₦1.2 million. Kunle’s cousin’s birthday. Your card."),
        it("handbag", "Halita’s bag", "The one you bought her. She told her followers it was a gift from ‘a brand’."),
        it("carkey", "G-Wagon key", "Parked across two spaces. Nobody said anything."),
      ] },
      c2: { place: "mansion", title: "Campaign season", items: [
        it("poster", "Campaign poster", "‘A FATHER TO ALL.’ Printed 50,000 times."),
        it("suitcase", "Gbenga’s suitcase", "In the guest wing. He unpacked like he was staying forever."),
        it("bottle", "Whisky bottle", "Daddy’s. Gbenga keeps refilling his glass from it."),
        it("lock", "Bedroom lock", "Aunty Nkechi: ‘Lock your door at night.’ It sticks."),
        it("photo", "Old photo", "Daddy and Gbenga as boys in Ijebu. Daddy’s arm around him."),
      ] },
      c3: { place: "bedroom", title: "Results week", items: [
        it("probation", "Probation letter", "CGPA 1.48. ACADEMIC PROBATION."),
        it("examcard", "Exam card", "Your face. Somebody else could hold it."),
        it("envelope", "Fat envelope", "₦1 million in cash. In case."),
        it("handout", "Fluid Mechanics notes", "Never opened. Still in the plastic."),
        it("energy", "Energy drinks", "Seven empty cans. Three hours of actual reading."),
      ] },
      c4: { place: "club", title: "Victoria Island, 1am", items: [
        it("sparkler", "Bottle with sparkler", "Your fourth one. The DJ said your name."),
        it("pills", "Kunle’s guy’s pills", "‘Real stuff.’ No smiley faces on these ones."),
        it("phone_cracked", "Your phone", "Six missed calls. All from Aunty Nkechi."),
        it("sunglasses", "Sunglasses", "Indoors. At night."),
        it("carkey", "G-Wagon key", "You’re holding it already."),
      ] },
      c5: { place: "bedroom", title: "Nine days to the election", items: [
        it("ziplock", "Zip-lock bag", "Three pills left. You keep looking at it."),
        it("card", "Frozen card", "Declined. Declined. Declined."),
        it("phone_cracked", "Unknown number", "‘₦20 million. Before the election.’"),
        it("bag", "Half-packed bag", "You started packing. You don’t know where to."),
        it("soup", "Pepper soup", "Aunty Nkechi left it outside your door. Still warm."),
      ] },
    },
    profiles: {
      dami: { role: "The Last Born", facts: [[null, "19. 200 Level, FUTIK. Son of Senator Ogunleye."], [null, "Unlimited money. Nobody home."], ["c2_night", "Carrying something he hasn’t told anyone."], ["c4_skido", "It isn’t ‘just weekends’ anymore."]] },
      nkechi: { role: "House help, since Dami was six", facts: [[null, "Knows Dami hates onions. His mother doesn’t."], ["c2_gbenga", "Didn’t trust Uncle Gbenga from day one."], ["c4_party", "Calls every time he goes out at night."]] },
      mummy: { role: "Lives in Dubai", facts: [[null, "Calls when she remembers."], ["c2_mummy", "Chose the campaign over listening to her son."]] },
      senator: { role: "Senator Babatunde Ogunleye", facts: [[null, "Running for governor. ‘A father to all.’"], ["c3_fail", "Communicates mostly through his PA."], ["c5_collide", "Two children in rehab. Terrified of a third."]] },
      tolu: { role: "Eldest sister, London", facts: [[null, "In rehab. Reminds Dami he’s ‘the normal one’."]] },
      seun: { role: "Brother, Houston", facts: [[null, "In rehab. Jokes about the pool."]] },
      kunle: { role: "‘Best friend’", facts: [[null, "Has never paid for a meal."], ["c1_party", "Introduced Dami to Molly."], ["c4_skido", "Knows a guy with ‘real stuff’."]] },
      halita: { role: "Girlfriend. Abuja.", facts: [[null, "3 million followers."], ["c1_halita", "Says ‘I love you’ next to account numbers."]] },
      skido: { role: "Dealer, ‘big brother’", facts: [[null, "‘Take half. Drink water.’"], ["c4_skido", "Has been watering down Dami’s doses all along."]] },
      gbenga: { role: "Daddy’s cousin from Ijebu", facts: [[null, "Daddy ‘picked him up when he had nothing’."], ["c2_blackmail", "Blackmailing Dami."]] },
      femi: { role: "The broke genius", facts: [[null, "Does Dami’s assignments for cash."], ["c3_caught", "Got caught writing Dami’s exam."]] },
    },
  });

  /* ───────────── THE MAP ───────────── */
  function lagosMap() {
    return `<svg class="lagosmap" viewBox="0 0 400 560" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs><pattern id="mapdots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#000" opacity=".06"/></pattern>
      <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a9ac8"/><stop offset="1" stop-color="#1f6f9a"/></linearGradient></defs>
      <rect width="400" height="560" fill="#5ab0d8"/>
      <path d="M0 0 L400 0 L400 60 Q330 70 300 120 Q260 160 200 140 Q170 150 170 200 L168 400 Q120 420 0 410Z" fill="#f2deb0" stroke="#141414" stroke-width="3"/>
      <path d="M262 30 Q330 20 400 40 L400 210 Q340 220 300 190 Q270 170 262 120Z" fill="#ead29a" stroke="#141414" stroke-width="3"/>
      <path d="M110 392 Q160 380 210 392 Q240 400 230 428 Q180 446 120 436 Q96 420 110 392Z" fill="#f2deb0" stroke="#141414" stroke-width="3"/>
      <ellipse cx="200" cy="380" rx="18" ry="9" fill="#bfe3a0" stroke="#141414" stroke-width="2.4"/>
      <path d="M220 418 Q300 400 400 390 L400 450 Q300 456 220 448Z" fill="#f2deb0" stroke="#141414" stroke-width="3"/>
      <rect x="0" y="462" width="400" height="98" fill="url(#sea)"/><path d="M0 462 Q100 452 200 460 Q300 468 400 456" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>
      <rect width="400" height="560" fill="url(#mapdots)"/>
      <path d="M150 200 Q140 260 150 320 Q156 360 150 392" stroke="#141414" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M150 200 Q140 260 150 320 Q156 360 150 392" stroke="#f4f1e6" stroke-width="5" fill="none" stroke-dasharray="8 6" stroke-linecap="round"/>
      <path d="M30 120 Q90 150 140 160 Q220 170 300 150" stroke="#d6b26a" stroke-width="5" fill="none"/><path d="M60 300 Q100 260 150 240" stroke="#d6b26a" stroke-width="4" fill="none"/>
      ${[[70, 260, "YABA"], [60, 140, "MAINLAND"], [330, 70, "IKORODU"], [150, 430, "IKOYI"], [330, 438, "LEKKI"], [200, 510, "ATLANTIC OCEAN"], [250, 300, "LAGOS LAGOON"]].map(([x, y, t]) => `<text x="${x}" y="${y}" font-family="'Lilita One', 'Arial Black', sans-serif" font-size="${t.length > 12 ? 13 : 14}" fill="${y > 290 && x > 200 && y < 400 || y > 480 ? "#ffffff" : "#5a4524"}" text-anchor="middle" letter-spacing="1.5" opacity=".75">${t}</text>`).join("")}
      <text x="128" y="296" font-family="'Lilita One', sans-serif" font-size="10" fill="#141414" transform="rotate(-84 128 296)" opacity=".7">3RD MAINLAND BRIDGE</text>
      <g transform="translate(372 24)"><path d="M-10 0 L10 0 L4 -6 M10 0 L4 6" stroke="#141414" stroke-width="3" fill="none"/></g><text x="352" y="44" font-family="'Lilita One', sans-serif" font-size="10" fill="#5a4524" text-anchor="end">to Ijebu-Ode</text>
      ${Array.from({ length: 14 }, (_, i) => `<path d="M${30 + (i * 53) % 340} ${490 + (i * 17) % 50} q6 -4 12 0" stroke="#fff" stroke-width="2" fill="none" opacity=".5"/>`).join("")}
    </svg>`;
  }
  window.LL_ART = Object.assign(window.LL_ART || {}, { lagosMap });
})();
