import type { ReactNode } from "react";

import { DashboardNavbar } from "@/components/layout/dashboard-navbar";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { ProtectedRoute } from "@/features/auth/protected-route";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_85%_0%,rgba(244,114,182,0.14),transparent_25%)]" />
        <div className="relative flex">
          <DashboardSidebar />
          <div className="min-w-0 flex-1">
            <DashboardNavbar />
            {children}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
