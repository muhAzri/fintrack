import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth/dal";
import { Nav } from "./nav";

// Every page in this group is behind auth: the layout resolves the user (or
// redirects to /login) once, and shares the app chrome (§6.0).
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex-1">
      <header className="border-b border-black/10 dark:border-white/15">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              Fintrack
            </Link>
            <Nav />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-black/50 sm:inline dark:text-white/50">
              {user.name ?? user.email}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-4xl p-4 sm:p-6">{children}</div>
    </div>
  );
}
