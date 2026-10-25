import React, { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, LayoutDashboard } from "lucide-react";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      localStorage.setItem("dashboard-sidebar-collapsed", String(!value));
      return !value;
    });
  };

  const activeSection = items.find(({ id }) => id === activeItem) || items[0];
  const ActiveIcon = activeSection?.icon || LayoutDashboard;

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

      <div className="md:hidden">
        <button
          type="button"
          aria-expanded={mobileMenuOpen}
          aria-controls={`${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-mobile-sections`}
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="flex min-h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/50"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <ActiveIcon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</span>
              <span className="block truncate text-sm font-bold text-slate-900">{activeSection?.label || "Dashboard"}</span>
            </span>
          </span>
          {mobileMenuOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />}
        </button>
        {mobileMenuOpen && (
          <nav id={`${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-mobile-sections`} className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2" aria-label={`${title} sections`}>
            {items.map(({ id, label, icon: Icon }) => {
              const active = activeItem === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    onSelect(id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition ${active ? "bg-blue-600 text-white shadow-sm" : "bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700"}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate">{label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      <nav className="hidden flex-1 flex-col gap-1 md:flex" aria-label="Dashboard sections">
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
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          );
        })}
      </nav>
      {!collapsed && <p className="hidden px-2 pt-3 text-[10px] text-slate-400 md:block">JB &amp; Best Logistics</p>}
    </aside>
  );
};
