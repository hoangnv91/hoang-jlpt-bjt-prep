import { cookies } from "next/headers";
import { getDict, COOKIE_NAME, type Lang, type Dict } from "@/lib/i18n/shared";

export { LANGS, LANG_LABEL, COOKIE_NAME, getDict } from "@/lib/i18n/shared";
export type { Lang, Dict } from "@/lib/i18n/shared";

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const v = store.get(COOKIE_NAME)?.value;
  return v === "ja" ? "ja" : "vi";
}

export async function getDictFromCookie(): Promise<{ lang: Lang; dict: Dict }> {
  const lang = await getLang();
  return { lang, dict: getDict(lang) };
}