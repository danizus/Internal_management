"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vendors", label: "Directory" },
  { href: "/packages", label: "Retail Plans" },
  { href: "/purchases", label: "Orders" },
  { href: "/clients", label: "Clients" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutral-50 text-neutral-900">
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-neutral-200 md:bg-white md:p-5 gap-6">
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
      </aside>

      <main className="flex-1 pb-20 md:pb-8">{children}</main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-neutral-200 bg-white/95 backdrop-blur flex justify-around py-2 px-1">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 text-center py-2 px-1 rounded-lg text-xs font-semibold transition-colors ${
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
