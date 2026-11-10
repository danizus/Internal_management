"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Building2,
  Package,
  ShoppingCart,
  DollarSign,
  RefreshCw,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/vendors", label: "Vendors", icon: Building2 },
  { href: "/packages", label: "Retail Plans", icon: Package },
  { href: "/purchases", label: "Purchases", icon: ShoppingCart },
  { href: "/financials", label: "Financials", icon: DollarSign },
  { href: "/whmcs", label: "WHMCS Sync", icon: RefreshCw },
];

function NavLink({
  href,
  label,
  icon: Icon,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname?.startsWith(href + "/");
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/15 text-primary font-semibold"
          : "text-slate-300 hover:bg-slate-800 hover:text-white"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-white font-bold">
          T
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight">Tam</span>
          <span className="text-[11px] text-slate-400 leading-tight">Reseller Console</span>
        </div>
      </div>
      <Separator className="bg-slate-800" />
      <nav className="flex-1 space-y-1 px-2 py-3 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            onNavigate={() => setMobileOpen(false)}
          />
        ))}
      </nav>
      <div className="border-t border-slate-800 p-2">
        {mounted ? (
          <div className="flex items-center gap-2 rounded-md px-2 py-2">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {user?.name || "Guest"}
              </p>
              <p className="truncate text-[11px] text-slate-400 capitalize">
                {user?.role || ""}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md px-2 py-2">
            <div className="size-8 rounded-full bg-slate-800" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-20 rounded bg-slate-800" />
              <div className="h-2 w-12 rounded bg-slate-800" />
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full cursor-pointer justify-start gap-2 text-slate-300 hover:bg-slate-800 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-svh">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 md:flex md:flex-col border-r border-slate-800">
        {sidebar}
      </aside>

      {/* Mobile header + sheet */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900 px-3 md:hidden">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="size-9 cursor-pointer text-slate-200">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 border-slate-800 bg-slate-900 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                {sidebar}
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm">
                T
              </div>
              <span className="text-sm font-semibold text-white">Tam Console</span>
            </div>
          </div>
        </header>
        <main className="flex-1 bg-slate-950 text-slate-100">{children}</main>
      </div>
    </div>
  );
}
