"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { v4 as uuidv4 } from "uuid";

interface Cripto {
  id: string;
  ticker: string;
  nome: string;
  tipo: "cripto";
  quantidade: number;
  preco_medio: number;
  corretora: string;
}

interface CotacaoCripto {
  symbol: string;
  priceUsd: string;
  changePercent24Hr: string;
}

const CRIPTOS_POPULARES = [
  { ticker: "BTC",  nome: "Bitcoin"  },
  { ticker: "ETH",  nome: "Ethereum" },
  { ticker: "BNB",  nome: "BNB"      },
  { ticker: "SOL",  nome: "Solana"   },
  { ticker: "ADA",  nome: "Cardano"  },
  { ticker: "DOGE", nome: "Dogecoin" },
];

const EXCHANGES = [
  "Binance", "Coinbase", "Kraken", "Mercado Bitcoin",
  "Foxbit", "NovaDAX", "Outro",
];

export default function CriptoPage() {
  const [criptos, setCriptos] = useState<Cripto[]>([]);
  const [cotacoes, setCotacoes] = useState<Record<string, CotacaoCripto>>({});
  const [usdBrl, setUsdBrl] = useState(5.0);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [ticker, setTicker] = useState("BTC");
  const [nome, setNome] = useState("Bitcoin");
  const [quantidade, setQuantidade] = useState("");
  const [precoMedio, setPrecoMedio] = useState("");
  const [exchange, setExchange] = useState("Binance");

  async function carregar() {
    setLoading(true);
    const { data } = await supabase
      .from("ativos")
      .select("*")
      .eq("tipo", "cripto")
      .order("ticker");
    setCriptos(data ?? []);
    setLoading(false);
    if ((data ?? []).length > 0) buscarCotacoes();
  }

  async function buscarCotacoes() {
    try {
      // CoinCap API (gratuita, sem chave)
      const [cotRes, usdRes] = await Promise.all([
        fetch("https://api.coincap.io/v2/assets?limit=20"),
        fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL"),
      ]);
      const cotJson = await cotRes.json();
      const usdJson = await usdRes.json();

      if (cotJson.data) {
        const mapa: Record<string, CotacaoCripto> = {};
        cotJson.data.forEach((c: any) => {
          mapa[c.symbol] = c;
        });
        setCotacoes(mapa);
      }

      if (usdJson.USDBRL) {
        setUsdBrl(Number(usdJson.USDBRL.bid));
      }
    } catch {
      // API indisponível
    }
  }

  useEffect(() => { carregar(); }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);

    const { error } = await supabase.from("ativos").insert({
      id:          uuidv4(),
      ticker:      ticker.toUpperCase(),
      nome,
      tipo:        "cripto",
      quantidade:  Number(quantidade),
      preco_medio: Number(precoMedio),
      corretora:   exchange,
    });

    if (error) { alert("Erro: " + error.message); setSalvando(false); return; }

    setTicker("BTC"); setNome("Bitcoin");
    setQuantidade(""); setPrecoMedio("");
    setOpenModal(false); setSalvando(false);
    await carregar();
  }

  const totalInvestidoBRL = criptos.reduce(
    (acc, c) => acc + Number(c.quantidade) * Number(c.preco_medio), 0
  );

  const totalAtualBRL = criptos.reduce((acc, c) => {
    const cotacao = cotacoes[c.ticker];
    const precoUsd = cotacao ? Number(cotacao.priceUsd) : 0;
    const precoBrl = precoUsd > 0 ? precoUsd * usdBrl : Number(c.preco_medio);
    return acc + Number(c.quantidade) * precoBrl;
  }, 0);

  const lucroTotal = totalAtualBRL - totalInvestidoBRL;
  const pctTotal = totalInvestidoBRL > 0 ? (lucroTotal / totalInvestidoBRL) * 100 : 0;

  return (
    <div className="space-y-6">

      {/* Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-600/5 border border-yellow-500/20 rounded-2xl p-5">
          <p className="text-[#94a3b8] text-sm mb-1">Investido</p>
          <p className="text-xl font-bold text-yellow-400">R$ {totalInvestidoBRL.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-600/20 to-orange-600/5 border border-orange-500/20 rounded-2xl p-5">
          <p className="text-[#94a3b8] text-sm mb-1">Valor Atual</p>
          <p className="text-xl font-bold text-orange-400">R$ {totalAtualBRL.toFixed(2)}</p>
        </div>
        <div className={`bg-gradient-to-br border rounded-2xl p-5
          ${pctTotal >= 0
            ? "from-green-600/20 to-green-600/5 border-green-500/20"
            : "from-red-600/20 to-red-600/5 border-red-500/20"}`}
        >
          <p className="text-[#94a3b8] text-sm mb-1">Resultado</p>
          <p className={`text-xl font-bold ${pctTotal >= 0 ? "text-green-400" : "text-red-400"}`}>
            {pctTotal >= 0 ? "+" : ""}{pctTotal.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">₿ Criptomoedas</h1>
        <div className="flex items-center gap-3">
          <span className="text-[#94a3b8] text-xs">USD/BRL: R$ {usdBrl.toFixed(2)}</span>
          <button
            onClick={() => setOpenModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm
                       bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
          >
            + Adicionar
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[#94a3b8]">Carregando...</div>
        ) : criptos.length === 0 ? (
          <div className="p-10 text-center text-[#94a3b8]">
            <p className="text-4xl mb-2">₿</p>
            <p>Nenhuma cripto cadastrada.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {criptos.map((c) => {
              const cotacao = cotacoes[c.ticker];
              const precoUsd = cotacao ? Number(cotacao.priceUsd) : 0;
              const precoBrl = precoUsd > 0 ? precoUsd * usdBrl : Number(c.preco_medio);
              const valorAtual = Number(c.quantidade) * precoBrl;
              const valorInv = Number(c.quantidade) * Number(c.preco_medio);
              const pct = valorInv > 0 ? ((valorAtual - valorInv) / valorInv) * 100 : 0;
              const var24h = cotacao ? Number(cotacao.changePercent24Hr) : 0;

              return (
                <li key={c.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center font-bold text-yellow-400 text-xs flex-shrink-0">
                      {c.ticker.slice(0, 3)}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{c.ticker} <span className="text-[#94a3b8] font-normal text-xs">{c.nome}</span></p>
                      <p className="text-[#94a3b8] text-xs">
                        {c.quantidade} unid. · PM R$ {Number(c.preco_medio).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">R$ {valorAtual.toFixed(2)}</p>
                    <div className="flex gap-2 justify-end">
                      <span className={`text-xs ${pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                      </span>
                      {cotacao && (
                        <span className={`text-xs ${var24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                          24h: {var24h >= 0 ? "+" : ""}{var24h.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </div>
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
                       p-6 rounded-t-3xl lg:rounded-2xl shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white">Adicionar Cripto</h2>

            {/* Criptos populares */}
            <div className="flex gap-2 flex-wrap">
              {CRIPTOS_POPULARES.map((cp) => (
                <button
                  key={cp.ticker}
                  type="button"
                  onClick={() => { setTicker(cp.ticker); setNome(cp.nome); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition
                    ${ticker === cp.ticker
                      ? "border-yellow-500 bg-yellow-500/20 text-yellow-400"
                      : "border-white/10 text-[#94a3b8] hover:text-white"}`}
                >
                  {cp.ticker}
                </button>
              ))}
            </div>

            <form onSubmit={salvar} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Ticker (ex: BTC)"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3
                             text-white placeholder-[#94a3b8]"
                  required
                />
                <input
                  type="text"
                  placeholder="Nome (ex: Bitcoin)"
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
                  required step="0.00000001" min="0"
                />
                <input
                  type="number"
                  placeholder="Preço médio (R$)"
                  value={precoMedio}
                  onChange={(e) => setPrecoMedio(e.target.value)}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3
                             text-white placeholder-[#94a3b8]"
                  required step="0.01" min="0"
                />
              </div>

              <select
                value={exchange}
                onChange={(e) => setExchange(e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3 text-white"
              >
                {EXCHANGES.map((ex) => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </select>

              <button
                type="submit"
                disabled={salvando}
                className="w-full py-3 rounded-xl font-semibold text-white
                           bg-gradient-to-r from-yellow-500 to-orange-500 disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "Adicionar Cripto"}
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