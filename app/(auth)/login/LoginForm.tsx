"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { signIn } from "next-auth/react";
import type { Dict } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

function LoginFormInner({ dict, lang }: { dict: Dict; lang: "vi" | "ja" }) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setBusy(false);
    if (res?.error) {
      setError(dict.auth.errorInvalid);
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  async function onGoogle() {
    setBusy(true);
    await signIn("google", { callbackUrl });
  }

  const googleConfigured = !!process.env.NEXT_PUBLIC_GOOGLE_CONFIGURED;

  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-jp-display text-2xl font-bold">{dict.auth.welcomeBack}</h1>
        <LanguageSwitcher current={lang} />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            {dict.auth.email}
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={dict.auth.emailPlaceholder}
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm focus-ring focus:border-accent"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            {dict.auth.password}
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={dict.auth.passwordPlaceholder}
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm focus-ring focus:border-accent"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accentDark disabled:opacity-50 focus-ring"
        >
          {busy ? dict.common.loading : dict.auth.loginBtn}
        </button>
      </form>

      {googleConfigured && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-ink/40">
            <span className="h-px flex-1 bg-ink/10" />
            {dict.auth.or}
            <span className="h-px flex-1 bg-ink/10" />
          </div>
          <button
            type="button"
            onClick={onGoogle}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm font-medium transition-colors hover:bg-ink/5 disabled:opacity-50 focus-ring"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {dict.auth.loginGoogle}
          </button>
        </>
      )}

      <p className="mt-6 text-center text-sm text-ink/60">
        {dict.auth.noAccount}{" "}
        <a href="/register" className="font-medium text-accent hover:underline">
          {dict.common.register}
        </a>
      </p>
    </div>
  );
}

export default function LoginForm(props: { dict: Dict; lang: "vi" | "ja" }) {
  return (
    <Suspense fallback={<div>{props.dict.common.loading}</div>}>
      <LoginFormInner {...props} />
    </Suspense>
  );
}