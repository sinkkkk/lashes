import { redirect } from "next/navigation";
import { LashMark } from "@/components/LashMark";
import { isAdmin } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <LashMark className="mx-auto h-8 w-16 text-accent" />
      <h1 className="mt-4 mb-8 text-center font-display text-3xl font-semibold">Admin</h1>
      <LoginForm />
    </div>
  );
}
