"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { v4 as uuidv4 } from "uuid";

// ======================================================================
// INTERFACES
// ======================================================================
interface Ativo {
  id: string;
  ticker: string;
  nome: string;
  tipo: "acao" | "fii" | "etf";
  quantidade: number;
  preco_medio: number;
  corretora: string;
}

interface Cotacao {
  ticker: string;
  preco: number;
  variacao: number;
}

const CORRETORAS = [
  "XP Investimentos", "Clear", "Rico", "BTG Pactual",
  "Nubank", "Inter", "Itaú", "Bradesco", "Outro",
];

// ======================================================================
// COMPONENTE
// ======================================================================
export default function AcoesPage() {
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [cotacoes, setCotacoes] = useState<Record<string, Cotacao>>({});
  const [loading, setLoading] = useState(true);
  const [carregandoCotacoes, setCarregandoCotacoes] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [filtro, setFiltro] = useState<"acao" | "fii" | "etf">("acao");

  // Form
  const [ticker, setTicker] = useState("");
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"acao" | "fii" | "etf">("acao");
  const [quantidade, setQuantidade] = useState("");
  const [precoMedio, setPrecoMedio] = useState("");
  const [corretora, setCorretora] = useState("XP Investimentos");

  // ── Carregar ────────────────────────────────────────────────────────
  async function carregar() {
    setLoading(true);
    const { data } = await supabase
      .from("ativos")
      .select("*")
      .in("tipo", ["acao", "fii", "etf"])
      .order("ticker");
    setAtivos(data ?? []);
    setLoading(false);

    // Buscar cotações
    if ((data ?? []).length > 0) {
      buscarCotacoes(data ?? []);
    }
  }

  // ── Cotações via BrAPI ───────────────────────────────────────────────
  async function buscarCotacoes(lista: Ativo[]) {
    setCarregandoCotacoes(true);
    try {
      const tickers = lista.map((a) => a.ticker + ".SA").join(",");
      const res = await fetch(
        `https://brapi.dev/api/quote/${tickers}?token=demo`
      );
      const json = await res.json();

      if (json.results) {
        const mapa: Record<string, Cotacao> = {};
        json.results.forEach((r: any) => {
          const t = r.symbol.replace(".SA", "");
          mapa[t] = {
            ticker: t,
            preco: r.regularMarketPrice ?? 0,
            variacao: r.regularMarketChangePercent ?? 0,
          };
        });
        setCotacoes(mapa);
      }
    } catch {
      // BrAPI indisponível — cotações não carregadas
    } finally {
      setCarregandoCotacoes(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  // ── Salvar ──────────────────────────────────────────────────────────
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);

    const { error } = await supabase.from("ativos").insert({
      id:          uuidv4(),
      ticker:      ticker.toUpperCase(),
      nome,
      tipo,
      quantidade:  Number(quantidade),
      preco_medio: Number(precoMedio),
      corretora,
    });

    if (error) { alert("Erro: " + error.message); setSalvando(false); return; }

    setTicker(""); setNome(""); setQuantidade("");
    setPrecoMedio(""); setCorretora("XP Investimentos");
    setOpenModal(false);
    setSalvando(false);
    await carregar();
  }

  // ── Cálculos ────────────────────────────────────────────────────────
  const ativosFiltrados = ativos.filter((a) => a.tipo === filtro);

  const totalInvestido = ativosFiltrados.reduce(
    (acc, a) => acc + Number(a.quantidade) * Number(a.preco_medio), 0
  );

  const totalAtual = ativosFiltrados.reduce((acc, a) => {
    const cotacao = cotacoes[a.ticker];
    const preco = cotacao?.preco ?? Number(a.preco_medio);
    return acc + Number(a.quantidade) * preco;
  }, 0);

  const rentabilidade = totalInvestido > 0
    ? ((totalAtual - totalInvestido) / totalInvestido) * 100
    : 0;

  return (
    <div className="space-y-6">

      {/* ── CARDS ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-600/5 border border-blue-500/20 rounded-2xl p-5">
          <p className="text-[#94a3b8] text-sm mb-1">Investido</p>
          <p className="text-xl font-bold text-blue-400">R$ {totalInvestido.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-600/20 to-purple-600/5 border border-purple-500/20 rounded-2xl p-5">
          <p className="text-[#94a3b8] text-sm mb-1">Valor Atual</p>
          <p className="text-xl font-bold text-purple-400">R$ {totalAtual.toFixed(2)}</p>
          {carregandoCotacoes && (
            <p className="text-[#94a3b8] text-xs mt-1">Atualizando...</p>
          )}
        </div>
        <div className={`bg-gradient-to-br border rounded-2xl p-5
          ${rentabilidade >= 0
            ? "from-green-600/20 to-green-600/5 border-green-500/20"
            : "from-red-600/20 to-red-600/5 border-red-500/20"}`}
        >
          <p className="text-[#94a3b8] text-sm mb-1">Rentabilidade</p>
          <p className={`text-xl font-bold ${rentabilidade >= 0 ? "text-green-400" : "text-red-400"}`}>
            {rentabilidade >= 0 ? "+" : ""}{rentabilidade.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* ── FILTRO + BOTÃO ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex bg-[#1a1d2e] border border-white/5 rounded-xl p-1 gap-1">
          {(["acao", "fii", "etf"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition
                ${filtro === f
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                  : "text-[#94a3b8] hover:text-white"}`}
            >
              {f === "acao" ? "📈 Ações" : f === "fii" ? "🏢 FIIs" : "📊 ETFs"}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setTipo(filtro); setOpenModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm
                     bg-gradient-to-r from-blue-600 to-purple-600 text-white"
        >
          + Adicionar Ativo
        </button>
      </div>

      {/* ── LISTA ───────────────────────────────────────────────────── */}
      <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[#94a3b8]">Carregando...</div>
        ) : ativosFiltrados.length === 0 ? (
          <div className="p-10 text-center text-[#94a3b8]">
            <p className="text-4xl mb-2">📊</p>
            <p>Nenhum ativo cadastrado ainda.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {ativosFiltrados.map((a) => {
              const cotacao = cotacoes[a.ticker];
              const precoAtual = cotacao?.preco ?? Number(a.preco_medio);
              const valorAtual = Number(a.quantidade) * precoAtual;
              const valorInvestido = Number(a.quantidade) * Number(a.preco_medio);
              const lucro = valorAtual - valorInvestido;
              const pct = valorInvestido > 0 ? (lucro / valorInvestido) * 100 : 0;

              return (
                <li key={a.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center font-bold text-blue-400 text-xs flex-shrink-0">
                      {a.ticker.slice(0, 4)}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{a.ticker}</p>
                      <p className="text-[#94a3b8] text-xs">
                        {a.quantidade} cotas · PM R$ {Number(a.preco_medio).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">R$ {valorAtual.toFixed(2)}</p>
                    <p className={`text-xs font-medium ${pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                      {cotacao && (
                        <span className="text-[#94a3b8] ml-1">
                          · R$ {cotacao.preco.toFixed(2)}
                        </span>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── MODAL ADICIONAR ATIVO ────────────────────────────────────── */}
      {openModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end lg:items-center z-50"
          onClick={() => setOpenModal(false)}
        >
          <div
            className="bg-[#1a1d2e] border border-white/10 w-full lg:w-[480px]
                       p-6 rounded-t-3xl lg:rounded-2xl shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white">Adicionar Ativo</h2>

            {/* Toggle tipo */}
            <div className="flex bg-[#0f1117] border border-white/10 rounded-xl p-1 gap-1">
              {(["acao", "fii", "etf"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition
                    ${tipo === t
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                      : "text-[#94a3b8] hover:text-white"}`}
                >
                  {t === "acao" ? "📈 Ação" : t === "fii" ? "🏢 FII" : "📊 ETF"}
                </button>
              ))}
            </div>

            <form onSubmit={salvar} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Ticker (ex: PETR4)"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3
                             text-white placeholder-[#94a3b8] uppercase"
                  required
                />
                <input
                  type="text"
                  placeholder="Nome (ex: Petrobras)"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3
                             text-white placeholder-[#94a3b8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Quantidade"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3
                             text-white placeholder-[#94a3b8]"
                  required min="0" step="1"
                />
                <input
                  type="number"
                  placeholder="Preço médio (R$)"
                  value={precoMedio}
                  onChange={(e) => setPrecoMedio(e.target.value)}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3
                             text-white placeholder-[#94a3b8]"
                  required min="0" step="0.01"
                />
              </div>

              <select
                value={corretora}
                onChange={(e) => setCorretora(e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3 text-white"
              >
                {CORRETORAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <button
                type="submit"
                disabled={salvando}
                className="w-full py-3 rounded-xl font-semibold text-white
                           bg-gradient-to-r from-blue-600 to-purple-600 disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "Adicionar à Carteira"}
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