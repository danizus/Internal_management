"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const { login } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    const result = await login(email, password);
    setPending(false);
    if (result.ok) {
      router.push(redirectTo);
      router.refresh();
    } else {
      setError(result.error || "Invalid credentials");
    }
  };

  return (
    <Card className="w-full max-w-sm border-slate-800 bg-slate-900/80 backdrop-blur shadow-2xl">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm">
            T
          </div>
          <span className="text-lg font-bold text-white tracking-wide">Tam Console</span>
        </div>
        <CardTitle className="text-2xl font-bold text-white">Welcome back</CardTitle>
        <CardDescription className="text-slate-400">
          Sign in to your reseller management console
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} className="contents">
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">
              Email
            </Label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="admin@example.com"
              className="cursor-text border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus-visible:ring-primary/60"
              required
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-slate-300">
                Password
              </Label>
            </div>
            <Input
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              className="cursor-text border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus-visible:ring-primary/60"
              required
              disabled={pending}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            type="submit"
            className="w-full cursor-pointer bg-primary text-white hover:bg-primary/90 font-medium"
            disabled={pending}
          >
            {pending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            {pending ? "Signing in..." : "Sign in"}
          </Button>
          <p className="text-center text-sm text-slate-400">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary hover:underline cursor-pointer font-medium">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900/60 p-6 text-center text-slate-400">
          Loading sign in...
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
