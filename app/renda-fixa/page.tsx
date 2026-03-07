"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { v4 as uuidv4 } from "uuid";

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

const TIPOS_RF = ["CDB", "LCI", "LCA", "Tesouro Direto", "Debenture", "CRI", "CRA", "Poupança"];
const CORRETORAS_RF = ["XP", "Rico", "BTG", "Nubank", "Inter", "Itaú", "Bradesco", "Outro"];

export default function RendaFixaPage() {
  const [ativos, setAtivos] = useState<RendaFixa[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("CDB");
  const [valorInicial, setValorInicial] = useState("");
  const [valorAtual, setValorAtual] = useState("");
  const [taxa, setTaxa] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [corretora, setCorretora] = useState("XP");

  async function carregar() {
    setLoading(true);
    const { data } = await supabase
      .from("renda_fixa")
      .select("*")
      .order("vencimento");
    setAtivos(data ?? []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);

    const { error } = await supabase.from("renda_fixa").insert({
      id:            uuidv4(),
      nome,
      tipo,
      valor_inicial: Number(valorInicial),
      valor_atual:   Number(valorAtual) || Number(valorInicial),
      taxa,
      vencimento:    vencimento || null,
      corretora,
    });

    if (error) { alert("Erro: " + error.message); setSalvando(false); return; }

    setNome(""); setTipo("CDB"); setValorInicial("");
    setValorAtual(""); setTaxa(""); setVencimento("");
    setOpenModal(false); setSalvando(false);
    await carregar();
  }

  const totalInvestido = ativos.reduce((acc, a) => acc + Number(a.valor_inicial), 0);
  const totalAtual = ativos.reduce((acc, a) => acc + Number(a.valor_atual), 0);
  const lucro = totalAtual - totalInvestido;
  const pct = totalInvestido > 0 ? (lucro / totalInvestido) * 100 : 0;

  const hoje = new Date();

  return (
    <div className="space-y-6">

      {/* Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-600/20 to-green-600/5 border border-green-500/20 rounded-2xl p-5">
          <p className="text-[#94a3b8] text-sm mb-1">Investido</p>
          <p className="text-xl font-bold text-green-400">R$ {totalInvestido.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-5">
          <p className="text-[#94a3b8] text-sm mb-1">Valor Atual</p>
          <p className="text-xl font-bold text-emerald-400">R$ {totalAtual.toFixed(2)}</p>
        </div>
        <div className={`bg-gradient-to-br border rounded-2xl p-5
          ${pct >= 0
            ? "from-teal-600/20 to-teal-600/5 border-teal-500/20"
            : "from-red-600/20 to-red-600/5 border-red-500/20"}`}
        >
          <p className="text-[#94a3b8] text-sm mb-1">Rendimento</p>
          <p className={`text-xl font-bold ${pct >= 0 ? "text-teal-400" : "text-red-400"}`}>
            {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">🔒 Renda Fixa</h1>
        <button
          onClick={() => setOpenModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm
                     bg-gradient-to-r from-green-600 to-emerald-600 text-white"
        >
          + Adicionar
        </button>
      </div>

      {/* Lista */}
      <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[#94a3b8]">Carregando...</div>
        ) : ativos.length === 0 ? (
          <div className="p-10 text-center text-[#94a3b8]">
            <p className="text-4xl mb-2">🔒</p>
            <p>Nenhum ativo de renda fixa.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {ativos.map((a) => {
              const venc = a.vencimento ? new Date(a.vencimento + "T12:00:00") : null;
              const vencido = venc ? venc < hoje : false;
              const diasRestantes = venc
                ? Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
                : null;
              const lucroAtivo = Number(a.valor_atual) - Number(a.valor_inicial);
              const pctAtivo = Number(a.valor_inicial) > 0
                ? (lucroAtivo / Number(a.valor_inicial)) * 100
                : 0;

              return (
                <li key={a.id} className="p-4 hover:bg-white/5 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-xs flex-shrink-0">
                        {a.tipo.slice(0, 3)}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{a.nome}</p>
                        <p className="text-[#94a3b8] text-xs">
                          {a.tipo} · {a.taxa} · {a.corretora}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">R$ {Number(a.valor_atual).toFixed(2)}</p>
                      <p className={`text-xs ${pctAtivo >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {pctAtivo >= 0 ? "+" : ""}{pctAtivo.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  {/* Vencimento */}
                  {venc && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full
                        ${vencido
                          ? "bg-red-500/20 text-red-400"
                          : diasRestantes && diasRestantes <= 30
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-green-500/20 text-green-400"}`}
                      >
                        {vencido
                          ? "⚠️ Vencido"
                          : `Vence em ${diasRestantes}d — ${venc.toLocaleDateString("pt-BR")}`}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Modal */}
      {openModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end lg:items-center z-50"
          onClick={() => setOpenModal(false)}
        >
          <div
            className="bg-[#1a1d2e] border border-white/10 w-full lg:w-[480px]
                       p-6 rounded-t-3xl lg:rounded-2xl shadow-2xl space-y-4
                       max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white">Adicionar Renda Fixa</h2>

            {/* Tipos */}
            <div className="flex gap-2 flex-wrap">
              {TIPOS_RF.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition
                    ${tipo === t
                      ? "border-green-500 bg-green-500/20 text-green-400"
                      : "border-white/10 text-[#94a3b8] hover:text-white"}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <form onSubmit={salvar} className="space-y-3">
              <input
                type="text"
                placeholder="Nome (ex: CDB Nubank 110% CDI)"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3
                           text-white placeholder-[#94a3b8]"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Valor investido (R$)"
                  value={valorInicial}
                  onChange={(e) => setValorInicial(e.target.value)}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3
                             text-white placeholder-[#94a3b8]"
                  required step="0.01" min="0"
                />
                <input
                  type="number"
                  placeholder="Valor atual (R$)"
                  value={valorAtual}
                  onChange={(e) => setValorAtual(e.target.value)}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3
                             text-white placeholder-[#94a3b8]"
                  step="0.01" min="0"
                />
              </div>

              <input
                type="text"
                placeholder="Taxa (ex: CDI + 0,5% ou IPCA + 6%)"
                value={taxa}
                onChange={(e) => setTaxa(e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3
                           text-white placeholder-[#94a3b8]"
              />

              <input
                type="date"
                placeholder="Vencimento"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3 text-white"
              />

              <select
                value={corretora}
                onChange={(e) => setCorretora(e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3 text-white"
              >
                {CORRETORAS_RF.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <button
                type="submit"
                disabled={salvando}
                className="w-full py-3 rounded-xl font-semibold text-white
                           bg-gradient-to-r from-green-600 to-emerald-600 disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "Adicionar Ativo"}
              </button>
              <button
                type="button"
                className="w-full py-3 rounded-xl text-[#94a3b8] border border-white/10"
                onClick={() => setOpenModal(false)}
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}