import Link from "next/link";
import HankoLogo from "@/components/HankoLogo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="washi-texture flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-3 focus-ring rounded-lg">
        <HankoLogo size="md" />
        <div className="leading-tight">
          <div className="font-jp-display text-lg font-bold">日本語検定対策</div>
          <div className="text-xs text-ink/50">JLPT N1 · BJT J1</div>
        </div>
      </Link>
      {children}
    </div>
  );
}