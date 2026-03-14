"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary" /></div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const isAdmin = searchParams.get("admin") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        const endpoint = isAdmin ? "/api/auth/merchant-register" : "/api/auth/register";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, givenName, familyName }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Registration failed");
          setLoading(false);
          return;
        }
      }

      const result = await signIn(isAdmin ? "merchant-login" : "customer-login", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push(isAdmin ? "/admin/dashboard" : callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {isAdmin ? "Merchant Portal" : "Welcome Back"}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {mode === "login"
                ? "Sign in to your account"
                : "Create a new account"}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  value={givenName}
                  onChange={(e) => setGivenName(e.target.value)}
                />
                <Input
                  label="Last Name"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                />
              </div>
            )}

            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => { setMode("register"); setError(""); }}
                  className="font-medium text-primary hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => { setMode("login"); setError(""); }}
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          {!isAdmin && (
            <div className="mt-4 text-center">
              <a
                href="/login?admin=true"
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Merchant login
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
