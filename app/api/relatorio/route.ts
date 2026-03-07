import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mes = searchParams.get("mes") ? Number(searchParams.get("mes")) : new Date().getMonth() + 1;
    const ano = searchParams.get("ano") ? Number(searchParams.get("ano")) : new Date().getFullYear();

    // Buscar transações do mês
    const dataInicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
    const dataFim    = `${ano}-${String(mes).padStart(2, "0")}-31`;

    const { data: transacoes } = await supabase
      .from("transacoes")
      .select("*")
      .gte("data", dataInicio)
      .lte("data", dataFim)
      .order("data");

    // Calcular resumo
    const receitas = (transacoes ?? [])
      .filter((t) => t.tipo === "receita")
      .reduce((acc, t) => acc + Number(t.valor), 0);

    const despesas = (transacoes ?? [])
      .filter((t) => t.tipo === "despesa")
      .reduce((acc, t) => acc + Number(t.valor), 0);

    // Gastos por categoria
    const catMap: Record<string, number> = {};
    (transacoes ?? [])
      .filter((t) => t.tipo === "despesa")
      .forEach((t) => {
        const cat = t.categoria || "Outros";
        catMap[cat] = (catMap[cat] ?? 0) + Number(t.valor);
      });

    // Montar CSV
    const MESES = ["","Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                   "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

    let csv = `RELATÓRIO FINANCEIRO — ${MESES[mes]} ${ano}\n\n`;
    csv += `RESUMO\n`;
    csv += `Receitas Total,R$ ${receitas.toFixed(2)}\n`;
    csv += `Despesas Total,R$ ${despesas.toFixed(2)}\n`;
    csv += `Saldo,R$ ${(receitas - despesas).toFixed(2)}\n\n`;

    csv += `GASTOS POR CATEGORIA\n`;
    csv += `Categoria,Valor\n`;
    Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, val]) => {
        csv += `${cat},R$ ${val.toFixed(2)}\n`;
      });

    csv += `\nTRANSAÇÕES DETALHADAS\n`;
    csv += `Data,Tipo,Descrição,Categoria,Conta,Valor,Status\n`;
    (transacoes ?? []).forEach((t) => {
      csv += `${t.data},${t.tipo},${t.descricao},${t.categoria ?? ""},${t.conta ?? ""},R$ ${Number(t.valor).toFixed(2)},${t.pago ? "Pago" : "Pendente"}\n`;
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="relatorio-${MESES[mes]}-${ano}.csv"`,
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}