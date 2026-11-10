import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:p-4 gap-2">
        <nav className="flex flex-col gap-2">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/clients">Clients</Link>
          <Link href="/vendors">Vendors</Link>
        </nav>
      </aside>
      <main className="flex-1">{children}</main>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background flex justify-around p-2">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/clients">Clients</Link>
        <Link href="/vendors">Vendors</Link>
      </nav>
    </div>
  );
}
