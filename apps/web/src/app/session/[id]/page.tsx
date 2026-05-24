import type { Metadata } from "next";
import SessionContent from "./session-content";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3031";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zpoker.vercel.app";

interface SessionPreview {
  session: {
    id: string;
    playedDate: string;
    buyIn: number;
    isLocked: boolean;
  };
  players: Array<{
    chipsEnd: number | null;
    player: { name: string };
  }>;
  highlights: { personaName?: { vi: string; en: string } } | null;
}

async function fetchPreview(id: string): Promise<SessionPreview | null> {
  try {
    const res = await fetch(`${API_URL}/sessions/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as SessionPreview;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const preview = await fetchPreview(id);

  if (!preview) {
    return {
      title: "Phiên chơi",
      openGraph: { title: "Phiên chơi · Z-Poker", url: `${SITE_URL}/session/${id}` },
    };
  }

  const { session, players, highlights } = preview;
  const ranked = [...players].sort(
    (a, b) => (b.chipsEnd ?? 0) - (a.chipsEnd ?? 0),
  );
  const winner = ranked[0]?.player.name ?? "?";
  const mc = highlights?.personaName?.vi ?? null;

  const title = session.isLocked
    ? `Ván poker ${session.playedDate} — ${winner} thắng`
    : `Ván poker ${session.playedDate} đang diễn ra`;
  const description = mc
    ? `Buy-in ${session.buyIn} chip · ${players.length} người chơi · MC ${mc} chấm điểm`
    : `Buy-in ${session.buyIn} chip · ${players.length} người chơi`;
  const url = `${SITE_URL}/session/${id}`;

  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: "Z-Poker",
      locale: "vi_VN",
      images: [{ url: "/icon", width: 512, height: 512, alt: "Z-Poker" }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: ["/icon"],
    },
    alternates: { canonical: `/session/${id}` },
  };
}

export default function SessionPage() {
  return <SessionContent />;
}
