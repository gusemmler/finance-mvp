"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { v4 as uuidv4 } from "uuid";

// ======================================================================
// INTERFACES
// ======================================================================
interface Meta {
  id: string;
  nome: string;
  descricao: string;
  tipo: string;
  icone: string;
  valor_alvo: number;
  valor_atual: number;
  aporte_mensal: number;
  prazo: string;
  cor: string;
  concluida: boolean;
}

// ======================================================================
// CONSTANTES
// ======================================================================
const TIPOS_META = [
  { value: "viagem",     label: "Viagem",      icon: "✈️"  },
  { value: "emergencia", label: "Emergência",  icon: "🛡️"  },
  { value: "imovel",     label: "Imóvel",      icon: "🏠"  },
  { value: "veiculo",    label: "Veículo",     icon: "🚗"  },
  { value: "educacao",   label: "Educação",    icon: "📚"  },
  { value: "aposentado", label: "Aposentado",  icon: "👴"  },
  { value: "outro",      label: "Outro",       icon: "🎯"  },
];

const CORES = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
];

// ======================================================================
// COMPONENTE
// ======================================================================
export default function MetasPage() {
  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aportando, setAportando] = useState<string | null>(null);
  const [valorAporte, setValorAporte] = useState("");

  // Form
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("viagem");
  const [valorAlvo, setValorAlvo] = useState("");
  const [valorAtual, setValorAtual] = useState("");
  const [aporteMensal, setAporteMensal] = useState("");
  const [prazo, setPrazo] = useState("");
  const [cor, setCor] = useState("#3b82f6");

  // ── Carregar ────────────────────────────────────────────────────────
  async function carregar() {
    setLoading(true);
    const { data } = await supabase
      .from("metas")
      .select("*")
      .order("created_at");
    setMetas(data ?? []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  // ── Salvar meta ─────────────────────────────────────────────────────
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);

    const tipoInfo = TIPOS_META.find((t) => t.value === tipo);

    const { error } = await supabase.from("metas").insert({
      id:            uuidv4(),
      nome,
      descricao,
      tipo,
      icone:         tipoInfo?.icon ?? "🎯",
      valor_alvo:    Number(valorAlvo),
      valor_atual:   Number(valorAtual) || 0,
      aporte_mensal: Number(aporteMensal) || 0,
      prazo:         prazo || null,
      cor,
      concluida:     false,
    });

    if (error) { alert("Erro: " + error.message); setSalvando(false); return; }

    resetForm();
    setOpenModal(false);
    setSalvando(false);
    await carregar();
  }

  // ── Aportar na meta ─────────────────────────────────────────────────
  async function aportar(meta: Meta) {
    if (!valorAporte || Number(valorAporte) <= 0) return;

    const novoValor = Number(meta.valor_atual) + Number(valorAporte);
    const concluida = novoValor >= Number(meta.valor_alvo);

    await supabase
      .from("metas")
      .update({ valor_atual: novoValor, concluida })
      .eq("id", meta.id);

    setAportando(null);
    setValorAporte("");
    await carregar();
  }

  function resetForm() {
    setNome(""); setDescricao(""); setTipo("viagem");
    setValorAlvo(""); setValorAtual(""); setAporteMensal("");
    setPrazo(""); setCor("#3b82f6");
  }

  // ── Cálculos ────────────────────────────────────────────────────────
  const totalAlvo = metas.reduce((acc, m) => acc + Number(m.valor_alvo), 0);
  const totalAtual = metas.reduce((acc, m) => acc + Number(m.valor_atual), 0);
  const metasConcluidas = metas.filter((m) => m.concluida).length;

  const hoje = new Date();

  return (
    <div className="space-y-6">

      {/* ── CARDS RESUMO ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-600/5 border border-blue-500/20 rounded-2xl p-5">
          <p className="text-[#94a3b8] text-sm mb-1">Total das Metas</p>
          <p className="text-xl font-bold text-blue-400">R$ {totalAlvo.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-600/20 to-purple-600/5 border border-purple-500/20 rounded-2xl p-5">
          <p className="text-[#94a3b8] text-sm mb-1">Acumulado</p>
          <p className="text-xl font-bold text-purple-400">R$ {totalAtual.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-600/20 to-green-600/5 border border-green-500/20 rounded-2xl p-5">
          <p className="text-[#94a3b8] text-sm mb-1">Concluídas</p>
          <p className="text-xl font-bold text-green-400">
            {metasConcluidas}/{metas.length}
          </p>
        </div>
      </div>

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">🎯 Metas & Planos</h1>
        <button
          onClick={() => setOpenModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm
                     bg-gradient-to-r from-blue-600 to-purple-600 text-white"
        >
          + Nova Meta
        </button>
      </div>

      {/* ── LISTA DE METAS ──────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center text-[#94a3b8] py-10">Carregando...</div>
      ) : metas.length === 0 ? (
        <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-10 text-center text-[#94a3b8]">
          <p className="text-4xl mb-2">🎯</p>
          <p>Nenhuma meta criada ainda.</p>
          <p className="text-sm mt-1">Defina seus objetivos financeiros!</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {metas.map((meta) => {
            const pct = Math.min(
              (Number(meta.valor_atual) / Number(meta.valor_alvo)) * 100,
              100
            );
            const faltam = Number(meta.valor_alvo) - Number(meta.valor_atual);
            const prazoDate = meta.prazo ? new Date(meta.prazo + "T12:00:00") : null;
            const diasRestantes = prazoDate
              ? Math.ceil((prazoDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
              : null;
            const mesesRestantes = diasRestantes ? Math.ceil(diasRestantes / 30) : null;
            const aporteNecessario = mesesRestantes && mesesRestantes > 0
              ? faltam / mesesRestantes
              : 0;

            return (
              <div
                key={meta.id}
                className={`bg-[#1a1d2e] border rounded-2xl p-5 space-y-4 transition
                  ${meta.concluida ? "border-green-500/30" : "border-white/5"}`}
              >
                {/* Header da meta */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: meta.cor + "33" }}
                    >
                      {meta.icone}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{meta.nome}</p>
                      {meta.descricao && (
                        <p className="text-[#94a3b8] text-xs">{meta.descricao}</p>
                      )}
                    </div>
                  </div>
                  {meta.concluida && (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                      ✅ Concluída
                    </span>
                  )}
                </div>

                {/* Progresso */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#94a3b8]">
                      R$ {Number(meta.valor_atual).toFixed(2)}
                    </span>
                    <span className="text-white font-semibold">
                      R$ {Number(meta.valor_alvo).toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: meta.cor,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-[#94a3b8]">
                    <span>{pct.toFixed(1)}% concluído</span>
                    {!meta.concluida && (
                      <span>Faltam R$ {faltam.toFixed(2)}</span>
                    )}
                  </div>
                </div>

                {/* Infos extras */}
                {!meta.concluida && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {prazoDate && (
                      <div className={`p-2 rounded-lg ${diasRestantes && diasRestantes < 30
                        ? "bg-red-500/10 text-red-400"
                        : "bg-white/5 text-[#94a3b8]"}`}
                      >
                        📅 {diasRestantes && diasRestantes > 0
                          ? `${diasRestantes} dias restantes`
                          : "Prazo vencido"
                        }
                      </div>
                    )}
                    {aporteNecessario > 0 && (
                      <div className="bg-white/5 text-[#94a3b8] p-2 rounded-lg">
                        💰 Aporte: R$ {aporteNecessario.toFixed(2)}/mês
                      </div>
                    )}
                  </div>
                )}

                {/* Botão aportar */}
                {!meta.concluida && (
                  aportando === meta.id ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Valor do aporte (R$)"
                        value={valorAporte}
                        onChange={(e) => setValorAporte(e.target.value)}
                        className="flex-1 bg-[#0f1117] border border-white/10 rounded-xl p-2
                                   text-white placeholder-[#94a3b8] text-sm"
                        step="0.01" min="0"
                        autoFocus
                      />
                      <button
                        onClick={() => aportar(meta)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                        style={{ backgroundColor: meta.cor }}
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => { setAportando(null); setValorAporte(""); }}
                        className="px-4 py-2 rounded-xl text-sm text-[#94a3b8] border border-white/10"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAportando(meta.id)}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold border border-white/10
                                 text-[#94a3b8] hover:text-white hover:border-white/20 transition"
                    >
                      + Adicionar Aporte
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL NOVA META ──────────────────────────────────────────── */}
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
            <h2 className="text-xl font-bold text-white">Nova Meta Financeira</h2>

            {/* Tipo */}
            <div className="grid grid-cols-4 gap-2">
              {TIPOS_META.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition
                    ${tipo === t.value
                      ? "border-blue-500 bg-blue-500/20 text-white"
                      : "border-white/10 text-[#94a3b8] hover:text-white"}`}
                >
                  <span className="text-xl">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            <form onSubmit={salvar} className="space-y-3">
              <input
                type="text"
                placeholder="Nome da meta (ex: Viagem para Europa)"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3
                           text-white placeholder-[#94a3b8]"
                required
              />

              <input
                type="text"
                placeholder="Descrição (opcional)"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3
                           text-white placeholder-[#94a3b8]"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Valor alvo (R$)"
                  value={valorAlvo}
                  onChange={(e) => setValorAlvo(e.target.value)}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3
                             text-white placeholder-[#94a3b8]"
                  required step="0.01" min="0"
                />
                <input
                  type="number"
                  placeholder="Já tenho (R$)"
                  value={valorAtual}
                  onChange={(e) => setValorAtual(e.target.value)}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3
                             text-white placeholder-[#94a3b8]"
                  step="0.01" min="0"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Aporte mensal (R$)"
                  value={aporteMensal}
                  onChange={(e) => setAporteMensal(e.target.value)}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3
                             text-white placeholder-[#94a3b8]"
                  step="0.01" min="0"
                />
                <input
                  type="date"
                  placeholder="Prazo"
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              {/* Cor */}
              <div className="space-y-2">
                <label className="text-[#94a3b8] text-sm">Cor da meta</label>
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
                {salvando ? "Salvando..." : "Criar Meta"}
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