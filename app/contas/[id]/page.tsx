"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface Conta {
  id: string;
  nome: string;
  tipo: string;
  banco: string;
  saldo: number;
  limite: number;
  vencimento: number;
  fechamento: number;
  cor: string;
}

interface Fatura {
  id: string;
  mes: number;
  ano: number;
  total: number;
  pago: boolean;
}

interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
  tipo: string;
}

const MESES = [
  "Jan","Fev","Mar","Abr","Mai","Jun",
  "Jul","Ago","Set","Out","Nov","Dez"
];

export default function ContaDetalhePage() {
  const { id } = useParams();
  const [conta, setConta] = useState<Conta | null>(null);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [faturaSel, setFaturaSel] = useState<Fatura | null>(null);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);

    const { data: contaData } = await supabase
      .from("contas").select("*").eq("id", id).single();
    setConta(contaData);

    if (contaData?.tipo === "cartao") {
      const { data: faturasData } = await supabase
        .from("faturas")
        .select("*")
        .eq("conta_id", id)
        .order("ano", { ascending: false })
        .order("mes", { ascending: false });
      setFaturas(faturasData ?? []);
      setFaturaSel(faturasData?.[0] ?? null);
    }

    const { data: transData } = await supabase
      .from("transacoes")
      .select("*")
      .eq("conta", contaData?.nome)
      .order("data", { ascending: false });
    setTransacoes(transData ?? []);

    setLoading(false);
  }

  useEffect(() => { if (id) carregar(); }, [id]);

  if (loading) return <div className="p-6 text-[#94a3b8]">Carregando...</div>;
  if (!conta) return <div className="p-6 text-red-400">Conta não encontrada.</div>;

  const transacoesFatura = faturaSel
    ? transacoes.filter((t) => {
        const d = new Date(t.data + "T12:00:00");
        return d.getMonth() + 1 === faturaSel.mes && d.getFullYear() === faturaSel.ano;
      })
    : [];

  return (
    <div className="space-y-6">

      {/* Card da conta */}
      <div
        className="rounded-2xl p-6 text-white shadow-xl"
        style={{ background: `linear-gradient(135deg, ${conta.cor}99, ${conta.cor}33)` }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-white/70 text-sm">{conta.banco}</p>
            <h1 className="text-2xl font-bold">{conta.nome}</h1>
          </div>
          <span className="text-4xl">
            {conta.tipo === "cartao" ? "💳" : conta.tipo === "poupanca" ? "🐷" : "🏦"}
          </span>
        </div>

        {conta.tipo === "cartao" ? (
          <div>
            <p className="text-white/70 text-sm">Limite total</p>
            <p className="text-3xl font-bold">R$ {Number(conta.limite).toFixed(2)}</p>
            <div className="flex gap-6 mt-3 text-sm text-white/70">
              <span>Fecha dia {conta.fechamento}</span>
              <span>Vence dia {conta.vencimento}</span>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-white/70 text-sm">Saldo atual</p>
            <p className="text-3xl font-bold">R$ {Number(conta.saldo).toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* Faturas (só cartão) */}
      {conta.tipo === "cartao" && faturas.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-white font-semibold">Faturas</h2>

          {/* Seletor de fatura */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {faturas.map((f) => (
              <button
                key={f.id}
                onClick={() => setFaturaSel(f)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition
                  ${faturaSel?.id === f.id
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                    : "bg-[#1a1d2e] border border-white/10 text-[#94a3b8] hover:text-white"}`}
              >
                {MESES[f.mes - 1]}/{f.ano}
              </button>
            ))}
          </div>

          {/* Fatura selecionada */}
          {faturaSel && (
            <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#94a3b8] text-sm">Total da fatura</p>
                  <p className="text-2xl font-bold text-white">
                    R$ {transacoesFatura.reduce((a, t) => a + Number(t.valor), 0).toFixed(2)}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium
                  ${faturaSel.pago
                    ? "bg-green-500/20 text-green-400"
                    : "bg-yellow-500/20 text-yellow-400"}`}
                >
                  {faturaSel.pago ? "✅ Paga" : "⏳ Pendente"}
                </span>
              </div>

              {/* Transações da fatura */}
              {transacoesFatura.length === 0 ? (
                <p className="text-[#94a3b8] text-sm text-center py-4">
                  Nenhuma transação neste mês.
                </p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {transacoesFatura.map((t) => (
                    <li key={t.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-white text-sm font-medium">{t.descricao}</p>
                        <p className="text-[#94a3b8] text-xs">{t.categoria} · {new Date(t.data + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                      </div>
                      <p className="text-red-400 font-semibold text-sm">
                        - R$ {Number(t.valor).toFixed(2)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Extrato (contas normais) */}
      {conta.tipo !== "cartao" && (
        <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/5">
            <h2 className="text-white font-semibold">Extrato</h2>
          </div>
          {transacoes.length === 0 ? (
            <div className="p-8 text-center text-[#94a3b8]">
              <p className="text-3xl mb-2">📋</p>
              <p>Nenhuma transação ainda.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {transacoes.map((t) => (
                <li key={t.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-white text-sm font-medium">{t.descricao}</p>
                    <p className="text-[#94a3b8] text-xs">
                      {t.categoria} · {new Date(t.data + "T12:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <p className={`font-bold text-sm ${t.tipo === "receita" ? "text-green-400" : "text-red-400"}`}>
                    {t.tipo === "receita" ? "+" : "-"} R$ {Number(t.valor).toFixed(2)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}