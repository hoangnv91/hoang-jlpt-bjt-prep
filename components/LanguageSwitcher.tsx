"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LANGS, LANG_LABEL, COOKIE_NAME, type Lang } from "@/lib/i18n/shared";

export default function LanguageSwitcher({
  current,
  className = "",
}: {
  current: Lang;
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  function switchLang(next: Lang) {
    if (next === current || pending) return;
    setPending(true);
    document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div
      className={`inline-flex items-center rounded-full border border-ink/15 bg-white/60 p-0.5 text-xs font-medium ${className}`}
      role="group"
      aria-label="Language"
    >
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchLang(l)}
          disabled={pending}
          className={`rounded-full px-3 py-1 transition-colors focus-ring ${
            l === current
              ? "bg-ink text-paper shadow-sm"
              : "text-ink/60 hover:text-ink"
          }`}
        >
          {LANG_LABEL[l]}
        </button>
      ))}
    </div>
  );
}