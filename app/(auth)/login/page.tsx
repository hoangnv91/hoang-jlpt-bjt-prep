import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDictFromCookie } from "@/lib/i18n";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Đăng nhập" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { lang, dict } = await getDictFromCookie();
  return (
    <LoginForm dict={dict} lang={lang} />
  );
}