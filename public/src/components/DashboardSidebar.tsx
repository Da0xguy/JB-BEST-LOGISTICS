import React, { useState } from "react";
import { ChevronLeft, ChevronRight, LayoutDashboard } from "lucide-react";

export interface DashboardNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface DashboardSidebarProps {
  title: string;
  items: DashboardNavItem[];
  activeItem: string;
  onSelect: (id: string) => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  title,
  items,
  activeItem,
  onSelect,
}) => {
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem("dashboard-sidebar-collapsed") === "true",
  );

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      localStorage.setItem("dashboard-sidebar-collapsed", String(!value));
      return !value;
    });
  };

  return (
    <aside
      className={`sticky top-16 z-30 flex w-full shrink-0 flex-col border-b border-slate-200 bg-white p-2 md:h-[calc(100svh-4rem)] md:border-b-0 md:border-r md:p-3 ${collapsed ? "md:w-[4.5rem]" : "md:w-64"}`}
      aria-label={`${title} navigation`}
    >
      <div className={`mb-5 hidden items-center md:flex ${collapsed ? "justify-center" : "justify-between px-1"}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <LayoutDashboard className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{title}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Workspace</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex w-full flex-row gap-1 overflow-x-auto overscroll-x-contain pb-1 md:flex-1 md:flex-col md:overflow-visible md:pb-0" aria-label="Dashboard sections">
        {items.map(({ id, label, icon: Icon }) => {
          const active = activeItem === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-current={active ? "page" : undefined}
              aria-label={label}
              title={collapsed ? label : undefined}
              className={`flex min-h-10 min-w-max items-center gap-2 rounded-xl px-3 text-left text-xs font-semibold transition md:min-h-11 md:gap-3 md:text-sm ${collapsed ? "md:justify-center md:px-0" : ""} ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {collapsed ? (
                <span className="truncate md:hidden">{label}</span>
              ) : (
                <span className="truncate">{label}</span>
              )}
            </button>
          );
        })}
      </nav>
      {!collapsed && <p className="hidden px-2 pt-3 text-[10px] text-slate-400 md:block">JB &amp; Best Logistics</p>}
    </aside>
  );
};
