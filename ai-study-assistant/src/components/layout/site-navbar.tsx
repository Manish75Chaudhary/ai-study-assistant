"use client";

import { ArrowRight, LogIn, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "#features", label: "Features" },
  { href: "#technology", label: "Technology" },
  { href: "#workflow", label: "Workflow" },
];

export function SiteNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-2xl">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Brand />
        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              className="text-sm text-slate-300 transition hover:text-white"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <Button asChild size="sm" variant="ghost">
            <Link href="/login">
              <LogIn aria-hidden="true" />
              Sign in
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">
              Start free
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <Button
          aria-label="Toggle navigation"
          className="md:hidden"
          onClick={() => setOpen((value) => !value)}
          size="icon"
          type="button"
          variant="secondary"
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </Button>
      </nav>
      <div
        className={cn(
          "grid border-t border-white/10 bg-slate-950/95 transition-all md:hidden",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-2 px-4 py-4">
            {links.map((link) => (
              <a
                className="block rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.06] hover:text-white"
                href={link.href}
                key={link.href}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button asChild variant="secondary">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Start free</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
