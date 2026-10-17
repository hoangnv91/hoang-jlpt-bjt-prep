"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import type { Dict } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function RegisterForm({
  dict,
  lang,
}: {
  dict: Dict;
  lang: "vi" | "ja";
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setBusy(false);
      if (data.error === "email_exists") setError(dict.auth.errorExists);
      else setError(dict.auth.errorGeneric);
      return;
    }

    const signInRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setBusy(false);
    if (signInRes?.error) {
      setError(dict.auth.errorGeneric);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  const googleConfigured = !!process.env.NEXT_PUBLIC_GOOGLE_CONFIGURED;

  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-jp-display text-2xl font-bold">{dict.auth.createAccount}</h1>
        <LanguageSwitcher current={lang} />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
            {dict.auth.name}
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={dict.auth.namePlaceholder}
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm focus-ring focus:border-accent"
          />
        </div>
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
            autoComplete="new-password"
            minLength={6}
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
          {busy ? dict.common.loading : dict.auth.registerBtn}
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
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm font-medium transition-colors hover:bg-ink/5 disabled:opacity-50 focus-ring"
          >
            {dict.auth.registerGoogle}
          </button>
        </>
      )}

      <p className="mt-6 text-center text-sm text-ink/60">
        {dict.auth.hasAccount}{" "}
        <a href="/login" className="font-medium text-accent hover:underline">
          {dict.common.login}
        </a>
      </p>
    </div>
  );
}