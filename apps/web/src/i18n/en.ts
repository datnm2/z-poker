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
  "nav.profile": "Profile",
  "nav.guide": "Guide",

  // Leaderboard
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
  "leaderboard.colPlayer": "Player",
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
    "After each session, Z-Poker compares your current Elo against the average Elo of everyone at the table. Your performance is measured by how far your final chip count is from the buy-in. Finishing above buy-in is a positive result, below buy-in is negative — the bigger the chip delta, the bigger the score.",
  "guide.elo.kfactor.title": "K-factor",
  "guide.elo.kfactor.body":
    "Z-Poker uses K=70, scaled by N/2 (N = number of players) so bigger tables produce meaningful swings. A 2-player game swings up to ±70, a 6-player game up to ±210. Beating a stronger group earns more points than beating a weaker one. Rounding is always ceil — the system Elo drifts up slightly over time, and any chip gain earns at least +1.",
  "guide.elo.formula.title": "The formula",
  "guide.elo.formula.body":
    "Expected score: 1 / (1 + 10^((avg_elo − your_elo) / 400)), where avg_elo is the table's average Elo. Actual score: 0.5 + 0.5 × (chips_end − buy_in) / (buy_in × (N − 1)), where N is the number of players. Rating change: ceil(K × N/2 × (actual − expected)), floored at +1 whenever you gained chips.",
  "guide.elo.example.title": "Example",
  "guide.elo.example.body":
    "3-player session, buy-in 100. Your Elo is 1090, the table average is 1195, and you finish with 300 chips (sweep). Expected ≈ 0.354. Actual = 0.5 + 0.5 × (200 / 200) = 1.0. Change = ceil(70 × 1.5 × (1.0 − 0.354)) = +68 points.",

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
