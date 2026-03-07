"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

// ======================================================================
// INTERFACES
// ======================================================================
interface Transacao {
  tipo: string;
  valor: number;
  descricao: string;
  categoria: string;
  data: string;
  pago: boolean;
}

interface Meta {
  id: string;
  nome: string;
  icone: string;
  valor_alvo: number;
  valor_atual: number;
  cor: string;
  concluida: boolean;
}

// ======================================================================
// HELPERS
// ======================================================================
const MESES_CURTOS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ======================================================================
// COMPONENTE
// ======================================================================
export default function DashboardPage() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      const [{ data: tData }, { data: mData }] = await Promise.all([
        supabase.from("transacoes").select("*").order("data", { ascending: false }).limit(200),
        supabase.from("metas").select("*").eq("concluida", false).limit(3),
      ]);
      setTransacoes(tData ?? []);
      setMetas(mData ?? []);
      setLoading(false);
    }
    carregar();
  }, []);

  // ── Cálculos gerais ─────────────────────────────────────────────────
  const totalReceitas = transacoes
    .filter((t) => t.tipo === "receita" && t.pago)
    .reduce((acc, t) => acc + Number(t.valor), 0);

  const totalDespesas = transacoes
    .filter((t) => t.tipo === "despesa" && t.pago)
    .reduce((acc, t) => acc + Number(t.valor), 0);

  const saldo = totalReceitas - totalDespesas;

  const pendentes = transacoes
    .filter((t) => !t.pago)
    .reduce((acc, t) => acc + Number(t.valor), 0);

  // ── Evolução últimos 6 meses ─────────────────────────────────────────
  const hoje = new Date();
  const ultimos6Meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1);
    return { mes: d.getMonth(), ano: d.getFullYear(), label: MESES_CURTOS[d.getMonth()] };
  });

  const evolucao = ultimos6Meses.map(({ mes, ano, label }) => {
    const receitas = transacoes
      .filter((t) => {
        const d = new Date(t.data + "T12:00:00");
        return t.tipo === "receita" && d.getMonth() === mes && d.getFullYear() === ano;
      })
      .reduce((acc, t) => acc + Number(t.valor), 0);

    const despesas = transacoes
      .filter((t) => {
        const d = new Date(t.data + "T12:00:00");
        return t.tipo === "despesa" && d.getMonth() === mes && d.getFullYear() === ano;
      })
      .reduce((acc, t) => acc + Number(t.valor), 0);

    return { label, receitas, despesas };
  });

  const maxEvolucao = Math.max(...evolucao.flatMap((e) => [e.receitas, e.despesas]), 1);

  // ── Gastos por categoria ─────────────────────────────────────────────
  const categoriaMap: Record<string, number> = {};
  transacoes
    .filter((t) => t.tipo === "despesa")
    .forEach((t) => {
      const cat = t.categoria || "Outros";
      categoriaMap[cat] = (categoriaMap[cat] ?? 0) + Number(t.valor);
    });

  const categorias = Object.entries(categoriaMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxCat = categorias[0]?.[1] ?? 1;

  const CORES_CAT = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

  return (
    <div className="space-y-6">

      {/* ── CARDS PRINCIPAIS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Receitas",   valor: totalReceitas, cor: "green",  icon: "📈", prefix: "+" },
          { label: "Despesas",   valor: totalDespesas, cor: "red",    icon: "📉", prefix: "-" },
          { label: "Saldo",      valor: saldo,         cor: saldo >= 0 ? "blue" : "red", icon: "💰", prefix: "" },
          { label: "Pendentes",  valor: pendentes,     cor: "yellow", icon: "⏳", prefix: ""  },
        ].map((card) => (
          <div
            key={card.label}
            className={`bg-gradient-to-br from-${card.cor}-600/20 to-${card.cor}-600/5
                        border border-${card.cor}-500/20 rounded-2xl p-5`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#94a3b8] text-sm">{card.label}</span>
              <span className="text-xl">{card.icon}</span>
            </div>
            <p className={`text-xl font-bold text-${card.cor}-400`}>
              {card.prefix}R$ {Math.abs(card.valor).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* ── GRÁFICO: EVOLUÇÃO 6 MESES ───────────────────────────────── */}
      <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-6">Evolução dos Últimos 6 Meses</h2>

        <div className="flex items-end gap-3 h-40">
          {evolucao.map((e) => (
            <div key={e.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-1 items-end h-32">
                {/* Barra receita */}
                <div className="flex-1 flex flex-col justify-end">
                  <div
                    className="w-full bg-green-500/70 rounded-t-sm transition-all duration-500"
                    style={{ height: `${(e.receitas / maxEvolucao) * 100}%` }}
                    title={`Receitas: R$ ${e.receitas.toFixed(2)}`}
                  />
                </div>
                {/* Barra despesa */}
                <div className="flex-1 flex flex-col justify-end">
                  <div
                    className="w-full bg-red-500/70 rounded-t-sm transition-all duration-500"
                    style={{ height: `${(e.despesas / maxEvolucao) * 100}%` }}
                    title={`Despesas: R$ ${e.despesas.toFixed(2)}`}
                  />
                </div>
              </div>
              <span className="text-[#94a3b8] text-xs">{e.label}</span>
            </div>
          ))}
        </div>

        {/* Legenda */}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-green-500/70" />
            <span className="text-[#94a3b8] text-xs">Receitas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-red-500/70" />
            <span className="text-[#94a3b8] text-xs">Despesas</span>
          </div>
        </div>
      </div>

      {/* ── GRID: CATEGORIAS + METAS ────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Gastos por categoria */}
        <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Top Categorias de Gastos</h2>
          {categorias.length === 0 ? (
            <p className="text-[#94a3b8] text-sm text-center py-6">
              Nenhum gasto registrado ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {categorias.map(([cat, valor], i) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#94a3b8]">{cat}</span>
                    <span className="text-white font-medium">R$ {valor.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${(valor / maxCat) * 100}%`,
                        backgroundColor: CORES_CAT[i],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Metas em progresso */}
        <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Metas em Progresso</h2>
            <Link href="/metas" className="text-blue-400 text-xs hover:text-blue-300">
              Ver todas →
            </Link>
          </div>
          {metas.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-[#94a3b8] text-sm">Nenhuma meta ativa.</p>
              <Link
                href="/metas"
                className="text-blue-400 text-xs mt-2 inline-block hover:text-blue-300"
              >
                + Criar meta
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {metas.map((meta) => {
                const pct = Math.min(
                  (Number(meta.valor_atual) / Number(meta.valor_alvo)) * 100, 100
                );
                return (
                  <div key={meta.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span>{meta.icone}</span>
                        <span className="text-white text-sm font-medium">{meta.nome}</span>
                      </div>
                      <span className="text-[#94a3b8] text-xs">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: meta.cor }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-[#94a3b8] mt-1">
                      <span>R$ {Number(meta.valor_atual).toFixed(2)}</span>
                      <span>R$ {Number(meta.valor_alvo).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── ÚLTIMAS TRANSAÇÕES ──────────────────────────────────────── */}
      <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-white font-semibold">Últimas Transações</h2>
          <Link href="/transacoes" className="text-blue-400 text-xs hover:text-blue-300">
            Ver todas →
          </Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-[#94a3b8]">Carregando...</div>
        ) : transacoes.length === 0 ? (
          <div className="p-8 text-center text-[#94a3b8]">
            <p className="text-4xl mb-2">💸</p>
            <p>Nenhuma transação ainda.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {transacoes.slice(0, 6).map((t, i) => (
              <li key={i} className="flex items-center justify-between p-4 hover:bg-white/5 transition">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0
                    ${t.tipo === "receita" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                  >
                    {t.tipo === "receita" ? "📈" : "📉"}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{t.descricao}</p>
                    <p className="text-[#94a3b8] text-xs">
                      {t.categoria} · {new Date(t.data + "T12:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${t.tipo === "receita" ? "text-green-400" : "text-red-400"}`}>
                    {t.tipo === "receita" ? "+" : "-"} R$ {Number(t.valor).toFixed(2)}
                  </p>
                  <span className={`text-xs ${t.pago ? "text-green-400" : "text-yellow-400"}`}>
                    {t.pago ? "Pago" : "Pendente"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}