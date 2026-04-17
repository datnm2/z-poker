import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hướng dẫn chơi poker & hệ thống Elo",
  description:
    "Cách chơi Z-Poker, hệ thống Elo (K=70, công thức), 6 hạng từ Cá Con đến Thần Bài, chiến thuật leo rank, Poker 101 — thứ tự bài Texas Hold'em.",
  alternates: {
    canonical: "/guide",
  },
  openGraph: {
    title: "Hướng dẫn Z-Poker — Cách chơi & hệ thống Elo",
    description:
      "Học cách chơi Z-Poker, hiểu hệ thống Elo và các tổ hợp bài Texas Hold'em.",
    url: "/guide",
    type: "article",
  },
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
