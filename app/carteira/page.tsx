"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

// ======================================================================
// INTERFACES
// ======================================================================
interface Ativo {
  id: string;
  ticker: string;
  nome: string;
  tipo: "acao" | "fii" | "etf" | "cripto" | "renda_fixa";
  quantidade: number;
  preco_medio: number;
  corretora: string;
  preco_atual?: number;
  variacao?: number;
}

interface RendaFixa {
  id: string;
  nome: string;
  tipo: string;
  valor_inicial: number;
  valor_atual: number;
  taxa: string;
  vencimento: string;
  corretora: string;
}

// ======================================================================
// CONSTANTES
// ======================================================================
const TIPO_LABELS: Record<string, { label: string; icon: string; cor: string }> = {
  acao:       { label: "Ação",       icon: "📈", cor: "blue"   },
  fii:        { label: "FII",        icon: "🏢", cor: "purple" },
  etf:        { label: "ETF",        icon: "📊", cor: "cyan"   },
  cripto:     { label: "Cripto",     icon: "₿",  cor: "yellow" },
  renda_fixa: { label: "Renda Fixa", icon: "🔒", cor: "green"  },
};

// ======================================================================
// COMPONENTE
// ======================================================================
export default function CarteiraPage() {
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [rendaFixa, setRendaFixa] = useState<RendaFixa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>("todos");

  // ── Carregar ────────────────────────────────────────────────────────
  async function carregar() {
    setLoading(true);

    const { data: ativosData } = await supabase
      .from("ativos")
      .select("*")
      .order("created_at");

    const { data: rfData } = await supabase
      .from("renda_fixa")
      .select("*")
      .order("created_at");

    setAtivos(ativosData ?? []);
    setRendaFixa(rfData ?? []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  // ── Cálculos ────────────────────────────────────────────────────────
  const totalInvestido = ativos.reduce(
    (acc, a) => acc + Number(a.quantidade) * Number(a.preco_medio), 0
  );

  const totalRendaFixa = rendaFixa.reduce(
    (acc, r) => acc + Number(r.valor_atual), 0
  );

  const totalCarteira = totalInvestido + totalRendaFixa;

  const ativosFiltrados = filtro === "todos"
    ? ativos
    : ativos.filter((a) => a.tipo === filtro);

  // ── Distribuição por tipo ────────────────────────────────────────────
  const distribuicao = Object.keys(TIPO_LABELS).map((tipo) => {
    const total = ativos
      .filter((a) => a.tipo === tipo)
      .reduce((acc, a) => acc + Number(a.quantidade) * Number(a.preco_medio), 0);
    const pct = totalCarteira > 0 ? (total / totalCarteira) * 100 : 0;
    return { tipo, total, pct };
  });

  return (
    <div className="space-y-6">

      {/* ── CARDS RESUMO ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-600/5 border border-blue-500/20 rounded-2xl p-5 col-span-2">
          <p className="text-[#94a3b8] text-sm mb-1">Patrimônio Total</p>
          <p className="text-3xl font-bold text-blue-400">
            R$ {totalCarteira.toFixed(2)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-600/20 to-purple-600/5 border border-purple-500/20 rounded-2xl p-5">
          <p className="text-[#94a3b8] text-sm mb-1">Renda Variável</p>
          <p className="text-xl font-bold text-purple-400">
            R$ {totalInvestido.toFixed(2)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-600/20 to-green-600/5 border border-green-500/20 rounded-2xl p-5">
          <p className="text-[#94a3b8] text-sm mb-1">Renda Fixa</p>
          <p className="text-xl font-bold text-green-400">
            R$ {totalRendaFixa.toFixed(2)}
          </p>
        </div>
      </div>

      {/* ── DISTRIBUIÇÃO ────────────────────────────────────────────── */}
      {totalCarteira > 0 && (
        <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Distribuição da Carteira</h2>
          <div className="space-y-3">
            {distribuicao.filter((d) => d.total > 0).map((d) => {
              const info = TIPO_LABELS[d.tipo];
              return (
                <div key={d.tipo}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#94a3b8]">
                      {info.icon} {info.label}
                    </span>
                    <span className="text-white">
                      {d.pct.toFixed(1)}% · R$ {d.total.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full bg-${info.cor}-500`}
                      style={{ width: `${Math.min(d.pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── NAVEGAÇÃO RÁPIDA ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Ações & FIIs", href: "/acoes",      icon: "📈", desc: "Renda variável" },
          { label: "Criptomoedas", href: "/cripto",     icon: "₿",  desc: "Ativos digitais" },
          { label: "Renda Fixa",   href: "/renda-fixa", icon: "🔒", desc: "CDB, LCI, Tesouro" },
          { label: "Mercado",      href: "/mercado",    icon: "🌐", desc: "Cotações ao vivo" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="bg-[#1a1d2e] border border-white/5 hover:border-blue-500/30
                            rounded-2xl p-4 transition cursor-pointer">
              <span className="text-2xl">{item.icon}</span>
              <p className="text-white font-semibold text-sm mt-2">{item.label}</p>
              <p className="text-[#94a3b8] text-xs">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── HEADER + FILTROS ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h2 className="text-xl font-bold text-white">Meus Ativos</h2>
        <div className="flex bg-[#1a1d2e] border border-white/5 rounded-xl p-1 gap-1 flex-wrap">
          {["todos", "acao", "fii", "etf", "cripto"].map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition
                ${filtro === f
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                  : "text-[#94a3b8] hover:text-white"}`}
            >
              {f === "todos" ? "Todos" : TIPO_LABELS[f]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── LISTA DE ATIVOS ─────────────────────────────────────────── */}
      <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[#94a3b8]">Carregando...</div>
        ) : ativosFiltrados.length === 0 ? (
          <div className="p-10 text-center text-[#94a3b8]">
            <p className="text-4xl mb-2">📊</p>
            <p>Nenhum ativo cadastrado.</p>
            <p className="text-sm mt-1">Acesse Ações & FIIs ou Cripto para adicionar.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {ativosFiltrados.map((a) => {
              const valorTotal = Number(a.quantidade) * Number(a.preco_medio);
              const info = TIPO_LABELS[a.tipo];
              return (
                <li key={a.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                                    text-lg bg-${info.cor}-500/20 flex-shrink-0`}>
                      {info.icon}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{a.ticker}</p>
                      <p className="text-[#94a3b8] text-xs">
                        {info.label} · {a.quantidade} unid. · PM: R$ {Number(a.preco_medio).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">R$ {valorTotal.toFixed(2)}</p>
                    <p className="text-[#94a3b8] text-xs">{a.corretora}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}