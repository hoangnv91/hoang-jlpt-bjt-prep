import Link from "next/link";
import { auth } from "@/lib/auth";
import { getDictFromCookie } from "@/lib/i18n";
import HankoLogo from "@/components/HankoLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default async function HomePage() {
  const session = await auth();
  const { lang, dict } = await getDictFromCookie();
  const home = dict.landing;

  return (
    <div className="washi-texture min-h-screen">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-3 focus-ring rounded-lg">
          <HankoLogo size="md" />
          <div className="leading-tight">
            <div className="font-jp-display text-base font-bold">{dict.common.appName}</div>
            <div className="text-[11px] tracking-wide text-ink/50">{dict.common.tagline}</div>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher current={lang} />
          {session?.user ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accentDark focus-ring"
            >
              {dict.nav.dashboard}
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-ink/20 bg-white/70 px-4 py-2 text-sm font-medium transition-colors hover:bg-white focus-ring"
            >
              {dict.common.login}
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 md:pt-16">
        <div className="grid items-center gap-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="hanko h-7 w-7 text-[9px]">N1</span>
              <span className="hanko h-7 w-7 text-[9px]">J1</span>
              <span className="text-sm text-ink/50">JLPT N1 · BJT J1 対策サイト</span>
            </div>
            <h1 className="font-jp-display text-4xl font-bold leading-tight md:text-6xl">
              {home.heroTitle}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink/70 md:text-lg">
              {home.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {session?.user ? (
                <Link
                  href="/dashboard"
                  className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-transform hover:-translate-y-0.5 focus-ring"
                >
                  {home.ctaStart} →
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-transform hover:-translate-y-0.5 focus-ring"
                  >
                    {home.ctaStart} →
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-full border border-ink/20 bg-white/70 px-6 py-3 text-sm font-medium transition-colors hover:bg-white focus-ring"
                  >
                    {home.ctaLogin}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Vertical Japanese accent */}
          <div className="hidden justify-end md:flex">
            <div className="vertical-text font-jp-display select-none text-2xl font-bold text-ink/15">
              日本語で合格へ
            </div>
          </div>
        </div>
      </section>

      {/* Exam cards */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-6 md:grid-cols-2">
          <article className="card-hover relative overflow-hidden rounded-2xl border border-ink/10 bg-white p-8 shadow-sm">
            <div className="absolute right-5 top-5">
              <span className="hanko h-12 w-12 text-sm">合格</span>
            </div>
            <div className="font-jp-display text-3xl font-bold text-accent">
              {home.examJlpTitle}
            </div>
            <p className="mt-1 text-xs font-medium uppercase tracking-widest text-ink/40">
              日本語能力試験
            </p>
            <p className="mt-4 text-sm leading-relaxed text-ink/70">{home.examJlpDesc}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["文字・語彙", "文法", "読解", "聴解"].map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink/70"
                >
                  {s}
                </span>
              ))}
            </div>
          </article>

          <article className="card-hover relative overflow-hidden rounded-2xl border border-ink/10 bg-white p-8 shadow-sm">
            <div className="absolute right-5 top-5">
              <span className="hanko h-12 w-12 text-sm">J1</span>
            </div>
            <div className="font-jp-display text-3xl font-bold text-accent">
              {home.examBjtTitle}
            </div>
            <p className="mt-1 text-xs font-medium uppercase tracking-widest text-ink/40">
              ビジネス日本語能力テスト
            </p>
            <p className="mt-4 text-sm leading-relaxed text-ink/70">{home.examBjtDesc}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["語彙・表現", "読解", "聴解"].map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink/70"
                >
                  {s}
                </span>
              ))}
            </div>
          </article>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-ink/10 bg-white/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: "問", title: home.featureQuiz, desc: home.featureQuizDesc },
            { icon: "時", title: home.featureMock, desc: home.featureMockDesc },
            { icon: "札", title: home.featureCard, desc: home.featureCardDesc },
            { icon: "進", title: home.featureTrack, desc: home.featureTrackDesc },
          ].map((f) => (
            <div key={f.title}>
              <div className="hanko mb-3 h-9 w-9 text-[11px]">{f.icon}</div>
              <h3 className="font-jp-display text-base font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-ink/10 py-8 text-center text-xs text-ink/40">
        © {new Date().getFullYear()} {dict.common.appName} · {dict.footer.rights}
      </footer>
    </div>
  );
}