"use client";

import {
  BarChart3,
  FileText,
  History,
  MessageSquareText,
  Settings,
  Sparkles,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Brand } from "@/components/layout/brand";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, active: true, match: "exact" },
  { href: "/dashboard/documents", label: "Documents", icon: FileText, active: true, match: "library" },
  { href: "/dashboard/upload", label: "Upload", icon: Upload, active: true, match: "exact" },
  { href: "/dashboard/documents", label: "AI Chat", icon: MessageSquareText, active: true, match: "workspace" },
  { href: "/dashboard/documents", label: "History", icon: History, active: true, match: "workspace" },
  { href: "#", label: "Settings", icon: Settings, active: false, match: "none" },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-white/10 bg-slate-950/85 px-4 py-5 backdrop-blur-xl lg:block">
      <Brand className="px-2" />
      <div className="mt-8 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
        <div className="flex items-center gap-2 text-cyan-100">
          <Sparkles className="size-4" aria-hidden="true" />
          <p className="text-sm font-medium">Document Workspace</p>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          Upload PDFs, generate summaries, and ask questions from your indexed notes.
        </p>
      </div>
      <nav className="mt-6 space-y-1" aria-label="Dashboard navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isDocumentWorkspace = /^\/dashboard\/documents\/[^/]+/.test(pathname);
          const isActive =
            (item.match === "exact" && item.href === pathname) ||
            (item.match === "library" && pathname === "/dashboard/documents") ||
            (item.match === "workspace" && isDocumentWorkspace);
          return (
            <Link
              aria-disabled={!item.active}
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition",
                isActive
                  ? "bg-white/[0.09] text-white shadow-lg shadow-black/10"
                  : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200",
                !item.active && "cursor-default opacity-60",
              )}
              href={item.href}
              key={item.label}
            >
              <span className="flex items-center gap-3">
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </span>
              {!item.active ? <Badge className="px-2 py-0.5">Soon</Badge> : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
