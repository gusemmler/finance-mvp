"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { v4 as uuidv4 } from "uuid";
import { criarCategoriasPadrao } from "../planos-gastos/actions/criarCategoriasPadrao";

interface Plano {
  id: string;
  nome: string;
  orcamento: number;
}

export default function OrcamentosPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [nomePlano, setNomePlano] = useState("");
  const [orcamento, setOrcamento] = useState("");

  async function carregarPlanos() {
    const { data } = await supabase
      .from("planos")
      .select("*")
      .order("nome");
    setPlanos(data ?? []);
    setLoading(false);
  }

  useEffect(() => { carregarPlanos(); }, []);

  async function criarPlano(e: React.FormEvent) {
    e.preventDefault();
    const id = uuidv4();

    const { error } = await supabase
      .from("planos")
      .insert({ id, nome: nomePlano, orcamento: Number(orcamento) });

    if (error) { alert("Erro: " + error.message); return; }

    await criarCategoriasPadrao(id);
    await carregarPlanos();
    setOpenModal(false);
    setNomePlano("");
    setOrcamento("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Orçamentos</h1>
        <button
          onClick={() => setOpenModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r
                     from-blue-600 to-purple-600 text-white font-semibold text-sm"
        >
          + Novo Orçamento
        </button>
      </div>

      {loading ? (
        <p className="text-[#94a3b8]">Carregando...</p>
      ) : planos.length === 0 ? (
        <div className="bg-[#1a1d2e] border border-white/5 rounded-2xl p-10 text-center text-[#94a3b8]">
          Nenhum orçamento criado ainda.
        </div>
      ) : (
        <div className="grid gap-4">
          {planos.map((plano) => (
            <Link
              key={plano.id}
              href={`/orcamentos/${plano.id}`}
              className="bg-[#1a1d2e] border border-white/5 hover:border-blue-500/30
                         rounded-2xl p-5 transition flex items-center justify-between"
            >
              <div>
                <h3 className="text-white font-semibold text-lg">{plano.nome}</h3>
                <p className="text-[#94a3b8] text-sm mt-1">
                  Orçamento: R$ {plano.orcamento.toFixed(2)}
                </p>
              </div>
              <span className="text-[#94a3b8] text-xl">→</span>
            </Link>
          ))}
        </div>
      )}

      {/* Modal criar orçamento */}
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
            <h2 className="text-xl font-bold text-white">Novo Orçamento</h2>

            <form onSubmit={criarPlano} className="space-y-3">
              <input
                type="text"
                placeholder="Nome do orçamento"
                value={nomePlano}
                onChange={(e) => setNomePlano(e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3 text-white placeholder-[#94a3b8]"
                required
              />
              <input
                type="number"
                placeholder="Valor total (R$)"
                value={orcamento}
                onChange={(e) => setOrcamento(e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-xl p-3 text-white placeholder-[#94a3b8]"
                required
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl font-semibold text-white
                           bg-gradient-to-r from-blue-600 to-purple-600"
              >
                Criar Orçamento
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