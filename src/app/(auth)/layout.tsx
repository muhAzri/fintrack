import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Fintrack
          </Link>
          <LocaleSwitcher />
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
