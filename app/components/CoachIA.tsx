"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Mensagem {
  role: "user" | "assistant";
  content: string;
}

interface ContextoFinanceiro {
  receitas: number;
  despesas: number;
  saldo: number;
  pendentes: number;
  investido: number;
  metasAtivas: number;
  maiorCategoria: string;
}

export function CoachIA() {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      role: "assistant",
      content: "👋 Olá! Sou o **FinBot**, seu coach financeiro pessoal. Posso analisar seus dados e te ajudar a tomar melhores decisões financeiras. Como posso te ajudar hoje?",
    },
  ]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [contexto, setContexto] = useState<ContextoFinanceiro | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Carregar contexto financeiro ────────────────────────────────────
  useEffect(() => {
    async function carregarContexto() {
      const [
        { data: transacoes },
        { data: metas },
        { data: ativos },
      ] = await Promise.all([
        supabase.from("transacoes").select("tipo,valor,categoria,pago"),
        supabase.from("metas").select("concluida"),
        supabase.from("ativos").select("quantidade,preco_medio"),
      ]);

      const receitas = (transacoes ?? [])
        .filter((t) => t.tipo === "receita" && t.pago)
        .reduce((acc, t) => acc + Number(t.valor), 0);

      const despesas = (transacoes ?? [])
        .filter((t) => t.tipo === "despesa" && t.pago)
        .reduce((acc, t) => acc + Number(t.valor), 0);

      const pendentes = (transacoes ?? [])
        .filter((t) => !t.pago)
        .reduce((acc, t) => acc + Number(t.valor), 0);

      const investido = (ativos ?? [])
        .reduce((acc, a) => acc + Number(a.quantidade) * Number(a.preco_medio), 0);

      const metasAtivas = (metas ?? []).filter((m) => !m.concluida).length;

      // Maior categoria de gasto
      const catMap: Record<string, number> = {};
      (transacoes ?? [])
        .filter((t) => t.tipo === "despesa")
        .forEach((t) => {
          const cat = t.categoria || "Outros";
          catMap[cat] = (catMap[cat] ?? 0) + Number(t.valor);
        });
      const maiorCategoria = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Não identificado";

      setContexto({
        receitas,
        despesas,
        saldo: receitas - despesas,
        pendentes,
        investido,
        metasAtivas,
        maiorCategoria,
      });
    }

    if (aberto && !contexto) carregarContexto();
  }, [aberto]);

  // ── Auto scroll ─────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  // ── Enviar mensagem ─────────────────────────────────────────────────
  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || carregando) return;

    const novaMensagem: Mensagem = { role: "user", content: input };
    const novaLista = [...mensagens, novaMensagem];
    setMensagens(novaLista);
    setInput("");
    setCarregando(true);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagem: input,
          contextoFinanceiro: contexto,
        }),
      });

      const json = await res.json();

      setMensagens([
        ...novaLista,
        { role: "assistant", content: json.resposta ?? "Erro ao obter resposta." },
      ]);
    } catch {
      setMensagens([
        ...novaLista,
        { role: "assistant", content: "⚠️ Erro de conexão. Tente novamente." },
      ]);
    } finally {
      setCarregando(false);
    }
  }

  // ── Sugestões rápidas ───────────────────────────────────────────────
  const sugestoes = [
    "Como está minha saúde financeira?",
    "Onde estou gastando mais?",
    "Como posso economizar mais?",
    "Devo investir ou quitar dívidas?",
  ];

  return (
    <>
      {/* ── BOTÃO FLUTUANTE ─────────────────────────────────────────── */}
      <button
        onClick={() => setAberto(!aberto)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full shadow-2xl
                   bg-gradient-to-r from-blue-600 to-purple-600
                   flex items-center justify-center text-2xl
                   hover:scale-110 transition-transform duration-200"
        title="Coach IA Financeiro"
      >
        🤖
      </button>

      {/* ── PAINEL DO CHAT ───────────────────────────────────────────── */}
      {aberto && (
        <div className="fixed bottom-24 left-6 z-50 w-80 lg:w-96 h-[500px]
                        bg-[#1a1d2e] border border-white/10 rounded-2xl shadow-2xl
                        flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3
                          bg-gradient-to-r from-blue-600/20 to-purple-600/20
                          border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <div>
                <p className="text-white font-semibold text-sm">FinBot</p>
                <p className="text-[#94a3b8] text-xs">Coach Financeiro IA</p>
              </div>
            </div>
            <button
              onClick={() => setAberto(false)}
              className="text-[#94a3b8] hover:text-white text-lg"
            >
              ✕
            </button>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {mensagens.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed
                    ${msg.role === "user"
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-sm"
                      : "bg-white/5 text-[#e2e8f0] rounded-bl-sm border border-white/10"}`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Loading */}
            {carregando && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1 items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Sugestões rápidas (só na primeira mensagem) */}
          {mensagens.length === 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1">
              {sugestoes.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs px-2 py-1 rounded-full border border-white/10
                             text-[#94a3b8] hover:text-white hover:border-white/30 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={enviar}
            className="flex gap-2 p-3 border-t border-white/10"
          >
            <input
              type="text"
              placeholder="Pergunte ao FinBot..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-[#0f1117] border border-white/10 rounded-xl px-3 py-2
                         text-white placeholder-[#94a3b8] text-sm"
              disabled={carregando}
            />
            <button
              type="submit"
              disabled={carregando || !input.trim()}
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600
                         flex items-center justify-center text-white disabled:opacity-40"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}