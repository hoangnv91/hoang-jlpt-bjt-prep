import { vi, type ViDict } from "@/lib/i18n/vi";
import { ja, type JaDict } from "@/lib/i18n/ja";

export type Lang = "vi" | "ja";
export type Dict = ViDict | JaDict;

export const LANGS: Lang[] = ["vi", "ja"];
export const LANG_LABEL: Record<Lang, string> = { vi: "Tiếng Việt", ja: "日本語" };

export const COOKIE_NAME = "lang";

export function getDict(lang: Lang): Dict {
  return lang === "ja" ? ja : vi;
}