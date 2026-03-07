"use client";

import { useEffect, useState } from "react";

// ======================================================================
// INTERFACES
// ======================================================================
interface Ativo {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  volume?: string;
}

interface CriptoCotacao {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  changePct24h: number;
  marketCapUsd: number;
}

// ======================================================================
// CONSTANTES
// ======================================================================
const ACOES_MONITORADAS = [
  "PETR4", "VALE3", "ITUB4", "BBDC4", "ABEV3",
  "WEGE3", "RENT3", "MGLU3", "BBAS3", "SUZB3",
];

const CRIPTO_MONITORADAS = [
  "bitcoin", "ethereum", "binancecoin",
  "solana", "cardano", "dogecoin",
];

const INDICES = [
  { label: "IBOVESPA", symbol: "^BVSP" },
  { label: "S&P 500",  symbol: "^GSPC" },
  { label: "NASDAQ",   symbol: "^IXIC"  },
  { label: "Dólar",    symbol: "USDBRL" },
];

// ======================================================================
// COMPONENTE
// ======================================================================
export default function MercadoPage() {
  const [acoes, setAcoes] = useState<Ativo[]>([]);
  const [criptos, setCriptos] = useState<CriptoCotacao[]>([]);
  const [usdBrl, setUsdBrl] = useState(0);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<"acoes" | "cripto">("acoes");
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  // ── Buscar cotações ─────────────────────────────────────────────────
  async function buscarDados() {
    setLoading(true);
    try {
      await Promise.all([buscarAcoes(), buscarCriptos(), buscarDolar()]);
      setUltimaAtualizacao(new Date());
    } finally {
      setLoading(false);
    }
  }

  async function buscarAcoes() {
    try {
      const tickers = ACOES_MONITORADAS.map((t) => t + ".SA").join(",");
      const res = await fetch(
        `https://brapi.dev/api/quote/${tickers}?token=demo`
      );
      const json = await res.json();
      if (json.results) {
        setAcoes(
          json.results.map((r: any) => ({
            symbol:    r.symbol.replace(".SA", ""),
            name:      r.longName ?? r.symbol,
            price:     r.regularMarketPrice ?? 0,
            change:    r.regularMarketChange ?? 0,
            changePct: r.regularMarketChangePercent ?? 0,
            volume:    r.regularMarketVolume
              ? (r.regularMarketVolume / 1e6).toFixed(1) + "M"
              : "-",
          }))
        );
      }
    } catch { /* API indisponível */ }
  }

  async function buscarCriptos() {
    try {
      const res = await fetch(
        `https://api.coincap.io/v2/assets?ids=${CRIPTO_MONITORADAS.join(",")}&limit=10`
      );
      const json = await res.json();
      if (json.data) {
        setCriptos(
          json.data.map((c: any) => ({
            id:          c.id,
            symbol:      c.symbol,
            name:        c.name,
            priceUsd:    Number(c.priceUsd),
            changePct24h: Number(c.changePercent24Hr),
            marketCapUsd: Number(c.marketCapUsd),
          }))
        );
      }
    } catch { /* API indisponível */ }
  }

  async function buscarDolar() {
    try {
      const res = await fetch(
        "https://economia.awesomeapi.com.br/json/last/USD-BRL"
      );
      const json = await res.json();
      if (json.USDBRL) setUsdBrl(Number(json.USDBRL.bid));
    } catch { /* API indisponível */ }
  }

  useEffect(() => {
    buscarDados();
    // Atualizar a cada 60 segundos
    const interval = setInterval(buscarDados, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🌐 Mercado</h1>
          {ultimaAtualizacao && (
            <p className="text-[#94a3b8] text-xs mt-1">
              Atualizado às {ultimaAtualizacao.toLocaleTimeString("pt-BR")} · Auto-refresh 60s
            </p>
          )}
        </div>
        <button
          onClick={buscarDados}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm
                     bg-[#1a1d2e] border border-white/10 text-[#94a3b8]
                     hover:text-white transition"
        >
          🔄 Atualizar
        </button>
      </div>

      {/* ── INDICADORES ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-4">
          <p className="text-[#94a3b8] text-xs mb-1">Dólar (USD/BRL)</p>
          <p className="text-white font-bold text-lg">
            R$ {usdBrl > 0 ? usdBrl.toFixed(2) : "—"}
          </p>
        </div>
        <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-4">
          <p className="text-[#94a3b8] text-xs mb-1">Bitcoin</p>
          <p className="text-white font-bold text-lg">
            {criptos[0]
              ? `R$ ${(criptos[0].priceUsd * usdBrl).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
              : "—"}
          </p>
        </div>
        <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-4">
          <p className="text-[#94a3b8] text-xs mb-1">Ethereum</p>
          <p className="text-white font-bold text-lg">
            {criptos[1]
              ? `R$ ${(criptos[1].priceUsd * usdBrl).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
              : "—"}
          </p>
        </div>
        <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-4">
          <p className="text-[#94a3b8] text-xs mb-1">Ativos monitorados</p>
          <p className="text-white font-bold text-lg">
            {ACOES_MONITORADAS.length + CRIPTO_MONITORADAS.length}
          </p>
        </div>
      </div>

      {/* ── ABAS ────────────────────────────────────────────────────── */}
      <div className="flex bg-[#1a1d2e] border border-white/5 rounded-xl p-1 gap-1 w-fit">
        {(["acoes", "cripto"] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition
              ${aba === a
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                : "text-[#94a3b8] hover:text-white"}`}
          >
            {a === "acoes" ? "📈 Ações B3" : "₿ Criptos"}
          </button>
        ))}
      </div>

      {/* ── TABELA AÇÕES ────────────────────────────────────────────── */}
      {aba === "acoes" && (
        <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-4 px-4 py-3 border-b border-white/5 text-xs text-[#94a3b8] font-medium uppercase tracking-wider">
            <span>Ticker</span>
            <span className="text-right">Preço</span>
            <span className="text-right">Variação</span>
            <span className="text-right">Volume</span>
          </div>
          {loading ? (
            <div className="p-10 text-center text-[#94a3b8]">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Carregando cotações...
            </div>
          ) : acoes.length === 0 ? (
            <div className="p-10 text-center text-[#94a3b8]">
              <p className="text-3xl mb-2">📡</p>
              <p>Cotações indisponíveis no momento.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {acoes.map((a) => (
                <li key={a.symbol} className="grid grid-cols-4 px-4 py-3 hover:bg-white/5 transition items-center">
                  <div>
                    <p className="text-white font-semibold text-sm">{a.symbol}</p>
                    <p className="text-[#94a3b8] text-xs truncate max-w-[120px]">{a.name}</p>
                  </div>
                  <p className="text-white font-medium text-sm text-right">
                    R$ {a.price.toFixed(2)}
                  </p>
                  <div className="text-right">
                    <span className={`text-sm font-semibold px-2 py-0.5 rounded-full
                      ${a.changePct >= 0
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"}`}
                    >
                      {a.changePct >= 0 ? "+" : ""}{a.changePct.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-[#94a3b8] text-xs text-right">{a.volume}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── TABELA CRIPTO ───────────────────────────────────────────── */}
      {aba === "cripto" && (
        <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-4 px-4 py-3 border-b border-white/5 text-xs text-[#94a3b8] font-medium uppercase tracking-wider">
            <span>Ativo</span>
            <span className="text-right">Preço (BRL)</span>
            <span className="text-right">24h</span>
            <span className="text-right">Market Cap</span>
          </div>
          {loading ? (
            <div className="p-10 text-center text-[#94a3b8]">
              <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Carregando criptos...
            </div>
          ) : criptos.length === 0 ? (
            <div className="p-10 text-center text-[#94a3b8]">
              <p className="text-3xl mb-2">📡</p>
              <p>Cotações indisponíveis no momento.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {criptos.map((c) => {
                const precoBrl = c.priceUsd * usdBrl;
                const mcapBi = (c.marketCapUsd / 1e9).toFixed(1);
                return (
                  <li key={c.id} className="grid grid-cols-4 px-4 py-3 hover:bg-white/5 transition items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold text-xs flex-shrink-0">
                        {c.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{c.symbol}</p>
                        <p className="text-[#94a3b8] text-xs">{c.name}</p>
                      </div>
                    </div>
                    <p className="text-white font-medium text-sm text-right">
                      {precoBrl > 1000
                        ? `R$ ${precoBrl.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
                        : `R$ ${precoBrl.toFixed(4)}`}
                    </p>
                    <div className="text-right">
                      <span className={`text-sm font-semibold px-2 py-0.5 rounded-full
                        ${c.changePct24h >= 0
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"}`}
                      >
                        {c.changePct24h >= 0 ? "+" : ""}{c.changePct24h.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-[#94a3b8] text-xs text-right">$ {mcapBi}B</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}