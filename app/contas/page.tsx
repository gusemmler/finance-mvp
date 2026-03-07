"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link"; // 👈 IMPORTAÇÃO ADICIONADA AQUI NO TOPO

// ... (interfaces e constantes permanecem iguais) ...

interface Conta {
  id: string;
  nome: string;
  tipo: "corrente" | "poupanca" | "cartao" | "dinheiro" | "investimento";
  banco: string;
  saldo: number;
  limite: number;
  vencimento: number;
  fechamento: number;
  cor: string;
}

const TIPOS = [
  { value: "corrente",     label: "Conta Corrente",  icon: "🏦" },
  { value: "poupanca",     label: "Poupança",         icon: "🐷" },
  { value: "cartao",       label: "Cartão de Crédito",icon: "💳" },
  { value: "dinheiro",     label: "Dinheiro",         icon: "💵" },
  { value: "investimento", label: "Investimentos",    icon: "📈" },
];

const BANCOS = [
  "Nubank", "Itaú", "Bradesco", "Santander",
  "Banco do Brasil", "Caixa", "Inter", "C6 Bank", "Outro",
];

const CORES = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
];

export default function ContasPage() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<Conta["tipo"]>("corrente");
  const [banco, setBanco] = useState("Nubank");
  const [saldo, setSaldo] = useState("");
  const [limite, setLimite] = useState("");
  const [vencimento, setVencimento] = useState(10);
  const [fechamento, setFechamento] = useState(3);
  const [cor, setCor] = useState("#3b82f6");

  async function carregar() {
    setLoading(true);
    const { data } = await supabase
      .from("contas")
      .select("*")
      .order("created_at");
    setContas(data ?? []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);

    const novaContaId = uuidv4();

    const { error } = await supabase.from("contas").insert({
      id:         novaContaId,
      nome,
      tipo,
      banco,
      saldo:      Number(saldo) || 0,
      limite:     tipo === "cartao" ? Number(limite) || 0 : 0,
      vencimento: tipo === "cartao" ? vencimento : null,
      fechamento: tipo === "cartao" ? fechamento : null,
      cor,
    });

    if (error) { alert("Erro: " + error.message); setSalvando(false); return; }

    if (tipo === "cartao") {
      const hoje = new Date();
      await supabase.from("faturas").insert({
        id:       uuidv4(),
        conta_id: novaContaId,
        mes:      hoje.getMonth() + 1,
        ano:      hoje.getFullYear(),
        total:    0,
        pago:     false,
      });
    }

    resetForm();
    setOpenModal(false);
    setSalvando(false);
    await carregar();
  }

  function resetForm() {
    setNome(""); setTipo("corrente"); setBanco("Nubank");
    setSaldo(""); setLimite(""); setVencimento(10);
    setFechamento(3); setCor("#3b82f6");
  }

  const totalSaldo = contas
    .filter((c) => c.tipo !== "cartao")
    .reduce((acc, c) => acc + Number(c.saldo), 0);

  const totalLimite = contas
    .filter((c) => c.tipo === "cartao")
    .reduce((acc, c) => acc + Number(c.limite), 0);

  const icone = (tipo: string) =>
    TIPOS.find((t) => t.value === tipo)?.icon ?? "🏦";

  const label = (tipo: string) =>
    TIPOS.find((t) => t.value === tipo)?.label ?? tipo;

  return (
    <div className="space-y-6">

      {/* CARDS RESUMO */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-600/5 border border-blue-500/20 rounded-2xl p-5">
          <p className="text-[#94a3b8] text-sm mb-1">Saldo Total</p>
          <p className="text-2xl font-bold text-blue-400">R$ {totalSaldo.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-600/20 to-purple-600/5 border border-purple-500/20 rounded-2xl p-5">
          <p className="text-[#94a3b8] text-sm mb-1">Limite Total Cartões</p>
          <p className="text-2xl font-bold text-purple-400">R$ {totalLimite.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-5">
          <p className="text-[#94a3b8] text-sm mb-1">Total de Contas</p>
          <p className="text-2xl font-bold text-emerald-400">{contas.length}</p>
        </div>
      </div>

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Contas & Cartões</h1>
        <button
          onClick={() => setOpenModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm
                     bg-gradient-to-r from-blue-600 to-purple-600 text-white"
        >
          + Nova Conta
        </button>
      </div>

      {/* LISTA DE CONTAS */}
      {loading ? (
        <div className="text-center text-[#94a3b8] py-10">Carregando...</div>
      ) : contas.length === 0 ? (
        <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-10 text-center text-[#94a3b8]">
          <p className="text-4xl mb-2">💳</p>
          <p>Nenhuma conta cadastrada ainda.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {contas.map((conta) => (

            // ✅ AQUI É ONDE O LINK FOI ADICIONADO — envolve todo o card
            <Link key={conta.id} href={`/contas/${conta.id}`}>
              <div
                className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-5
                           hover:border-blue-500/30 cursor-pointer transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: conta.cor + "33" }}
                    >
                      {icone(conta.tipo)}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{conta.nome}</p>
                      <p className="text-[#94a3b8] text-xs">{conta.banco} · {label(conta.tipo)}</p>
                    </div>
                  </div>
                  <div
                    className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                    style={{ backgroundColor: conta.cor }}
                  />
                </div>

                {conta.tipo === "cartao" ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#94a3b8]">Limite disponível</span>
                      <span className="text-white font-semibold">
                        R$ {Number(conta.limite).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-[#94a3b8]">
                      <span>Fecha dia {conta.fechamento}</span>
                      <span>Vence dia {conta.vencimento}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-[#94a3b8] text-sm">Saldo</span>
                    <span className={`text-xl font-bold ${Number(conta.saldo) >= 0 ? "text-green-400" : "text-red-400"}`}>
                      R$ {Number(conta.saldo).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </Link>
            // ✅ FIM DO LINK

          ))}
        </div>
      )}

      {/* MODAL NOVA CONTA — permanece igual */}
      {openModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end lg:items-center z-50"
          onClick={() => setOpenModal(false)}
        >
          <div
            className="bg-[#1a1d2e] border border-white/10 w-full lg:w-[520px]
                       p-6 rounded-t-3xl lg:rounded-2xl shadow-2xl space-y-4
                       max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white">Nova Conta</h2>

            <form onSubmit={salvar} className="space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {TIPOS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTipo(t.value as Conta["tipo"])}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition
                      ${tipo === t.value
                        ? "border-blue-500 bg-blue-500/20 text-white"
                        : "border-white/10 text-[#94a3b8] hover:text-white"}`}
                  >
                    <span className="text-xl">{t.icon}</span>
                    <span className="text-center leading-tight">{t.label.split(" ")[0]}</span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Nome da conta (ex: Nubank Principal)"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3
                           text-white placeholder-[#94a3b8]"
                required
              />

              <select
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3 text-white"
              >
                {BANCOS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              {tipo === "cartao" ? (
                <input
                  type="number"
                  placeholder="Limite do cartão (R$)"
                  value={limite}
                  onChange={(e) => setLimite(e.target.value)}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3
                             text-white placeholder-[#94a3b8]"
                  step="0.01" min="0"
                />
              ) : (
                <input
                  type="number"
                  placeholder="Saldo inicial (R$)"
                  value={saldo}
                  onChange={(e) => setSaldo(e.target.value)}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3
                             text-white placeholder-[#94a3b8]"
                  step="0.01"
                />
              )}

              {tipo === "cartao" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[#94a3b8] text-xs">
                      Dia fechamento: <strong className="text-white">{fechamento}</strong>
                    </label>
                    <input
                      type="range" min={1} max={28}
                      value={fechamento}
                      onChange={(e) => setFechamento(Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[#94a3b8] text-xs">
                      Dia vencimento: <strong className="text-white">{vencimento}</strong>
                    </label>
                    <input
                      type="range" min={1} max={28}
                      value={vencimento}
                      onChange={(e) => setVencimento(Number(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[#94a3b8] text-sm">Cor de identificação</label>
                <div className="flex gap-2 flex-wrap">
                  {CORES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition
                        ${cor === c ? "border-white scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={salvando}
                className="w-full py-3 rounded-xl font-semibold text-white
                           bg-gradient-to-r from-blue-600 to-purple-600 disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "Adicionar Conta"}
              </button>
              <button
                type="button"
                className="w-full py-3 rounded-xl text-[#94a3b8] border border-white/10"
                onClick={() => { setOpenModal(false); resetForm(); }}
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