"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CoachIA } from "./CoachIA";

// ── MENU DE NAVEGAÇÃO ──────────────────────────────────────────────────
const menu = [
  {
    section: "PRINCIPAL",
    items: [
      { name: "Dashboard",          href: "/dashboard",         icon: "🏠" },
      { name: "Receitas & Despesas", href: "/transacoes",        icon: "💸" },
      { name: "Contas & Cartões",   href: "/contas",            icon: "💳" },
      { name: "Orçamentos",         href: "/orcamentos",        icon: "📊" },
    ],
  },
  {
    section: "INVESTIMENTOS",
    items: [
      { name: "Carteira",     href: "/carteira",     icon: "👜" },
      { name: "Ações & FIIs", href: "/acoes",        icon: "📈" },
      { name: "Criptomoedas", href: "/cripto",       icon: "₿"  },
      { name: "Renda Fixa",   href: "/renda-fixa",   icon: "🔒" },
    ],
  },
  {
    section: "PLANEJAMENTO",
    items: [
      { name: "Metas & Planos", href: "/metas",   icon: "🎯" },
      { name: "Mercado",        href: "/mercado",  icon: "🌐" },
    ],
  },
];

// ── COMPONENTE PRINCIPAL ───────────────────────────────────────────────
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f1117]">

      {/* ── OVERLAY MOBILE ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── SIDEBAR ────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          bg-[#1a1d2e] border-r border-white/5
          transition-all duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:static lg:translate-x-0
          ${collapsed ? "lg:w-16" : "lg:w-64"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/5">
          {!collapsed && (
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              FinanceApp
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg
                       text-[#94a3b8] hover:text-white hover:bg-white/10 transition"
          >
            {collapsed ? "▶" : "◀"}
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-[#94a3b8] hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
          {menu.map((group) => (
            <div key={group.section}>
              {!collapsed && (
                <p className="text-[10px] font-semibold tracking-widest text-[#94a3b8] px-3 mb-2">
                  {group.section}
                </p>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-xl
                          transition-all duration-200 text-sm font-medium
                          ${active
                            ? "bg-gradient-to-r from-blue-600/30 to-purple-600/30 text-white border border-blue-500/30"
                            : "text-[#94a3b8] hover:text-white hover:bg-white/5"
                          }
                        `}
                      >
                        <span className="text-lg flex-shrink-0">{item.icon}</span>
                        {!collapsed && (
                          <span className="truncate">{item.name}</span>
                        )}
                        {active && !collapsed && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer Sidebar */}
        {!collapsed && (
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                V
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-white truncate">Vitor</p>
                <p className="text-xs text-[#94a3b8] truncate">Minha Conta</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── MAIN ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4
                           bg-[#1a1d2e] border-b border-white/5 flex-shrink-0">
          {/* Hamburguer mobile */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-[#94a3b8] hover:text-white text-xl"
          >
            ☰
          </button>

          {/* Título da página atual */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-[#94a3b8] text-sm">
              {menu.flatMap((g) => g.items).find((i) => isActive(i.href))?.icon}
            </span>
            <span className="text-white font-semibold">
              {menu.flatMap((g) => g.items).find((i) => isActive(i.href))?.name ?? "App"}
            </span>
          </div>

          {/* Botão lançamento rápido */}
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm
                       bg-gradient-to-r from-blue-600 to-purple-600
                       hover:from-blue-500 hover:to-purple-500
                       text-white shadow-lg shadow-blue-900/30 transition"
          >
            <span className="text-lg">+</span>
            <span className="hidden sm:inline">Lançamento Rápido</span>
          </button>
        </header>

        {/* Conteúdo das páginas */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Coach IA Financeiro — Widget flutuante */}
      <CoachIA />

    </div>
  );
}