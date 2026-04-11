export const translations = {
  en: {
    // Common
    loading: "Loading...",
    back: "Back",
    cancel: "Cancel",
    save: "Save",
    close: "Close",

    // Login
    "login.tagline": "Office Poker Elo Tracker",
    "login.signInGoogle": "Sign in with Google",
    "login.domainHint": "Players are grouped by email domain",

    // Nav
    "nav.leaderboard": "Leaderboard",
    "nav.profile": "Profile",
    "nav.guide": "Guide",

    // Leaderboard
    "leaderboard.title": "Leaderboard",
    "leaderboard.slogan": "Outlast. Outchip. Outrank.",
    "leaderboard.players": "Players",
    "leaderboard.avgGames": "Avg Games",
    "leaderboard.topElo": "Top Elo",
    "leaderboard.newSession": "+ New Session",
    "leaderboard.activeSessions": "Active Sessions",
    "leaderboard.buyInLabel": "Buy-in",
    "leaderboard.create": "Create",
    "leaderboard.games": "games",
    "leaderboard.game": "game",

    // Session
    "session.title": "Session",
    "session.locked": "Locked",
    "session.open": "Open",
    "session.chips": "Chips",
    "session.chipsPlaceholder": "Chips",
    "session.offBy": "off by",
    "session.addPlayer": "+ Add Player",
    "session.joinSession": "Join Session",
    "session.lockCalculate": "Lock & Calculate Elo",
    "session.calculating": "Calculating...",
    "session.addPlayerTitle": "Add Player",
    "session.noMorePlayers": "No more players to add",
    "session.elo": "Elo",
    "session.buyIn": "Buy-in",
    "session.createdBy": "Host",
    "session.waitingForHost": "Waiting for host to finalize...",
    "session.allChipsReady": "Chips confirmed — waiting for host to lock",
    "session.confirmed": "Confirmed",
    "session.confirm": "Confirm",
    "session.results": "Results",
    "session.rank": "Rank",

    // Profile
    "profile.editName": "Edit name",
    "profile.saveName": "Save",
    "profile.namePlaceholder": "Your display name",
    "profile.winRate": "Win Rate",
    "profile.rank": "Rank",
    "profile.eloHistory": "Elo History",
    "profile.recentSessions": "Recent Sessions",
    "profile.signOut": "Sign Out",

    // Guide
    "guide.title": "Guide",
    "guide.signInPrompt": "Sign in to track your Elo and join sessions.",
    "guide.signInBtn": "Sign In",
    "guide.howToPlay.title": "How to Play",
    "guide.howToPlay.intro":
      "Z-Poker helps your office track poker sessions and rank players using the Elo rating system.",
    "guide.howToPlay.step1.title": "1. Create a session",
    "guide.howToPlay.step1.body":
      "From the leaderboard, tap \"+ New Session\", set the buy-in (default: 800 chips), then tap Create. Multiple sessions can be open at the same time.",
    "guide.howToPlay.step2.title": "2. Join or add players",
    "guide.howToPlay.step2.body":
      "Players can join an active session directly from the leaderboard. The session creator can also tap \"+ Add Player\" to add anyone from the same domain. Everyone buys in with the same amount.",
    "guide.howToPlay.step3.title": "3. Enter chip counts",
    "guide.howToPlay.step3.body":
      "When the game ends, each player enters their own remaining chips. The session creator can edit chips for everyone. Other participants can only edit their own.",
    "guide.howToPlay.step4.title": "4. Lock & calculate",
    "guide.howToPlay.step4.body":
      "Only the session creator can lock the session. Once all chips add up to the expected total (buy-in × player count), the \"Lock & Calculate Elo\" button becomes active. Tapping it finalizes the session and immediately updates everyone's Elo.",

    "guide.bestPractices.title": "Best Practices",
    "guide.bestPractices.item1.title": "Count chips carefully",
    "guide.bestPractices.item1.body":
      "The session can only be locked when the total matches exactly. The chip bar turns green when the numbers are correct.",
    "guide.bestPractices.item2.title": "Lock before leaving",
    "guide.bestPractices.item2.body":
      "The session creator should lock the session right after the game ends. Locking instantly calculates and records Elo for all participants.",
    "guide.bestPractices.item3.title": "Be consistent with players",
    "guide.bestPractices.item3.body":
      "Elo is most meaningful when the same group plays together regularly. Occasional guests can skew ratings.",
    "guide.bestPractices.item4.title": "Honest chip counts",
    "guide.bestPractices.item4.body":
      "The system only works if everyone reports accurate chip counts. Agree on chip totals before entering them.",

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
      "Z-Poker uses K=64. The maximum Elo change per session is ±64 points, regardless of how many players are at the table. Beating a stronger group gives you more points than beating a weaker one.",
    "guide.elo.formula.title": "The formula",
    "guide.elo.formula.body":
      "Expected score: 1 / (1 + 10^((avg_elo − your_elo) / 400)), where avg_elo is the average Elo of all players in the session. Actual score: 0.5 + 0.5 × (chips_end − buy_in) / (buy_in × (N − 1)), where N is the number of players. Rating change: K × (actual − expected).",
    "guide.elo.example.title": "Example",
    "guide.elo.example.body":
      "4-player session, buy-in 1000. Your Elo is 1200, the group average is 1350, and you finish with 1800 chips. Expected ≈ 0.30. Actual = 0.5 + 0.5 × (800 / 3000) ≈ 0.633. Change = round(64 × (0.633 − 0.30)) ≈ +21 points.",
    "guide.strategy.title": "Strategies to Boost Your Elo",
    "guide.strategy.intro":
      "Z-Poker Elo is driven by chip counts \u2014 your final chips vs buy-in is your \u2018score\u2019. These strategies help you end up with more chips consistently.",
    "guide.strategy.chip1.title": "Protect your stack early",
    "guide.strategy.chip1.body":
      "Elo rewards finishing above buy-in. Avoid big coin-flip pots in the early game. A small, steady gain beats a wild all-in that leaves you short.",
    "guide.strategy.chip2.title": "Beat a high-Elo table",
    "guide.strategy.chip2.body":
      "Your expected score is calculated against the group average Elo. Sitting at a table with high-Elo players is scary, but winning there earns you far more points than winning against a weaker group.",
    "guide.strategy.chip3.title": "Position is everything",
    "guide.strategy.chip3.body":
      "Act last whenever possible. Being in position lets you control pot size, bluff more effectively, and extract max value from strong hands \u2014 all of which grow your chip count.",
    "guide.strategy.chip4.title": "Avoid marginal all-ins",
    "guide.strategy.chip4.body":
      "A 55/45 edge in a pot that comprises your whole stack is a bad Elo trade. You risk a big negative delta for a small positive one. Fold equity and chip accumulation beat gambling.",
    "guide.strategy.chip5.title": "Bluff with a plan",
    "guide.strategy.chip5.body":
      "Bluffs work best on dry boards, against single opponents, and when you represent a credible hand. Pure bluffs in multi-way pots leak chips over time \u2014 and chip leakage directly tanks your Elo.",

    "guide.poker101.title": "Poker 101 \u2014 Hand Rankings",
    "guide.poker101.intro":
      "Texas Hold'em hands ranked strongest to weakest. Probabilities show how often you make each hand from 7 cards (2 hole cards + 5 community).",
    "guide.poker101.hand1.title": "1. Royal Flush \u2014 0.003%",
    "guide.poker101.hand1.body":
      "A\u2660 K\u2660 Q\u2660 J\u2660 10\u2660 \u2014 Ace-high straight flush. The best possible hand. Absolutely unbeatable.",
    "guide.poker101.hand2.title": "2. Straight Flush \u2014 0.028%",
    "guide.poker101.hand2.body":
      "Five consecutive cards of the same suit (e.g. 7\u2665 8\u2665 9\u2665 10\u2665 J\u2665). Beats everything except a higher straight flush.",
    "guide.poker101.hand3.title": "3. Four of a Kind \u2014 0.17%",
    "guide.poker101.hand3.body":
      "Four cards of the same rank (e.g. K\u2660 K\u2665 K\u2666 K\u2663). Also called quads. Extremely rare \u2014 almost always wins the pot.",
    "guide.poker101.hand4.title": "4. Full House \u2014 2.6%",
    "guide.poker101.hand4.body":
      "Three of a kind + one pair (e.g. Q\u2660 Q\u2665 Q\u2666 9\u2660 9\u2665). Ranked by the three-of-a-kind first. Very strong and hard to fold.",
    "guide.poker101.hand5.title": "5. Flush \u2014 3.0%",
    "guide.poker101.hand5.body":
      "Any five cards of the same suit (e.g. 2\u2663 7\u2663 J\u2663 Q\u2663 A\u2663). Ranked by highest card. Watch the board for three-of-a-suit.",
    "guide.poker101.hand6.title": "6. Straight \u2014 4.6%",
    "guide.poker101.hand6.body":
      "Five consecutive cards of any suits (e.g. 5\u2660 6\u2665 7\u2663 8\u2666 9\u2660). Ace can be high (A-K-Q-J-10) or low (A-2-3-4-5).",
    "guide.poker101.hand7.title": "7. Three of a Kind \u2014 4.8%",
    "guide.poker101.hand7.body":
      "Three cards of the same rank (e.g. J\u2660 J\u2665 J\u2666). Called \u2018trips\u2019 with one hole card, \u2018set\u2019 with two hole cards. Sets are well-disguised and very strong.",
    "guide.poker101.hand8.title": "8. Two Pair \u2014 23.5%",
    "guide.poker101.hand8.body":
      "Two different pairs (e.g. A\u2660 A\u2665 8\u2663 8\u2666 K\u2660). Ranked by highest pair, then second pair, then kicker. Common \u2014 don\u2019t over-commit.",
    "guide.poker101.hand9.title": "9. One Pair \u2014 43.8%",
    "guide.poker101.hand9.body":
      "Two cards of the same rank (e.g. K\u2660 K\u2663). Most frequently made hand. Strength depends heavily on the kicker and board texture.",
    "guide.poker101.hand10.title": "10. High Card \u2014 17.4%",
    "guide.poker101.hand10.body":
      "No combination at all. Highest single card plays. Can still win if all opponents also miss \u2014 pay attention to who\u2019s bluffing.",  },

  vi: {
    // Common
    loading: "Đang tải...",
    back: "Quay lại",
    cancel: "Hủy",
    save: "Lưu",
    close: "Đóng",

    // Login
    "login.tagline": "Theo dõi Elo Poker Văn phòng",
    "login.signInGoogle": "Đăng nhập với Google",
    "login.domainHint": "Người chơi được nhóm theo tên miền email",

    // Nav
    "nav.leaderboard": "Bảng xếp hạng",
    "nav.profile": "Hồ sơ",
    "nav.guide": "Hướng dẫn",

    // Leaderboard
    "leaderboard.title": "Bảng xếp hạng",
    "leaderboard.slogan": "Trụ lại. Gom chip. Leo rank.",
    "leaderboard.players": "Người chơi",
    "leaderboard.avgGames": "TB ván",
    "leaderboard.topElo": "Elo cao",
    "leaderboard.newSession": "+ Ván mới",
    "leaderboard.activeSessions": "Phiên đang chơi",
    "leaderboard.buyInLabel": "Buy-in",
    "leaderboard.create": "Tạo",
    "leaderboard.games": "ván",
    "leaderboard.game": "ván",

    // Session
    "session.title": "Phiên chơi",
    "session.locked": "Đã khóa",
    "session.open": "Đang mở",
    "session.chips": "Chip",
    "session.chipsPlaceholder": "Chip",
    "session.offBy": "lệch",
    "session.addPlayer": "+ Thêm người chơi",
    "session.joinSession": "Tham gia phiên",
    "session.lockCalculate": "Khóa & Tính Elo",
    "session.calculating": "Đang tính...",
    "session.addPlayerTitle": "Thêm người chơi",
    "session.noMorePlayers": "Không còn người chơi nào để thêm",
    "session.elo": "Elo",
    "session.buyIn": "Buy-in",
    "session.createdBy": "Chủ phiên",
    "session.waitingForHost": "Chờ chủ phiên chốt kết quả...",
    "session.allChipsReady": "Đã xác nhận chip — chờ chủ phiên khóa",
    "session.confirmed": "Đã xác nhận",
    "session.confirm": "Xác nhận",
    "session.results": "Kết quả",
    "session.rank": "Xếp hạng",

    // Profile
    "profile.editName": "Sửa tên",
    "profile.saveName": "Lưu",
    "profile.namePlaceholder": "Tên hiển thị của bạn",
    "profile.winRate": "Tỷ lệ thắng",
    "profile.rank": "Hạng",
    "profile.eloHistory": "Lịch sử Elo",
    "profile.recentSessions": "Phiên gần đây",
    "profile.signOut": "Đăng xuất",

    // Guide
    "guide.title": "Hướng dẫn",
    "guide.signInPrompt": "Đăng nhập để theo dõi Elo và tham gia phiên chơi.",
    "guide.signInBtn": "Đăng nhập",
    "guide.howToPlay.title": "Cách chơi",
    "guide.howToPlay.intro":
      "Z-Poker giúp văn phòng của bạn theo dõi các ván poker và xếp hạng người chơi bằng hệ thống Elo.",
    "guide.howToPlay.step1.title": "1. Tạo phiên chơi",
    "guide.howToPlay.step1.body":
      "Từ bảng xếp hạng, nhấn \"+ Ván mới\", đặt mức buy-in (mặc định: 800 chip), rồi nhấn Tạo. Có thể mở nhiều phiên cùng lúc.",
    "guide.howToPlay.step2.title": "2. Tham gia hoặc thêm người chơi",
    "guide.howToPlay.step2.body":
      "Người chơi có thể tham gia phiên đang mở trực tiếp từ bảng xếp hạng. Chủ phiên cũng có thể nhấn \"+ Thêm người chơi\" để thêm bất kỳ ai cùng domain. Tất cả mua vào với cùng một mức.",
    "guide.howToPlay.step3.title": "3. Nhập số chip còn lại",
    "guide.howToPlay.step3.body":
      "Khi ván kết thúc, mỗi người nhập số chip còn lại của mình. Chủ phiên có thể chỉnh chip của tất cả mọi người. Người tham gia chỉ chỉnh được chip của bản thân.",
    "guide.howToPlay.step4.title": "4. Khóa & tính Elo",
    "guide.howToPlay.step4.body":
      "Chỉ chủ phiên mới có quyền khóa phiên. Khi tổng chip khớp với tổng dự kiến (buy-in × số người), nút \"Khóa & Tính Elo\" sẽ sáng lên. Nhấn vào để chốt phiên và cập nhật Elo ngay lập tức.",

    "guide.bestPractices.title": "Lưu ý khi chơi",
    "guide.bestPractices.item1.title": "Đếm chip cẩn thận",
    "guide.bestPractices.item1.body":
      "Phiên chỉ có thể được khóa khi tổng chip khớp chính xác. Thanh chip chuyển xanh khi số liệu đúng.",
    "guide.bestPractices.item2.title": "Khóa ngay sau ván",
    "guide.bestPractices.item2.body":
      "Chủ phiên nên khóa phiên ngay khi ván kết thúc. Khóa phiên sẽ tính và ghi nhận Elo ngay lập tức cho tất cả người tham gia.",
    "guide.bestPractices.item3.title": "Nhóm chơi ổn định",
    "guide.bestPractices.item3.body":
      "Elo có ý nghĩa nhất khi cùng một nhóm chơi với nhau thường xuyên. Khách vãng lai có thể làm lệch điểm.",
    "guide.bestPractices.item4.title": "Báo số chip trung thực",
    "guide.bestPractices.item4.body":
      "Hệ thống chỉ hoạt động khi mọi người báo số chip chính xác. Hãy thống nhất trước khi nhập.",

    "guide.elo.title": "Hệ thống Elo",
    "guide.elo.intro":
      "Elo là hệ thống xếp hạng ban đầu được thiết kế cho cờ vua. Nó đo kỹ năng tương đối giữa các người chơi — điểm của bạn tăng khi thắng người mạnh hơn và giảm khi thua người yếu hơn.",
    "guide.elo.starting.title": "Điểm khởi đầu",
    "guide.elo.starting.body":
      "Mọi người chơi mới bắt đầu với 1200 Elo. Đây là mức cơ sở — mọi người được coi là ngang nhau cho đến khi chơi.",
    "guide.elo.howWorks.title": "Cách điểm thay đổi",
    "guide.elo.howWorks.body":
      "Sau mỗi phiên, Z-Poker so sánh Elo hiện tại của bạn với Elo trung bình của tất cả mọi người trong bàn. Thành tích của bạn được đo bằng độ lệch giữa số chip cuối cùng và số chip buy-in. Kết thúc trên buy-in là kết quả tích cực, dưới buy-in là tiêu cực — chip lệch càng nhiều thì điểm thay đổi càng lớn.",
    "guide.elo.kfactor.title": "Hệ số K",
    "guide.elo.kfactor.body":
      "Z-Poker dùng K=64. Elo có thể thay đổi tối đa ±64 điểm mỗi phiên, bất kể có bao nhiêu người chơi. Thắng một nhóm mạnh sẽ được nhiều điểm hơn thắng nhóm yếu.",
    "guide.elo.formula.title": "Công thức",
    "guide.elo.formula.body":
      "Điểm kỳ vọng: 1 / (1 + 10^((elo_trung_bình − elo_bạn) / 400)), với elo_trung_bình là Elo trung bình của cả bàn. Điểm thực tế: 0.5 + 0.5 × (chip_cuối − buy_in) / (buy_in × (N − 1)), với N là số người chơi. Thay đổi Elo = K × (thực_tế − kỳ_vọng).",
    "guide.elo.example.title": "Ví dụ",
    "guide.elo.example.body":
      "Phiên 4 người, buy-in 1000. Elo bạn 1200, trung bình bàn 1350, bạn kết thúc với 1800 chip. Kỳ vọng ≈ 0.30. Thực tế = 0.5 + 0.5 × (800 / 3000) ≈ 0.633. Thay đổi = round(64 × (0.633 − 0.30)) ≈ +21 điểm.",

    "guide.strategy.title": "Chiến thuật tăng Elo",
    "guide.strategy.intro":
      "Elo trong Z-Poker phụ thuộc vào số chip cuối cùng so với buy-in. Những chiến thuật dưới đây giúp bạn kết thúc với nhiều chip hơn một cách nhất quán.",
    "guide.strategy.chip1.title": "Bảo vệ stack sớm",
    "guide.strategy.chip1.body":
      "Elo thưởng kết thúc trên buy-in. Tránh vào những pot lớn kiểu 'chết thì thôi' khi mới vào ván. Căng nhỏ đều đặn hơn đánh all-in rồi bay stack.",
    "guide.strategy.chip2.title": "Ngồi bàn Elo cao",
    "guide.strategy.chip2.body":
      "Elo kỳ vọng của bạn được tính theo Elo trung bình của cả bàn. Ngồi cùng những người Elo cao hơn khiến kỳ vọng thấp hơn — nên cùng số chip cuối, bạn nhận được nhiều điểm hơn so với thắng một bàn yếu.",
    "guide.strategy.chip3.title": "Tận dụng vị trí",
    "guide.strategy.chip3.body":
      "Đánh sau cùng trong một ván cho bạn kiểm soát khoảng giá pot, bluff hiệu quả hơn và khai thác tối đa bài mạnh — tất cả đều giúp căng chip.",
    "guide.strategy.chip4.title": "Tránh all-in biên",
    "guide.strategy.chip4.body":
      "Edge 55/45 mà phải risk cả stack là giao dịch Elo tồi. Giải phóng pot bằng fold equity và khai thác chip by chip thay vì chờ ăn tất hoặc mất tay.",
    "guide.strategy.chip5.title": "Bluff có kế hoạch",
    "guide.strategy.chip5.body":
      "Bluff hiệu quả nhất khi bóng khô, đầu bướt, và bạn có thể represent range mạnh. Bluff đa bướt hoặc bluff tày tiền thường rói chips dài hạn — mà chip rói cục thẳng vào Elo.",

    "guide.poker101.title": "Poker 101 — Thứ Tự Bài",
    "guide.poker101.intro":
      "Các tổ hợp bài trong Texas Hold'em từ mạnh đến yếu. Xác suất tính cho bài tốt nhất từ 7 lá (2 bài tay + 5 lá chung).",
    "guide.poker101.hand1.title": "1. Royal Flush — 0.003%",
    "guide.poker101.hand1.body":
      "A♠ K♠ Q♠ J♠ 10♠ — Sảnh thấu màu cao nhất. Bài mạnh tuyệt đối trong poker. Không thể thua.",
    "guide.poker101.hand2.title": "2. Straight Flush — 0.028%",
    "guide.poker101.hand2.body":
      "5 lá liên tiếp cùng màu (vd. 7♥ 8♥ 9♥ 10♥ J♥). Chỉ thua Royal Flush.",
    "guide.poker101.hand3.title": "3. Tứ Quý (Four of a Kind) — 0.17%",
    "guide.poker101.hand3.body":
      "4 lá cùng số (vd. K♠ K♥ K♦ K♣). Cực hiếm — hầu như lúc nào cũng ôm pot.",
    "guide.poker101.hand4.title": "4. Cù Lũ (Full House) — 2.6%",
    "guide.poker101.hand4.body":
      "Bộ ba + đôi (vd. Q♠ Q♥ Q♦ 9♠ 9♥). So sánh bộ ba trước, rồi so đôi. Bài rất mạnh.",
    "guide.poker101.hand5.title": "5. Thùng (Flush) — 3.0%",
    "guide.poker101.hand5.body":
      "5 lá cùng màu (vd. 2♣ 7♣ J♣ Q♣ A♣). So bài cao nhất. Chú ý khi bảng có 3 lá cùng màu.",
    "guide.poker101.hand6.title": "6. Sảnh (Straight) — 4.6%",
    "guide.poker101.hand6.body":
      "5 lá liên tiếp khác màu (vd. 5♠ 6♥ 7♣ 8♦ 9♠). Át có thể đứng đầu (A-K-Q-J-10) hoặc đứng cuối (A-2-3-4-5).",
    "guide.poker101.hand7.title": "7. Bộ Ba (Three of a Kind) — 4.8%",
    "guide.poker101.hand7.body":
      "3 lá cùng số (vd. J♠ J♥ J♦). Gọi là 'trips' nếu có 1 bài tay, 'set' nếu có 2 bài tay. Set rất khó đọc và cực kỳ lợi.",
    "guide.poker101.hand8.title": "8. Đôi Đôi (Two Pair) — 23.5%",
    "guide.poker101.hand8.body":
      "Hai đôi khác nhau (vd. A♠ A♥ 8♣ 8♦ K♠). So đôi cao trước, rồi đôi kế, rồi kicker. Phổ biến — đừng overpay.",
    "guide.poker101.hand9.title": "9. Một Đôi (One Pair) — 43.8%",
    "guide.poker101.hand9.body":
      "Hai lá cùng số (vd. K♠ K♣). Bài phổ biến nhất. Độ mạnh phụ thuộc kicker và texture bảng.",
    "guide.poker101.hand10.title": "10. High Card — 17.4%",
    "guide.poker101.hand10.body":
      "Không có tổ hợp nào. Lá bài cao nhất tính. Vẫn có thể thắng nếu đối thủ cũng miss — chú ý đọc bluff.",
  },
} as const;

export type Locale = keyof typeof translations;
export type TranslationKey = keyof (typeof translations)["en"];
