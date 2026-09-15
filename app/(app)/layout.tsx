import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { isAuthenticated } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthenticated())) redirect("/login");
  return <div className="appShell"><Sidebar /><main className="content">{children}</main></div>;
}
