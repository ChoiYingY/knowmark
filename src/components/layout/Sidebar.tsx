import { NavLink } from "react-router";
import { LayoutDashboard, BookOpen, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  return (
    <aside className="w-[220px] fixed h-full flex flex-col border-r border-border bg-sidebar-background text-sidebar-foreground">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight"><NavLink to="/">Knowmark</NavLink></h1>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        <NavLink
          to="/"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )
          }
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </NavLink>
        <NavLink
          to="/library"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )
          }
        >
          <BookOpen className="h-4 w-4" />
          Library
        </NavLink>
        <NavLink
          to="/reading-queue"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )
          }
        >
          <Clock className="h-4 w-4" />
          Reading Queue
        </NavLink>
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <span className="text-xs text-muted-foreground">v0.1.0 Beta</span>
      </div>
    </aside>
  );
}
