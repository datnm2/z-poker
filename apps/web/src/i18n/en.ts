export const en = {
  // Common
  loading: "Loading...",
  back: "Back",
  cancel: "Cancel",
  save: "Save",
  close: "Close",
  "error.loadFailed": "Couldn't load data",
  "error.loadFailedHint": "Check your connection and try again.",
  "error.retry": "Try again",
  "error.unauthorized": "Your session has expired",
  "error.unauthorizedHint": "Please sign in again to continue.",
  "error.goToLogin": "Sign in again",

  // Login
  "login.tagline": "Office Poker Elo Tracker",
  "login.signInGoogle": "Sign in with Google",
  "login.domainHint": "Players are grouped by email domain",
  "login.valueDomain": "Grouped by your company email",
  "login.valueRealtime": "Elo updates right after each game",
  "login.valueTiers": "6 tiers from Fish to Poker God",
  "login.backToLanding": "← Back to home",

  // Landing (logged-out home)
  "landing.headline": "Lunch-break poker, with real Elo.",
  "landing.subhead":
    "You've got 30–45 minutes. Games end when lunch ends — and that's fine. Every session moves your Elo; real skill shows over many lunches.",
  "landing.ctaPrimary": "Sign in to play",
  "landing.ctaGuide": "How it works",
  "landing.domainPill": "Isolated per company (email domain)",
  "landing.whyTitle": "Why Z-Poker?",
  "landing.why1.title": "Built for lunch breaks",
  "landing.why1.body":
    "A \"real\" poker game runs for hours. You've got 30–45 minutes. Z-Poker scores you on chip counts when time runs out — no need to play to the last person standing.",
  "landing.why2.title": "Long-term tracking",
  "landing.why2.body":
    "Every lunch is a session. Elo compounds across months. True skill shows over many games — not one lucky day.",
  "landing.why3.title": "Just your coworkers",
  "landing.why3.body":
    "Auto-grouped by your email domain — you only see your company's leaderboard. No strangers mixed in.",
  "landing.previewTitle": "Your group's leaderboard will look like this",
  "landing.previewDemo": "Demo — sign in to see your real group",
  "landing.tiersTitle": "6 ranks. Where do you stand?",
  "landing.howTitle": "How it works",
  "landing.how1": "Start a lunch session, set the buy-in",
  "landing.how2": "Time's up? Enter your remaining chips",
  "landing.how3": "Lock the session → Elo stacks up over time",
  "landing.footerCta": "Ready to climb?",
  "landing.funPill": "🎉 Just for fun — no real money",
  "landing.disclaimerTitle": "For fun, not gambling",
  "landing.disclaimerBody":
    "Z-Poker uses virtual chips to track Elo and add some fun to lunch breaks. No real money, not gambling, no betting encouraged. Any cash settlement between players is outside the app's scope.",

  // Nav
  "nav.leaderboard": "Leaderboard",
  "nav.play": "Play",
  "nav.profile": "Profile",
  "nav.guide": "Guide",

  // Play page
  "play.title": "Play",
  "play.slogan": "Join an open session or start a new one.",
  "play.emptyTitle": "No sessions are open right now",
  "play.emptySubtitle": "Start a new session to get going.",

  // Leaderboard
  "leaderboard.resetIn": "Leaderboard resets quarterly (",
  "leaderboard.resetInSuffix": " left)",
  "leaderboard.title": "Leaderboard",
  "leaderboard.slogan": "Outlast. Outchip. Outrank.",
  "leaderboard.players": "Total Players",
  "leaderboard.you": "You",
  "leaderboard.totalGames": "Total Sessions Played",
  "leaderboard.newSession": "+ New Session",
  "leaderboard.activeSessions": "Active Sessions",
  "leaderboard.buyInLabel": "Buy-in",
  "leaderboard.create": "Create",
  "leaderboard.modePhysical": "Physical Cards",
  "leaderboard.modePhysicalDesc": "Play with real cards, track Elo here",
  "leaderboard.modeOnline": "Online Cards",
  "leaderboard.modeOnlineDesc": "Coming soon",
  "leaderboard.games": "games played",
  "leaderboard.game": "game played",
  "leaderboard.signInPrompt": "Sign in to see the leaderboard and join sessions.",
  "leaderboard.signInBtn": "Sign in",
  "leaderboard.streakHot": "Hot Streak",
  "leaderboard.streakCold": "Tilting Hard",
  "leaderboard.recentForm": "Recent form",
  "leaderboard.tierCount": "%d players",
  "leaderboard.tierEmpty": "not yet appeared",
  "leaderboard.colPlayer": "Other Players",
  "leaderboard.colElo": "Elo",
  "leaderboard.eloTooltip": "Elo rating — gain or lose points each session based on chip results",

  // Session
  "session.title": "Session",
  "session.locked": "Locked",
  "session.open": "Open",
  "session.chips": "Chips remaining",
  "session.chipsPlaceholder": "Final chips",
  "session.edit": "Edit",
  "session.stakes": "Elo on the line",
  "session.avgElo": "Table avg",
  "session.maxGain": "Max gain",
  "session.maxLoss": "Max loss",
  "session.chipsEntered": "Chips entered",
  "session.remainingToAccount": "Remaining",
  "session.playersConfirmed": "Players confirmed",
  "session.readyToLock": "Ready to lock",
  "session.offBy": "off by",
  "session.cheatWarning": "🚨 Someone's hiding chips! Total is short by",
  "session.extraWarning": "⚠️ Extra chips detected! Total is over by",
  "session.lockErrorNotReady": "Not all players have confirmed their chips yet.",
  "session.lockErrorInvalid": "Chip total doesn't match. Fix the numbers first.",
  "session.joinSession": "Join Session",
  "session.joined": "Joined",
  "session.playersCount": "players",
  "session.lockCalculate": "Lock & Calculate Elo",
  "session.calculating": "Calculating...",
  "session.mcPicker.label": "Recap MC",
  "session.mcPicker.random": "Random",
  "session.mcPicker.randomHint": "Let the system pick a fun MC for you.",
  "session.elo": "Elo",
  "session.buyIn": "Buy-in",
  "session.createdBy": "Host",
  "session.host": "Host",
  "session.waitingForHost": "Waiting for host to finalize...",
  "session.allChipsReady": "Chips confirmed — waiting for host to lock",
  "session.hype1": "Who climbed? Who crashed? Elo reveal incoming...",
  "session.hype2": "The table has spoken. Results are almost in.",
  "session.hype3": "Shark or Fish tonight? You'll know in a moment.",
  "session.hype4": "Your Elo is about to move. Nervous?",
  "session.hype5": "Stacks counted. Ranks shifting. Hold tight.",
  "session.hype6": "Did you dominate or donate? Almost time to find out.",
  "session.confirmed": "Confirmed",
  "session.confirm": "Confirm",
  "session.results": "Results",
  "session.rankedUp": "Ranked up to",
  "session.rankedDown": "Dropped to",
  "session.streakIncluded.win": "incl. {bonus} win streak bonus",
  "session.streakIncluded.loss": "incl. {bonus} cold streak penalty",
  "session.rank": "Rank",
  "session.dealer": "Dealer",
  "session.dealerHint": "Or stay as Dealer — you can edit chips & lock without joining",
  "session.fighters": "Fighters",
  "session.sortedByElo": "sorted by Elo",
  "session.joinHype": "Jump in — your Elo is on the line. Show them who's boss.",
  "session.highlights.title": "🎬 Session highlights",
  "session.highlights.cta": "Has the tea — tap to see the drama",
  "session.highlights.loading": "Reading the historical data...",
  "session.highlights.loadingHint": "Cooking up the drama, give it a sec",
  "session.highlights.hostedBy": "By",
  "session.highlights.regenerate": "Retry",

  // Profile
  "profile.editName": "Edit name",
  "profile.saveName": "Save",
  "profile.namePlaceholder": "Your display name",
  "profile.winRate": "Win Rate",
  "profile.rank": "Rank",
  "profile.eloHistory": "Elo History",
  "profile.recentSessions": "Recent Sessions",
  "profile.signOut": "Sign Out",
  "profile.peak": "Peak",
  "profile.lowest": "Low",
  "profile.rankProgress": "Rank progress",
  "profile.resultWin": "Won",
  "profile.resultLose": "Lost",
  "profile.resultBroke": "Busted",
  "profile.resultBreakeven": "Even",

  // Guide
  "guide.title": "How to Play",
  "guide.signInPrompt": "Sign in to track your Elo and join sessions.",
  "guide.signInBtn": "Sign in",
  "guide.howToPlay.title": "How to Play",
  "guide.howToPlay.intro":
    "Z-Poker helps your office track poker sessions and rank players using the Elo rating system.",
  "guide.howToPlay.step1.title": "1. Create a session",
  "guide.howToPlay.step1.body":
    'From the leaderboard, tap "+ New Session", choose a game mode (Physical Cards or Online — more coming), set the buy-in (default: 100 chips), then tap Create. Multiple sessions can be open at the same time.',
  "guide.howToPlay.step2.title": "2. Join the session",
  "guide.howToPlay.step2.body":
    'Players join by tapping an active session on the leaderboard and pressing "Join Session". The host (creator) can choose to play as a Dealer — they get full control without using a seat.',
  "guide.howToPlay.step3.title": "3. Count your chips",
  "guide.howToPlay.step3.body":
    "When the game ends, each player enters their own remaining chips and confirms. The host can edit chips for everyone and see a live progress bar showing how many players have confirmed.",
  "guide.howToPlay.step4.title": "4. Lock & calculate",
  "guide.howToPlay.step4.body":
    'Only the host can lock the session. Once the chip progress bar turns green (total matches buy-in × players), the "Lock & Calculate Elo" button activates. Tapping it finalizes the session and immediately updates everyone\'s Elo.',

  "guide.bestPractices.title": "Tips to Play Right",
  "guide.bestPractices.item1.title": "Count chips carefully",
  "guide.bestPractices.item1.body":
    "The session can only be locked when the total matches exactly. The chip bar turns green when the numbers are correct.",
  "guide.bestPractices.item2.title": "Lock before leaving",
  "guide.bestPractices.item2.body":
    "The session creator should lock the session right after the game ends. Locking instantly calculates and records Elo for all participants.",
  "guide.bestPractices.item3.title": "Play with the same crew",
  "guide.bestPractices.item3.body":
    "Elo is most meaningful when the same group plays together regularly. Occasional guests can skew ratings.",
  "guide.bestPractices.item4.title": "Report chips honestly",
  "guide.bestPractices.item4.body":
    "The system only works if everyone reports accurate chip counts. Agree on chip totals before entering them.",

  "guide.roles.title": "Roles",
  "guide.roles.intro": "Z-Poker has two roles in a session: Player and Dealer (Host).",
  "guide.roles.player.title": "🃏 Player",
  "guide.roles.player.body":
    "Joins the session and takes a seat. Enters their own chip count after the game. Elo is updated when the session is locked.",
  "guide.roles.dealer.title": "🎟️ Dealer / Host",
  "guide.roles.dealer.body":
    "The session creator. Can choose to play as a Dealer — standing outside the game to manage it. As Dealer, you can edit chip counts for all players and lock the session without occupying a seat. Your Elo is not affected.",
  "guide.roles.gameMode.title": "🃏 Physical vs 💻 Online",
  "guide.roles.gameMode.body":
    "Physical Cards: you play with real cards at the table and use Z-Poker only to track chips and Elo. Online mode is coming soon — it will integrate directly with online poker platforms.",

  "guide.elo.title": "The Elo System",
  "guide.elo.intro":
    "Elo is a rating system originally designed for chess. It measures relative skill between players — your rating goes up when you beat stronger players and down when you lose to weaker ones.",
  "guide.elo.starting.title": "Starting rating",
  "guide.elo.starting.body":
    "Every new player starts at 1200 Elo. This is the baseline — everyone is considered equal until they play.",
  "guide.elo.howWorks.title": "How ratings change",
  "guide.elo.howWorks.body":
    "After each session, Z-Poker compares your current Elo against the table average. Performance is measured by chips_end vs buy_in — above buy-in is positive, below is negative. Every chip-winner is guaranteed at least +5 Elo (a +2 raw floor plus a +3 flat bonus) to reward volume — playing regularly slowly lifts your rank.",
  "guide.elo.kfactor.title": "Asymmetric K-factor",
  "guide.elo.kfactor.body":
    "K=70 for chip-winners, K_LOSS=50 for losers (≈30% softer to stop high-rated players from over-braking themselves). Both scale by N/2 so big tables swing harder — 2-player winner swings up to ±70, 6-player up to ±210. Winners also get a +3 flat bonus on top, so the pool's overall Elo drifts upward over time (mild inflation by design).",
  "guide.elo.formula.title": "Full formula",
  "guide.elo.formula.body":
    "Expected: 1 / (1 + 10^((avg_elo − your_elo) / 700)). The 700 (relaxed from Arpad's 400) flattens the curve so high-rated players still score on small wins. Actual: 0.5 + 0.5 × (chips_end − buy_in) / (buy_in × (N − 1)). Raw = round(K × N/2 × (actual − expected)) — K=70 if you won chips, K=50 if you lost. Winner: change = max(raw, 2) + 3. Loser: change = min(raw, 0). Streak bonus is added once you hit 3 in a row.",
  "guide.elo.streak.title": "Win/loss streak bonus",
  "guide.elo.streak.body":
    "After 3 sessions with the same outcome, a bonus kicks in. Win streak = streak × 2 (3→+6, 4→+8, 5→+10, unbounded) — rewards being on a heater. Loss streak grows step 1 then caps at −5 (3→−3, 4→−4, 5→−5, 6→−5...) — punishes losing slumps without spiraling. A tie (chips = buy-in) resets the streak to 0.",
  "guide.elo.example.title": "Concrete example",
  "guide.elo.example.body":
    "6-player table, buy-in 100. You're 1300 Elo, table avg 1200, you finish 180 chips (+80). Expected = 1/(1+10^(-100/700)) = 0.582. Actual = 0.5 + 0.5×80/500 = 0.58. Raw = round(70 × 3 × (0.58 − 0.582)) = 0. As a winner: max(0, 2) + 3 = +5 Elo. On a 3-game win streak: +5 + 6 = +11 Elo. Upset case: 1000 Elo player at avg-1300 table sweeps the full pot (600 chips) → expected 0.272, actual 1.0, raw = round(70 × 3 × 0.728) = +153 → +156 Elo with the bonus.",

  "guide.strategy.title": "Level Up Your Elo",
  "guide.strategy.intro":
    "Z-Poker Elo is driven by chip counts — your final chips vs buy-in is your score. These strategies help you end up with more chips consistently.",
  "guide.strategy.chip1.title": "Protect your stack early",
  "guide.strategy.chip1.body":
    "Elo rewards finishing above buy-in. Avoid big coin-flip pots in the early game. A small, steady gain beats a wild all-in that leaves you short.",
  "guide.strategy.chip2.title": "Beat a high-Elo table",
  "guide.strategy.chip2.body":
    "Your expected score is calculated against the group average Elo. Sitting at a table with high-Elo players is scary, but winning there earns you far more points than winning against a weaker group.",
  "guide.strategy.chip3.title": "Position is everything",
  "guide.strategy.chip3.body":
    "Act last whenever possible. Being in position lets you control pot size, bluff more effectively, and extract max value from strong hands — all of which grow your chip count.",
  "guide.strategy.chip4.title": "Avoid marginal all-ins",
  "guide.strategy.chip4.body":
    "A 55/45 edge in a pot that comprises your whole stack is a bad Elo trade. You risk a big negative delta for a small positive one. Fold equity and chip accumulation beat gambling.",
  "guide.strategy.chip5.title": "Bluff with a plan",
  "guide.strategy.chip5.body":
    "Bluffs work best on dry boards, against single opponents, and when you represent a credible hand. Pure bluffs in multi-way pots leak chips over time — and chip leakage directly tanks your Elo.",

  "guide.poker101.title": "Poker 101 — Hand rankings",
  "guide.poker101.intro":
    "Texas Hold'em hands ranked strongest to weakest. Probabilities show how often you make each hand from 7 cards (2 hole cards + 5 community).",
  "guide.poker101.hand1.title": "1. Royal Flush — 0.003%",
  "guide.poker101.hand1.body":
    "A♠ K♠ Q♠ J♠ 10♠ — Ace-high straight flush. The best possible hand. Absolutely unbeatable.",
  "guide.poker101.hand2.title": "2. Straight Flush — 0.028%",
  "guide.poker101.hand2.body":
    "Five consecutive cards of the same suit (e.g. 7♥ 8♥ 9♥ 10♥ J♥). Beats everything except a higher straight flush.",
  "guide.poker101.hand3.title": "3. Four of a Kind — 0.17%",
  "guide.poker101.hand3.body":
    "Four cards of the same rank (e.g. K♠ K♥ K♦ K♣). Also called quads. Extremely rare — almost always wins the pot.",
  "guide.poker101.hand4.title": "4. Full House — 2.6%",
  "guide.poker101.hand4.body":
    "Three of a kind + one pair (e.g. Q♠ Q♥ Q♦ 9♠ 9♥). Ranked by the three-of-a-kind first. Very strong and hard to fold.",
  "guide.poker101.hand5.title": "5. Flush — 3.0%",
  "guide.poker101.hand5.body":
    "Any five cards of the same suit (e.g. 2♣ 7♣ J♣ Q♣ A♣). Ranked by highest card. Watch the board for three-of-a-suit.",
  "guide.poker101.hand6.title": "6. Straight — 4.6%",
  "guide.poker101.hand6.body":
    "Five consecutive cards of any suits (e.g. 5♠ 6♥ 7♣ 8♦ 9♠). Ace can be high (A-K-Q-J-10) or low (A-2-3-4-5).",
  "guide.poker101.hand7.title": "7. Three of a Kind — 4.8%",
  "guide.poker101.hand7.body":
    "Three cards of the same rank (e.g. J♠ J♥ J♦). Called 'trips' with one hole card, 'set' with two hole cards. Sets are well-disguised and very strong.",
  "guide.poker101.hand8.title": "8. Two Pair — 23.5%",
  "guide.poker101.hand8.body":
    "Two different pairs (e.g. A♠ A♥ 8♣ 8♦ K♠). Ranked by highest pair, then second pair, then kicker. Common — don't over-commit.",
  "guide.poker101.hand9.title": "9. One Pair — 43.8%",
  "guide.poker101.hand9.body":
    "Two cards of the same rank (e.g. K♠ K♣). Most frequently made hand. Strength depends heavily on the kicker and board texture.",
  "guide.poker101.hand10.title": "10. High Card — 17.4%",
  "guide.poker101.hand10.body":
    "No combination at all. Highest single card plays. Can still win if all opponents also miss — pay attention to who's bluffing.",

  "guide.elo.tiers.title": "Rank tiers",
  "rank.division": "Rank",
  "rank.eloToNext": "to next tier",
  "rank.toNextRank": "{n} elo to reach",
  "rank.toNextDiv": "{n} elo to reach {stars}",

  // Elo Tiers
  "rank.godlike": "Poker God! King Of Poker!",
  "rank.predator": "Predator",
  "rank.veteran": "Veteran",
  "rank.novice": "Novice",
  "rank.rookie": "Rookie",
  "rank.fish": "Fish",


  // Session Titles (short-term)
  "game.dominator": "Dominator",
  "game.tableBoss": "Table Boss",
  "game.profitHunter": "Profit Hunter",
  "game.survivor": "Survivor",
  "game.bleeder": "Bleeder",
  "game.sponsor": "Sponsor",

  // Session History page
  "sessions.history.title": "All Sessions In Domain",
  "sessions.history.empty": "No locked sessions yet.",
  "sessions.history.players": "players",
  "sessions.history.loading": "Loading…",
  "sessions.history.buyIn": "Buy-in",
  "sessions.history.dealer": "Dealer",
  "sessions.history.topWinner": "Top winner",
  "sessions.history.chips": "chips",

  // Footer
  "footer.poweredBy": "Powered by",
  "footer.brand": "Dat Light Solution",
  "footer.visitSite": "Visit dat09vn.com",

  // Loading
  "loading.tips": [
    "Patience is the key — wait for good cards and good position",
    "Folding often isn't weakness, it's protecting your stack",
    "Later position = more advantage — you see more before deciding",
    "Observing how opponents play matters more than your cards",
    "Bluff needs a believable story — it won't work every time",
    "Good bankroll management keeps you in the game tomorrow",
    "Play tight when learning — only enter pots with good hands",
    "Sometimes even AA needs to fold if you know you're beaten",
    "Good position beats good cards — many pots won by position",
    "Don't try to win back losses emotionally — take a break when tilting",
    "Small ball poker reduces risk while still gathering information",
    "Aggression gets rewarded, passivity gets punished",
    "Pot odds are math, not feelings — learn poker math",
    "Choosing an easy table matters as much as your skill",
    "Folding pre-flop is fine — save chips for better spots",
    "When you're out of the pot, watch how others play",
    "How opponents bet tells more than what they say",
    "3-bet light only works when you have good position",
    "Thin value betting earns more than scared check/calling",
    "Too much slowplay = letting opponents catch cheap cards",
  ],
} as const;
