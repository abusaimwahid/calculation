import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions";
import { isAuthenticated } from "@/lib/auth";
import { SubmitButton } from "@/components/SubmitButton";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAuthenticated()) redirect("/dashboard");
  const { error } = await searchParams;
  return <main className="loginShell"><div className="loginCard">
    <div className="brand loginBrand"><span className="brandMark">L</span><div><b>LifeLedger</b><small>Your private money dashboard</small></div></div>
    <h1>Welcome back</h1><p>Sign in to update your daily finance records.</p>
    {error && <div className="alert error">Wrong username or password.</div>}
    <form action={loginAction} className="stack">
      <label>Username<input name="user" defaultValue={process.env.APP_USER || "admin"} autoComplete="username" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
      <SubmitButton>Sign in</SubmitButton>
    </form>
  </div></main>;
}
