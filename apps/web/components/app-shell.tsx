"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vendors", label: "Directory" },
  { href: "/packages", label: "Retail Plans" },
  { href: "/purchases", label: "Orders" },
  { href: "/clients", label: "Clients" },
  { href: "/whmcs", label: "WHMCS Sync" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // On login screen, hide the app layout shell
  if (pathname === "/login") {
    return <main className="min-h-screen bg-neutral-900">{children}</main>;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutral-50 text-neutral-900">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-neutral-200 md:bg-white md:p-5 gap-6 justify-between">
        <div className="flex flex-col gap-6">
          <div>
            <div className="text-lg font-bold tracking-tight text-neutral-900">
              TAM Reseller
            </div>
            <p className="text-xs text-neutral-500">
              VPS Directory & WHMCS Ops
            </p>
          </div>
          <nav className="flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Badge & Logout in Sidebar */}
        {user && (
          <div className="pt-4 border-t border-neutral-100 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold uppercase">
                {user.name.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-neutral-900 truncate">
                  {user.name}
                </div>
                <div className="text-[11px] text-neutral-500 truncate">
                  {user.role}
                </div>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="w-full py-1.5 px-3 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors text-center"
            >
              Log Out
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-200 sticky top-0 z-20">
        <span className="font-bold text-sm tracking-tight text-neutral-900">
          TAM Reseller
        </span>
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-600 font-medium">
              {user.name.split(" ")[0]}
            </span>
            <button
              onClick={() => logout()}
              className="text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded"
            >
              Log Out
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-20 md:pb-8">{children}</main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-neutral-200 bg-white/95 backdrop-blur flex justify-around py-2 px-1">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 text-center py-2 px-1 rounded-lg text-[11px] font-semibold transition-colors ${
                active
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
