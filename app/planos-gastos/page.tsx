"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { BottomSheet } from "./components/BottomSheet";
import { v4 as uuidv4 } from "uuid";
import { criarCategoriasPadrao } from "./actions/criarCategoriasPadrao";

// ======================================================
// PÁGINA PRINCIPAL — LISTAGEM E CRIAÇÃO DE PLANOS
// ======================================================

export default function PlanosGastosPage() {
  const [open, setOpen] = useState(false);
  const [nomePlano, setNomePlano] = useState("");
  const [orcamento, setOrcamento] = useState("");

  const [planos, setPlanos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ======================================================
  // ETAPA 1 — CARREGAR PLANOS DO SUPABASE
  // ======================================================
  async function carregarPlanos() {
    setLoading(true);

    const { data } = await supabase
      .from("planos")
      .select("*")
      .order("created_at", { ascending: false });

    setPlanos(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    carregarPlanos();
  }, []);

  // ======================================================
  // ETAPA 2 — CRIAR PLANO + CATEGORIAS PADRÃO
  // ======================================================
  async function criarPlano(e: React.FormEvent) {
    e.preventDefault();

    const novoId = uuidv4();

    const { data, error } = await supabase
      .from("planos")
      .insert({
        id: novoId,
        nome: nomePlano,
        orcamento: Number(orcamento),
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    // cria categorias e subcategorias automáticas
    await criarCategoriasPadrao(novoId);

    // recarrega lista
    await carregarPlanos();

    setOpen(false);
    setNomePlano("");
    setOrcamento("");
  }

  // ======================================================
  // UI
  // ======================================================
  return (
    <div className="min-h-screen p-6 relative">
      <h1 className="text-3xl font-bold mb-4">Plano de Gastos</h1>

      {loading ? (
        <p>Carregando...</p>
      ) : planos.length === 0 ? (
        <p className="text-gray-500">Nenhum plano criado ainda.</p>
      ) : (
        <div className="space-y-4">
          {planos.map((plano) => (
            <Link
              key={plano.id}
              href={`/planos-gastos/${plano.id}`}
              className="block border p-4 rounded-xl shadow hover:bg-gray-50"
            >
              <h3 className="text-xl font-semibold">{plano.nome}</h3>
              <p className="text-gray-600">Orçamento: R$ {plano.orcamento}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Botão + */}
      <button
        className="fixed bottom-6 right-6 bg-blue-600 text-white w-14 h-14 rounded-full shadow text-4xl flex items-center justify-center"
        onClick={() => setOpen(true)}
      >
        +
      </button>

      {/* BottomSheet */}
      <BottomSheet open={open} onClose={() => setOpen(false)}>
        <h2 className="text-xl font-semibold mb-4">Criar Plano de Gastos</h2>

        <form onSubmit={criarPlano} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Nome do Plano</label>
            <input
              className="w-full border p-2 rounded"
              value={nomePlano}
              onChange={(e) => setNomePlano(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Orçamento Total</label>
            <input
              type="number"
              className="w-full border p-2 rounded"
              value={orcamento}
              onChange={(e) => setOrcamento(e.target.value)}
              required
            />
          </div>

          <button className="bg-blue-600 text-white w-full py-2 rounded">
            Criar Plano
          </button>
        </form>
      </BottomSheet>
    </div>
  );
}