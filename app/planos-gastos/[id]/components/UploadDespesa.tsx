"use client";

import { useState } from "react";

// ======================================================
// COMPONENTE: UploadDespesa
// ------------------------------------------------------
// Responsável por:
// - Selecionar imagem da galeria ou câmera
// - Enviar para /api/ocr
// - Receber dados extraídos
// - Exibir preview para confirmação
// ======================================================

interface DadosExtraidos {
  valor: number | null;
  data: string | null;
  estabelecimento: string | null;
  categoria_sugerida: string | null;
  subcategoria_sugerida: string | null;
  descricao: string | null;
  itens: string[];
  forma_pagamento: string | null;
}

interface Props {
  onDadosExtraidos: (dados: DadosExtraidos) => void;
  onFechar: () => void;
}

export default function UploadDespesa({ onDadosExtraidos, onFechar }: Props) {
  const [carregando, setCarregando] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // ======================================================
  // ETAPA 1 — SELECIONAR IMAGEM
  // ======================================================
  async function handleImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setErro(null);
    setCarregando(true);

    try {
      // ======================================================
      // ETAPA 2 — ENVIAR PARA /api/ocr
      // ======================================================
      const formData = new FormData();
      formData.append("imagem", file);

      const res = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.sucesso) {
        throw new Error(json.error || "Erro ao processar imagem.");
      }

      // ======================================================
      // ETAPA 3 — RETORNAR DADOS PARA O COMPONENTE PAI
      // ======================================================
      onDadosExtraidos(json.dados);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  // ======================================================
  // UI
  // ======================================================
  return (
    <div className="space-y-4">

      {/* ÁREA DE UPLOAD */}
      <label className="block w-full border-2 border-dashed border-emerald-400 
                        rounded-xl p-6 text-center cursor-pointer hover:bg-emerald-50">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImagem}
          className="hidden"
        />
        <p className="text-emerald-700 font-semibold text-lg">
          📷 Tirar foto ou escolher da galeria
        </p>
        <p className="text-gray-400 text-sm mt-1">
          Nota fiscal, cupom ou fatura
        </p>
      </label>

      {/* PREVIEW DA IMAGEM */}
      {preview && (
        <img
          src={preview}
          alt="Preview"
          className="w-full rounded-xl max-h-64 object-cover border"
        />
      )}

      {/* LOADING */}
      {carregando && (
        <div className="text-center text-emerald-600 font-semibold animate-pulse">
          🧠 IA analisando a imagem...
        </div>
      )}

      {/* ERRO */}
      {erro && (
        <div className="text-red-500 text-sm text-center">
          ⚠️ {erro}
        </div>
      )}

      {/* BOTÃO CANCELAR */}
      <button
        onClick={onFechar}
        className="w-full border border-gray-300 py-2 rounded-xl text-gray-600"
      >
        Cancelar
      </button>
    </div>
  );
}