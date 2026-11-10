"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const passwordMismatch = confirm.length > 0 && confirm !== password;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setPending(true);
    const result = await register({ name, email, password });
    setPending(false);
    if (result.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setError(result.error || "Registration failed");
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
        <CardTitle className="text-2xl font-bold text-white">Create an account</CardTitle>
        <CardDescription className="text-slate-400">
          Start managing your reseller business
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
            <Label htmlFor="name" className="text-slate-300">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="cursor-text border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus-visible:ring-primary/60"
              required
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">
              Email
            </Label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              className="cursor-text border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus-visible:ring-primary/60"
              required
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300">
              Password
            </Label>
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
          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-slate-300">
              Confirm password
            </Label>
            <Input
              id="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              placeholder="••••••••"
              className="cursor-text border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus-visible:ring-primary/60"
              required
              disabled={pending}
            />
            {passwordMismatch && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            type="submit"
            className="w-full cursor-pointer bg-primary text-white hover:bg-primary/90 font-medium"
            disabled={pending || passwordMismatch}
          >
            {pending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            {pending ? "Creating account..." : "Create account"}
          </Button>
          <p className="text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline cursor-pointer font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
