"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import type { Dict } from "@/lib/i18n";

export default function LogoutButton({ dict }: { dict: Dict }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        setBusy(true);
        signOut({ callbackUrl: "/" });
      }}
      disabled={busy}
      className="rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-xs font-medium text-ink/70 transition-colors hover:bg-ink/5 disabled:opacity-50 focus-ring"
    >
      {busy ? dict.common.loading : dict.common.logout}
    </button>
  );
}