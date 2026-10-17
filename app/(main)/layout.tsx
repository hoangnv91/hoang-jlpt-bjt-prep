import { auth } from "@/lib/auth";
import { getDictFromCookie } from "@/lib/i18n";
import Sidebar from "@/components/Sidebar";
import LogoutButton from "@/components/LogoutButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const { lang, dict } = await getDictFromCookie();

  return (
    <div className="washi-texture min-h-screen">
      <Sidebar
        dict={dict}
        userName={session?.user?.name ?? session?.user?.email ?? null}
      />
      <div className="pl-16 md:pl-60">
        <header className="sticky top-0 z-20 flex items-center justify-end gap-3 border-b border-ink/10 bg-paper/80 px-5 py-3 backdrop-blur">
          <LanguageSwitcher current={lang} />
          <LogoutButton dict={dict} />
        </header>
        <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
      </div>
    </div>
  );
}