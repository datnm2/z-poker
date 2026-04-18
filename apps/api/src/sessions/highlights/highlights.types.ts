export interface LocalizedText {
  vi: string;
  en: string;
}

export interface HighlightItem {
  playerId: string;
  playerName: string;
  title: LocalizedText;
  body: LocalizedText;
  emoji: string;
}

export interface SessionHighlights {
  generatedAt: string;
  model: string;
  items: HighlightItem[];
}
