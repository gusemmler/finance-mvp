"use server";

import { supabase } from "@/lib/supabaseClient";

// Estrutura completa de categorias + subcategorias
const CATEGORIAS_PADRAO = [
  {
    nome: "Alimentação",
    subcategorias: [
      "Supermercado",
      "Restaurantes",
      "Delivery",
      "Lanches",
      "Açougue",
      "Padaria"
    ]
  },
  {
    nome: "Moradia",
    subcategorias: [
      "Aluguel",
      "Condomínio",
      "Energia",
      "Água",
      "Internet",
      "IPTU"
    ]
  },
  {
    nome: "Transporte",
    subcategorias: [
      "Combustível",
      "Uber/Taxi",
      "Estacionamento",
      "Manutenção",
      "Seguro do carro",
      "Transporte público"
    ]
  },
  {
    nome: "Saúde",
    subcategorias: [
      "Remédios",
      "Consultas",
      "Exames",
      "Plano de saúde",
      "Academia",
      "Terapia"
    ]
  },
  {
    nome: "Lazer",
    subcategorias: [
      "Viagens",
      "Cinema",
      "Streaming",
      "Passeios",
      "Presentes",
      "Jogos"
    ]
  },
  {
    nome: "Educação",
    subcategorias: [
      "Cursos",
      "Livros",
      "Assinaturas",
      "Material de estudo",
      "Certificações"
    ]
  },
  {
    nome: "Investimentos",
    subcategorias: [
      "Ações",
      "FIIs",
      "Criptomoedas",
      "Reserva de emergência",
      "Previdência privada"
    ]
  },
  {
    nome: "Obrigações",
    subcategorias: [
      "Dívidas",
      "Empréstimos",
      "Parcelamentos",
      "Juros",
      "Multas"
    ]
  },
  {
    nome: "Despesas Variáveis",
    subcategorias: [
      "Compras pessoais",
      "Roupas",
      "Manutenção da casa",
      "Serviços diversos"
    ]
  }
];

export async function criarCategoriasPadrao(planoId: string) {
  for (const cat of CATEGORIAS_PADRAO) {
    const { data: newCat } = await supabase
      .from("categorias")
      .insert({
        id: crypto.randomUUID(),
        plano_id: planoId,
        nome: cat.nome
      })
      .select()
      .single();

    if (!newCat) continue;

    for (const sub of cat.subcategorias) {
      await supabase.from("subcategorias").insert({
        id: crypto.randomUUID(),
        categoria_id: newCat.id,
        nome: sub
      });
    }
  }
}