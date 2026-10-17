import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDictFromCookie } from "@/lib/i18n";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = { title: "Đăng ký" };

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { lang, dict } = await getDictFromCookie();
  return (
    <RegisterForm dict={dict} lang={lang} />
  );
}