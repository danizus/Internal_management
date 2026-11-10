import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tam | Auth",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-950 p-4">
      {children}
    </div>
  );
}
