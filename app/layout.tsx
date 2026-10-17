import type { Metadata } from "next";
import "@/app/globals.css";
import { getLang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: {
    default: "Luyện Thi Nhật Ngữ | JLPT N1 & BJT J1",
    template: "%s | Luyện Thi Nhật Ngữ",
  },
  description:
    "Website ôn thi tiếng Nhật JLPT N1 và BJT J1: luyện đề theo phần, thi thử tính giờ, flashcard từ vựng.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getLang();
  return (
    <html lang={lang === "ja" ? "ja" : "vi"}>
      <body className="min-h-screen bg-paper text-ink">{children}</body>
    </html>
  );
}