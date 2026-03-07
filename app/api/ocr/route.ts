import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ======================================================================
// PROMPT DA IA — instrução de extração de dados da nota/fatura
// ======================================================================
const PROMPT_SISTEMA = `
Você é um assistente financeiro especialista em leitura de notas fiscais,
recibos, faturas e comprovantes de pagamento brasileiros.

Ao receber uma imagem, extraia EXATAMENTE os seguintes dados em formato JSON:

{
  "descricao": "Nome do estabelecimento ou descrição da compra",
  "valor": 0.00,
  "data": "YYYY-MM-DD",
  "categoria": "uma das categorias abaixo",
  "conta": "Cartão de Crédito"
}

Categorias disponíveis (escolha a mais adequada):
- Alimentação
- Transporte
- Moradia
- Saúde
- Educação
- Lazer
- Roupas
- Assinaturas
- Outros

Regras:
1. Retorne SOMENTE o JSON, sem texto adicional, sem markdown, sem \`\`\`
2. Se não conseguir identificar o valor com certeza, use 0.00
3. Se não conseguir identificar a data, use a data de hoje
4. Se não conseguir identificar a categoria, use "Outros"
5. O campo "descricao" deve ser o nome do estabelecimento ou serviço
6. Datas devem estar no formato YYYY-MM-DD
7. Valores devem ser numéricos (sem R$, sem vírgula — use ponto decimal)
`;

// ======================================================================
// ROTA POST — recebe a imagem em base64 e retorna o JSON extraído
// ======================================================================
export async function POST(req: NextRequest) {
  try {
    const { imagemBase64, mimeType } = await req.json();

    if (!imagemBase64) {
      return NextResponse.json(
        { error: "Imagem não enviada." },
        { status: 400 }
      );
    }

    // Chama a API de Vision da OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: PROMPT_SISTEMA,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType ?? "image/jpeg"};base64,${imagemBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const textoRetornado = response.choices[0]?.message?.content ?? "";

    // Parse do JSON retornado pela IA
    let dadosExtraidos;
    try {
      dadosExtraidos = JSON.parse(textoRetornado.trim());
    } catch {
      // Se a IA retornou algo além do JSON, tenta extrair o JSON do texto
      const match = textoRetornado.match(/\{[\s\S]*\}/);
      if (match) {
        dadosExtraidos = JSON.parse(match[0]);
      } else {
        return NextResponse.json(
          { error: "IA não conseguiu extrair os dados. Tente com uma imagem mais nítida." },
          { status: 422 }
        );
      }
    }

    return NextResponse.json({ dados: dadosExtraidos });

  } catch (error: any) {
    console.error("Erro no OCR:", error);
    return NextResponse.json(
      { error: error.message ?? "Erro interno no servidor." },
      { status: 500 }
    );
  }
}