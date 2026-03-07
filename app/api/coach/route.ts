import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
Você é um Coach Financeiro Pessoal especialista em finanças pessoais brasileiras.
Seu nome é "FinBot" e você é direto, empático e baseado em dados.

Você tem acesso ao resumo financeiro do usuário (receitas, despesas, saldo, metas, investimentos).

Com base nesses dados, você:
1. Analisa a saúde financeira atual
2. Identifica padrões de gastos preocupantes
3. Sugere ações práticas e específicas
4. Motiva o usuário com linguagem positiva
5. Responde dúvidas financeiras com base nos dados fornecidos

Regras:
- Sempre mencione os dados reais do usuário nas respostas
- Seja objetivo — máximo 4 parágrafos por resposta
- Use emojis estrategicamente para facilitar leitura
- Nunca invente dados que não foram fornecidos
- Fale em português brasileiro, linguagem acessível
- Se não tiver dados suficientes, diga o que está faltando
`;

export async function POST(req: NextRequest) {
  try {
    const { mensagem, contextoFinanceiro } = await req.json();

    if (!mensagem) {
      return NextResponse.json({ error: "Mensagem não enviada." }, { status: 400 });
    }

    const contextoTexto = contextoFinanceiro
      ? `
DADOS FINANCEIROS DO USUÁRIO:
- Receitas do mês: R$ ${contextoFinanceiro.receitas?.toFixed(2) ?? "0,00"}
- Despesas do mês: R$ ${contextoFinanceiro.despesas?.toFixed(2) ?? "0,00"}
- Saldo atual: R$ ${contextoFinanceiro.saldo?.toFixed(2) ?? "0,00"}
- Pendentes: R$ ${contextoFinanceiro.pendentes?.toFixed(2) ?? "0,00"}
- Total investido: R$ ${contextoFinanceiro.investido?.toFixed(2) ?? "0,00"}
- Metas ativas: ${contextoFinanceiro.metasAtivas ?? 0}
- Maior categoria de gasto: ${contextoFinanceiro.maiorCategoria ?? "Não informado"}
      `
      : "Usuário ainda não tem dados financeiros registrados.";

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 800,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: `${contextoTexto}\n\nPERGUNTA DO USUÁRIO: ${mensagem}` },
      ],
    });

    const resposta = response.choices[0]?.message?.content ?? "Não foi possível processar sua pergunta.";

    return NextResponse.json({ resposta });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Erro interno." },
      { status: 500 }
    );
  }
}