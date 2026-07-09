import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { logoutAction } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";
import { titleCase } from "@/lib/utils";
import { Nav } from "./nav";

// Every page in this group is behind auth: the layout resolves the user (or
// redirects to /login) once, and shares the app chrome (§6.0).
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const t = await getTranslations("common");
  return (
    <div className="flex-1">
      <header className="border-b bg-card/40">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              Fintrack
            </Link>
            <Nav />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {titleCase(user.name ?? user.email)}
            </span>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="sm">
                {t("logout")}
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-4xl p-4 sm:p-6">{children}</div>
    </div>
  );
}
