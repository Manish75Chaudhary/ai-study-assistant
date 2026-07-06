"use client";

import { LogOut, Menu, Search, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";

export function DashboardNavbar() {
  const { logout, user } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/75 backdrop-blur-2xl">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Button className="lg:hidden" size="icon" type="button" variant="secondary">
            <Menu aria-hidden="true" />
            <span className="sr-only">Open menu</span>
          </Button>
          <div>
            <p className="text-sm text-slate-400">Workspace</p>
            <h1 className="text-lg font-semibold tracking-tight text-white">
              Dashboard
            </h1>
          </div>
        </div>
        <div className="hidden h-10 min-w-64 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-slate-500 md:flex">
          <Search className="size-4" aria-hidden="true" />
          Search documents
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 sm:flex">
            <UserRound className="size-4 text-cyan-200" aria-hidden="true" />
            <span className="max-w-36 truncate text-sm text-slate-200">
              {user?.username ?? "User"}
            </span>
          </div>
          <Button onClick={logout} size="icon" type="button" variant="secondary">
            <LogOut aria-hidden="true" />
            <span className="sr-only">Log out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
