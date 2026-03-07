"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { v4 as uuidv4 } from "uuid";

// ======================================================================
// INTERFACES
// ======================================================================
interface Transacao {
  id: string;
  tipo: "despesa" | "receita";
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
  conta: string;
  parcelas: number;
  pago: boolean;
}

interface DadosIA {
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
  conta: string;
}

// ======================================================================
// CONSTANTES
// ======================================================================
const CATEGORIAS_DESPESA = [
  "Alimentação", "Transporte", "Moradia", "Saúde",
  "Educação", "Lazer", "Roupas", "Assinaturas", "Outros",
];

const CATEGORIAS_RECEITA = [
  "Salário", "Freelance", "Investimentos",
  "Aluguel", "Vendas", "Outros",
];

const CONTAS = ["Conta Corrente", "Poupança", "Cartão de Crédito", "Dinheiro"];

// ======================================================================
// COMPONENTE PRINCIPAL
// ======================================================================
export default function TransacoesPage() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "despesa" | "receita">("todos");

  // ── Modais ──────────────────────────────────────────────────────────
  const [openMenu, setOpenMenu] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);

  // ── OCR ─────────────────────────────────────────────────────────────
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [processandoOCR, setProcessandoOCR] = useState(false);
  const [erroOCR, setErroOCR] = useState<string | null>(null);
  const inputFileRef = useRef<HTMLInputElement>(null);

  // ── Formulário ──────────────────────────────────────────────────────
  const [tipo, setTipo] = useState<"despesa" | "receita">("despesa");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [categoria, setCategoria] = useState("");
  const [conta, setConta] = useState("Conta Corrente");
  const [parcelas, setParcelas] = useState(1);
  const [pago, setPago] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // ======================================================================
  // CARREGAR TRANSAÇÕES
  // ======================================================================
  async function carregar() {
    setLoading(true);
    const { data: rows } = await supabase
      .from("transacoes")
      .select("*")
      .order("data", { ascending: false });
    setTransacoes(rows ?? []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  // ======================================================================
  // PRÉ-PREENCHER FORMULÁRIO COM DADOS DA IA
  // ======================================================================
  function preencherComIA(dados: DadosIA) {
    setDescricao(dados.descricao ?? "");
    setValor(dados.valor ? String(dados.valor) : "");
    setData(dados.data ?? new Date().toISOString().split("T")[0]);
    setCategoria(dados.categoria ?? "");
    setConta(dados.conta ?? "Cartão de Crédito");
    setTipo("despesa");
  }

  // ======================================================================
  // PROCESSAR IMAGEM COM IA OCR
  // ======================================================================
  async function processarImagem(file: File) {
    setProcessandoOCR(true);
    setErroOCR(null);

    try {
      // Converter imagem para base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove o prefixo "data:image/...;base64,"
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Preview da imagem
      const previewUrl = URL.createObjectURL(file);
      setPreviewImg(previewUrl);

      // Chamar a API de OCR
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagemBase64: base64,
          mimeType: file.type,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Erro ao processar imagem.");
      }

      // Preencher formulário com dados extraídos
      preencherComIA(json.dados);

      // Fechar upload e abrir modal com formulário pré-preenchido
      setOpenUpload(false);
      setOpenModal(true);

    } catch (err: any) {
      setErroOCR(err.message ?? "Erro ao processar imagem.");
    } finally {
      setProcessandoOCR(false);
    }
  }

  // ======================================================================
  // SALVAR TRANSAÇÃO
  // ======================================================================
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);

    const { error } = await supabase.from("transacoes").insert({
      id: uuidv4(),
      tipo,
      descricao,
      valor: Number(valor),
      data,
      categoria,
      conta,
      parcelas,
      pago,
    });

    if (error) {
      alert("Erro ao salvar: " + error.message);
      setSalvando(false);
      return;
    }

    // Reset form
    setDescricao("");
    setValor("");
    setData(new Date().toISOString().split("T")[0]);
    setCategoria("");
    setConta("Conta Corrente");
    setParcelas(1);
    setPago(true);
    setTipo("despesa");
    setPreviewImg(null);
    setOpenModal(false);
    setSalvando(false);
    await carregar();
  }

  // ======================================================================
  // CÁLCULOS
  // ======================================================================
  const totalReceitas = transacoes
    .filter((t) => t.tipo === "receita")
    .reduce((acc, t) => acc + Number(t.valor), 0);

  const totalDespesas = transacoes
    .filter((t) => t.tipo === "despesa")
    .reduce((acc, t) => acc + Number(t.valor), 0);

  const saldo = totalReceitas - totalDespesas;

  const transacoesFiltradas = transacoes.filter((t) =>
    filtroTipo === "todos" ? true : t.tipo === filtroTipo
  );

  // ======================================================================
  // RENDER
  // ======================================================================
  return (
    <div className="space-y-6">

      {/* ── CARDS DE RESUMO ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-600/20 to-green-600/5 border border-green-500/20 rounded-2xl p-5">
          <p className="text-[#94a3b8] text-sm mb-1">Receitas</p>
          <p className="text-2xl font-bold text-green-400">R$ {totalReceitas.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-red-600/20 to-red-600/5 border border-red-500/20 rounded-2xl p-5">
          <p className="text-[#94a3b8] text-sm mb-1">Despesas</p>
          <p className="text-2xl font-bold text-red-400">R$ {totalDespesas.toFixed(2)}</p>
        </div>
        <div className={`bg-gradient-to-br border rounded-2xl p-5 ${saldo >= 0
          ? "from-blue-600/20 to-blue-600/5 border-blue-500/20"
          : "from-red-600/20 to-red-600/5 border-red-500/20"}`}
        >
          <p className="text-[#94a3b8] text-sm mb-1">Saldo</p>
          <p className={`text-2xl font-bold ${saldo >= 0 ? "text-blue-400" : "text-red-400"}`}>
            R$ {saldo.toFixed(2)}
          </p>
        </div>
      </div>

      {/* ── FILTROS + BOTÃO ─────────────────────────────────────────── */}
       <div className="flex items-center justify-between gap-4">
        <div className="flex bg-[#1a1d2e] border border-white/5 rounded-xl p-1 gap-1">
          {(["todos", "receita", "despesa"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltroTipo(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition
                ${filtroTipo === f
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                  : "text-[#94a3b8] hover:text-white"}`}
            >
              {f === "todos" ? "Todos" : f === "receita" ? "Receitas" : "Despesas"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">

          {/* Botão de exportar relatório */}
          <a
            href={`/api/relatorio?mes=${new Date().getMonth() + 1}&ano=${new Date().getFullYear()}`}
            download
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm
                       bg-[#1a1d2e] border border-white/10 text-[#94a3b8]
                       hover:text-white hover:border-white/20 transition"
          >
            📥 Exportar CSV
          </a>

          {/* ← APENAS UM botão de Nova Transação */}
          <button
            onClick={() => setOpenMenu(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm
                       bg-gradient-to-r from-blue-600 to-purple-600 text-white"
          >
            + Nova Transação
          </button>

        </div>
      </div>

      {/* ── LISTA DE TRANSAÇÕES ─────────────────────────────────────── */}
      <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[#94a3b8]">Carregando...</div>
        ) : transacoesFiltradas.length === 0 ? (
          <div className="p-10 text-center text-[#94a3b8]">
            <p className="text-4xl mb-2">💸</p>
            <p>Nenhuma transação encontrada.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {transacoesFiltradas.map((t) => (
              <li key={t.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0
                    ${t.tipo === "receita" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                  >
                    {t.tipo === "receita" ? "📈" : "📉"}
                  </div>
                  <div>
                    <p className="text-white font-medium">{t.descricao}</p>
                    <p className="text-[#94a3b8] text-xs">
                      {t.categoria} · {t.conta} · {new Date(t.data + "T12:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${t.tipo === "receita" ? "text-green-400" : "text-red-400"}`}>
                    {t.tipo === "receita" ? "+" : "-"} R$ {Number(t.valor).toFixed(2)}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full
                    ${t.pago ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}
                  >
                    {t.pago ? "Pago" : "Pendente"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── BOTTOMSHEET MENU — 2 opções ──────────────────────────────── */}
      {openMenu && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end lg:items-center z-50"
          onClick={() => setOpenMenu(false)}
        >
          <div
            className="bg-[#1a1d2e] border border-white/10 w-full lg:w-[480px]
                       p-6 rounded-t-3xl lg:rounded-2xl shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-4">Nova Transação</h2>

            {/* Manual */}
            <button
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600
                         text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
              onClick={() => { setOpenMenu(false); setOpenModal(true); }}
            >
              ✏️ Lançar Manualmente
            </button>

            {/* IA OCR */}
            <button
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600
                         text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
              onClick={() => { setOpenMenu(false); setOpenUpload(true); }}
            >
              📷 Escanear Nota com IA
            </button>

            <button
              className="w-full py-3 rounded-xl text-[#94a3b8] border border-white/10"
              onClick={() => setOpenMenu(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── BOTTOMSHEET UPLOAD OCR ────────────────────────────────────── */}
      {openUpload && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end lg:items-center z-50"
          onClick={() => { if (!processandoOCR) setOpenUpload(false); }}
        >
          <div
            className="bg-[#1a1d2e] border border-white/10 w-full lg:w-[480px]
                       p-6 rounded-t-3xl lg:rounded-2xl shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white">📷 Escanear Nota com IA</h2>

            {processandoOCR ? (
              /* Loading OCR */
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-[#94a3b8] text-sm">Analisando imagem com IA...</p>
                <p className="text-[#94a3b8] text-xs">Isso pode levar alguns segundos</p>
              </div>
            ) : previewImg ? (
              /* Preview da imagem */
              <div className="space-y-4">
                <img
                  src={previewImg}
                  alt="Preview"
                  className="w-full max-h-64 object-contain rounded-xl border border-white/10"
                />
                <button
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600
                             text-white py-3 rounded-xl font-semibold"
                  onClick={() => inputFileRef.current?.click()}
                >
                  Trocar Imagem
                </button>
              </div>
            ) : (
              /* Área de upload */
              <label className="w-full border-2 border-dashed border-white/20 rounded-xl p-8
                                flex flex-col items-center justify-center cursor-pointer
                                hover:border-emerald-500/50 transition">
                <span className="text-5xl mb-3">📂</span>
                <span className="text-white font-medium">Toque para selecionar</span>
                <span className="text-[#94a3b8] text-sm mt-1">JPG, PNG ou HEIC</span>
                <input
                  ref={inputFileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processarImagem(file);
                  }}
                />
              </label>
            )}

            {/* Erro OCR */}
            {erroOCR && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3">
                <p className="text-red-400 text-sm">⚠️ {erroOCR}</p>
              </div>
            )}

            {!processandoOCR && (
              <button
                className="w-full py-3 rounded-xl text-[#94a3b8] border border-white/10"
                onClick={() => {
                  setOpenUpload(false);
                  setPreviewImg(null);
                  setErroOCR(null);
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL FORMULÁRIO (manual ou pré-preenchido pela IA) ──────── */}
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
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Nova Transação</h2>
              {previewImg && (
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                  ✨ Preenchido pela IA
                </span>
              )}
            </div>

            {/* Preview miniatura se veio da IA */}
            {previewImg && (
              <img
                src={previewImg}
                alt="Nota"
                className="w-full h-24 object-cover rounded-xl border border-white/10 opacity-60"
              />
            )}

            {/* Toggle Despesa / Receita */}
            <div className="flex bg-[#0f1117] border border-white/10 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => { setTipo("despesa"); setCategoria(""); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition
                  ${tipo === "despesa" ? "bg-red-600 text-white" : "text-[#94a3b8] hover:text-white"}`}
              >
                📉 Despesa
              </button>
              <button
                type="button"
                onClick={() => { setTipo("receita"); setCategoria(""); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition
                  ${tipo === "receita" ? "bg-green-600 text-white" : "text-[#94a3b8] hover:text-white"}`}
              >
                📈 Receita
              </button>
            </div>

            <form onSubmit={salvar} className="space-y-3">

              <input
                type="text"
                placeholder="Descrição"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3
                           text-white placeholder-[#94a3b8]"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Valor (R$)"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3
                             text-white placeholder-[#94a3b8]"
                  required
                  step="0.01"
                  min="0"
                />
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3 text-white"
                  required
                />
              </div>

              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3 text-white"
                required
              >
                <option value="">Selecione a Categoria</option>
                {(tipo === "despesa" ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={conta}
                onChange={(e) => setConta(e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3 text-white"
              >
                {CONTAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {tipo === "despesa" && (
                <div className="space-y-1">
                  <label className="text-[#94a3b8] text-sm">
                    Parcelas: <strong className="text-white">{parcelas}x</strong>
                  </label>
                  <input
                    type="range" min={1} max={24} value={parcelas}
                    onChange={(e) => setParcelas(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-[#94a3b8]">
                    <span>1x</span><span>24x</span>
                  </div>
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setPago(!pago)}
                  className={`w-12 h-6 rounded-full transition-all duration-300 relative flex-shrink-0
                    ${pago ? "bg-green-500" : "bg-white/20"}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-300
                    ${pago ? "left-6" : "left-0.5"}`}
                  />
                </div>
                <span className="text-[#94a3b8] text-sm">
                  {tipo === "receita" ? "Já foi recebido" : "Já foi pago"}
                </span>
              </label>

              <button
                type="submit"
                disabled={salvando}
                className="w-full py-3 rounded-xl font-semibold text-white
                           bg-gradient-to-r from-blue-600 to-purple-600 disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "Salvar Transação"}
              </button>
              <button
                type="button"
                className="w-full py-3 rounded-xl text-[#94a3b8] border border-white/10"
                onClick={() => { setOpenModal(false); setPreviewImg(null); }}
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