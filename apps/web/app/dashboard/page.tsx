"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Dashboard() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin");
    }
  }, [session, isPending, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="text-zinc-900 dark:text-white">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <nav className="bg-white shadow dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {session.user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-6 shadow dark:bg-zinc-900">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Welcome, {session.user?.name || session.user?.email}!
          </h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            You are successfully authenticated.
          </p>
          <div className="mt-6 space-y-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <strong>User ID:</strong> {session.user?.id}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <strong>Email:</strong> {session.user?.email}
            </p>
            {session.user?.name && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                <strong>Name:</strong> {session.user?.name}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
