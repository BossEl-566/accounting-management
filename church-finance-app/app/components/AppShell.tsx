"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  BarChart3,
  CreditCard,
  FileText,
  HandCoins,
  LayoutDashboard,
  PiggyBank,
  Search,
  Settings,
} from "lucide-react";

const navItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Banks",
    href: "/banks",
    icon: Banknote,
  },
  {
    name: "Receipts",
    href: "/receipts",
    icon: FileText,
  },
  {
    name: "Payments",
    href: "/payments",
    icon: CreditCard,
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
  {
    name: "Savings",
    href: "/savings",
    icon: PiggyBank,
  },
];

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <aside className="fixed left-0 top-0 z-20 h-screen w-72 border-r border-slate-200 bg-white px-5 py-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <HandCoins size={23} />
          </div>

          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-950">
              Church Finance
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Local accounting system
            </p>
          </div>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  active
                    ? "bg-blue-50 text-blue-700 shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                ].join(" ")}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-5 right-5 rounded-3xl bg-gradient-to-br from-blue-700 to-blue-500 p-5 text-white shadow-xl shadow-blue-200">
          <p className="text-sm font-bold">Offline-first</p>
          <p className="mt-1 text-xs leading-5 text-blue-50">
            All records are saved locally on this computer using SQLite.
          </p>
        </div>
      </aside>

      <main className="ml-72 min-h-screen">
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-8 backdrop-blur">
          <div className="flex w-[420px] items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">
            <Search size={18} />
            <span className="text-sm">Search anything...</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full border border-slate-200 bg-white p-3 text-slate-600">
              <Settings size={18} />
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
              PF
            </div>
          </div>
        </header>

        <section className="p-8">{children}</section>
      </main>
    </div>
  );
}