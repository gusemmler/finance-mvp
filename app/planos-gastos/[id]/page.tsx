"use client";

import { supabase } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import UploadDespesa from "./components/UploadDespesa";

// ======================================================================
// INTERFACES PROFISSIONAIS
// ======================================================================
interface Plano {
  id: string;
  nome: string;
  orcamento: number;
}

interface Categoria {
  id: string;
  nome: string;
  plano_id: string;
}

interface Subcategoria {
  id: string;
  nome: string;
  categoria_id: string;
}

interface Despesa {
  id: string;
  nome: string;
  valor: number;
  data: string;
  subcategoria_id: string;
}

// ======================================================================
// PÁGINA DE DETALHES DO PLANO → DASHBOARD
// ======================================================================

export default function PlanoDetalhePage() {
  const { id } = useParams();

  // ── Estados principais ──────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [plano, setPlano] = useState<Plano | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);

  // ── Estados dos BottomSheets ─────────────────────────────────────────
  const [openDespesa, setOpenDespesa] = useState(false);  // menu principal
  const [openManual, setOpenManual] = useState(false);    // form manual
  const [openUpload, setOpenUpload] = useState(false);    // upload IA
  const [dadosIA, setDadosIA] = useState<any>(null);      // retorno da IA

  // ── Estados do formulário manual ─────────────────────────────────────
  const [nomeDesp, setNomeDesp] = useState("");
  const [valorDesp, setValorDesp] = useState("");
  const [dataDesp, setDataDesp] = useState("");
  const [catSel, setCatSel] = useState("");
  const [subSel, setSubSel] = useState("");

  // ======================================================================
  // ETAPA 1 — CARREGAR TODOS OS DADOS DO SUPABASE
  // ======================================================================
  async function carregar() {
    try {
      setLoading(true);

      // Plano
      const { data: planoData, error: planoErr } = await supabase
        .from("planos")
        .select("*")
        .eq("id", id)
        .single();
      if (planoErr) throw planoErr;
      setPlano(planoData);

      // Categorias
      const { data: catData, error: catErr } = await supabase
        .from("categorias")
        .select("*")
        .eq("plano_id", id);
      if (catErr) throw catErr;
      setCategorias(catData || []);

      const categoriasIDs = (catData || []).map((c) => c.id);

      // Subcategorias
      const { data: subData, error: subErr } = await supabase
        .from("subcategorias")
        .select("*")
        .in("categoria_id", categoriasIDs.length ? categoriasIDs : [""]);
      if (subErr) throw subErr;
      setSubcategorias(subData || []);

      const subIDs = (subData || []).map((s) => s.id);

      // Despesas
      const { data: despData, error: despErr } = await supabase
        .from("despesas")
        .select("*")
        .in("subcategoria_id", subIDs.length ? subIDs : [""]);
      if (despErr) throw despErr;
      setDespesas(despData || []);

    } catch (e: any) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) carregar();
  }, [id]);

  if (loading) return <div className="p-6">Carregando dados...</div>;
  if (erro) return <div className="p-6 text-red-500">Erro: {erro}</div>;
  if (!plano) return <div className="p-6">Plano não encontrado.</div>;

  // ======================================================================
  // ETAPA 2 — PROCESSAR DADOS PARA O DASHBOARD
  // ======================================================================
  const categoriasComTotais = categorias.map((cat) => {
    const subsDaCategoria = subcategorias.filter(
      (s) => s.categoria_id === cat.id
    );

    const total = subsDaCategoria.reduce((acc: number, sub) => {
      const despesasSub = despesas.filter((d) => d.subcategoria_id === sub.id);
      const totalSub = despesasSub.reduce(
        (sum, d) => sum + Number(d.valor), 0
      );
      return acc + totalSub;
    }, 0);

    return { ...cat, subcategorias: subsDaCategoria, total };
  });

  const totalGeral = categoriasComTotais.reduce(
    (acc, cat) => acc + cat.total, 0
  );

  const percentualGasto = (totalGeral / plano.orcamento) * 100;

  // ======================================================================
  // ETAPA 3 — RENDER DASHBOARD + BOTTOMSHEETS
  // ======================================================================
  return (
    <div className="p-6 space-y-8">

      {/* ── RESUMO DO PLANO ─────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-2xl shadow-lg space-y-3">
        <h1 className="text-3xl font-bold">{plano.nome}</h1>

        <div className="text-gray-800 text-lg space-y-1">
          <p>Orçamento: <strong>R$ {plano.orcamento.toFixed(2)}</strong></p>
          <p>Gasto total: <strong>R$ {totalGeral.toFixed(2)}</strong></p>
          <p>Saldo restante: <strong>R$ {(plano.orcamento - totalGeral).toFixed(2)}</strong></p>
        </div>

        <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden">
          <div
            className={`h-4 ${
              percentualGasto < 50 ? "bg-green-500"
              : percentualGasto < 80 ? "bg-yellow-500"
              : "bg-red-600"
            }`}
            style={{ width: `${Math.min(percentualGasto, 100)}%` }}
          />
        </div>

        <p className="text-sm text-gray-500">
          {percentualGasto.toFixed(1)}% do orçamento utilizado.
        </p>
      </div>

      {/* ── LISTA DE CATEGORIAS ─────────────────────────────────────── */}
      <div className="space-y-6">
        {categoriasComTotais.map((cat) => {
          const percentualCat = (cat.total / plano.orcamento) * 100;
          const cor =
            percentualCat < 50 ? "bg-green-500"
            : percentualCat < 80 ? "bg-yellow-500"
            : "bg-red-600";

          return (
            <div
              key={cat.id}
              className="p-5 bg-white rounded-xl shadow border border-gray-100"
            >
              <div className="flex justify-between mb-2">
                <strong className="text-lg">{cat.nome}</strong>
                <span className="font-semibold text-gray-700">
                  R$ {cat.total.toFixed(2)}
                </span>
              </div>

              <div className="w-full bg-gray-200 h-3 rounded-full mb-3">
                <div
                  className={`h-3 rounded-full ${cor}`}
                  style={{ width: `${Math.min(percentualCat, 100)}%` }}
                />
              </div>

              {/* Subcategorias */}
              <div className="space-y-2">
                {cat.subcategorias.map((sub: Subcategoria) => {
                  const totalSub = despesas
                    .filter((d) => d.subcategoria_id === sub.id)
                    .reduce((s, d) => s + Number(d.valor), 0);
                  return (
                    <div
                      key={sub.id}
                      className="flex justify-between bg-gray-50 p-2 rounded"
                    >
                      <span className="text-gray-700">{sub.nome}</span>
                      <span className="font-semibold">
                        R$ {totalSub.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── BOTÃO FLUTUANTE + ───────────────────────────────────────── */}
      <button
        onClick={() => setOpenDespesa(true)}
        className="fixed bottom-6 right-6 bg-emerald-600 text-white
                   w-16 h-16 rounded-full shadow-xl text-4xl
                   flex items-center justify-center hover:bg-emerald-700"
      >
        +
      </button>

      {/* ── BOTTOMSHEET PRINCIPAL — 2 opções ────────────────────────── */}
      {openDespesa && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-end z-50"
          onClick={() => setOpenDespesa(false)}
        >
          <div
            className="bg-white w-full p-6 rounded-t-3xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-6">Adicionar Despesa</h2>

            {/* OPÇÃO 1 — MANUAL */}
            <button
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold mb-3 flex items-center justify-center gap-2"
              onClick={() => { setOpenDespesa(false); setOpenManual(true); }}
            >
              ✏️ Lançar Manualmente
            </button>

            {/* OPÇÃO 2 — IA */}
            <button
              className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold mb-3 flex items-center justify-center gap-2"
              onClick={() => { setOpenDespesa(false); setOpenUpload(true); }}
            >
              📷 Escanear Nota com IA
            </button>

            <button
              className="w-full border py-3 rounded-xl text-gray-500"
              onClick={() => setOpenDespesa(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── BOTTOMSHEET UPLOAD IA ────────────────────────────────────── */}
      {openUpload && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-end z-50"
          onClick={() => setOpenUpload(false)}
        >
          <div
            className="bg-white w-full p-6 rounded-t-3xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">📷 Escanear Nota com IA</h2>

            <label className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 transition">
              <span className="text-5xl mb-3">📂</span>
              <span className="text-gray-700 font-medium">Toque para selecionar a imagem</span>
              <span className="text-sm text-gray-400 mt-1">JPG, PNG ou HEIC</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    console.log("Arquivo selecionado:", file.name);
                    // ETAPA B → aqui chamaremos /api/ocr
                  }
                }}
              />
            </label>

            <button
              className="w-full mt-4 border py-3 rounded-xl text-gray-500"
              onClick={() => setOpenUpload(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── BOTTOMSHEET LANÇAMENTO MANUAL ────────────────────────────── */}
      {openManual && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-end z-50"
          onClick={() => setOpenManual(false)}
        >
          <div
            className="bg-white w-full p-6 rounded-t-3xl shadow-xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-2">✏️ Nova Despesa</h2>

            {/* Nome */}
            <input
              type="text"
              placeholder="Nome da despesa"
              value={nomeDesp}
              onChange={(e) => setNomeDesp(e.target.value)}
              className="w-full border rounded-xl p-3"
            />

            {/* Valor */}
            <input
              type="number"
              placeholder="Valor (R$)"
              value={valorDesp}
              onChange={(e) => setValorDesp(e.target.value)}
              className="w-full border rounded-xl p-3"
            />

            {/* Data */}
            <input
              type="date"
              value={dataDesp}
              onChange={(e) => setDataDesp(e.target.value)}
              className="w-full border rounded-xl p-3"
            />

            {/* Categoria */}
            <select
              value={catSel}
              onChange={(e) => { setCatSel(e.target.value); setSubSel(""); }}
              className="w-full border rounded-xl p-3"
            >
              <option value="">Selecione a Categoria</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}
            </select>

            {/* Subcategoria — filtrada pela categoria selecionada */}
            <select
              value={subSel}
              onChange={(e) => setSubSel(e.target.value)}
              className="w-full border rounded-xl p-3"
              disabled={!catSel}
            >
              <option value="">Selecione a Subcategoria</option>
              {subcategorias
                .filter((sub) => sub.categoria_id === catSel)
                .map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.nome}</option>
                ))}
            </select>

            {/* Salvar */}
            <button
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold"
              onClick={() => {
                // ETAPA D → aqui salvaremos no Supabase
                console.log({ nomeDesp, valorDesp, dataDesp, catSel, subSel });
              }}
            >
              Salvar Despesa
            </button>

            <button
              className="w-full border py-3 rounded-xl text-gray-500"
              onClick={() => setOpenManual(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}