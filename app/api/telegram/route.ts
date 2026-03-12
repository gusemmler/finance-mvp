import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// ======================================================================
// PROMPT DE EXTRAÇÃO DE TEXTO LIVRE
// ======================================================================
const PROMPT_EXTRACAO = `
Você é um assistente financeiro. O usuário vai enviar uma mensagem 
descrevendo uma transação financeira em linguagem natural.

Extraia os dados e retorne SOMENTE um JSON válido:
{
  "tipo": "despesa" ou "receita",
  "descricao": "descrição curta",
  "valor": 0.00,
  "data": "YYYY-MM-DD",
  "categoria": "Alimentação|Transporte|Moradia|Saúde|Educação|Lazer|Roupas|Assinaturas|Salário|Outros",
  "conta": "Nubank|Itaú|Bradesco|Conta Corrente|Dinheiro|Cartão de Crédito"
}

Exemplos:
- "gastei 45 no nubank no restaurante" → {"tipo":"despesa","descricao":"Restaurante","valor":45.00,"data":"hoje","categoria":"Alimentação","conta":"Nubank"}
- "recebi salário de 3000" → {"tipo":"receita","descricao":"Salário","valor":3000.00,"data":"hoje","categoria":"Salário","conta":"Conta Corrente"}

Use a data de hoje se não for mencionada. Retorne SOMENTE o JSON.
`;

// ======================================================================
// PROMPT PARA EXTRAÇÃO DE EXTRATOS/FATURAS (MÚLTIPLAS TRANSAÇÕES)
// ======================================================================
const PROMPT_EXTRATO = `
Você é um assistente especializado em extrair transações financeiras de extratos bancários, 
faturas de cartão de crédito e movimentações financeiras.

Analise a imagem/PDF e extraia TODAS as transações visíveis.

Retorne um JSON array com CADA transação no formato:
[
  {
    "tipo": "despesa" ou "receita",
    "descricao": "descrição da transação",
    "valor": 0.00,
    "data": "YYYY-MM-DD",
    "categoria": "Alimentação|Transporte|Moradia|Saúde|Educação|Lazer|Roupas|Assinaturas|Salário|Outros",
    "conta": "Nubank|Itaú|Bradesco|Conta Corrente|Dinheiro|Cartão de Crédito"
  }
]

IMPORTANTE:
- Extraia TODAS as transações visíveis
- Mantenha valores positivos (não adicione sinal de menos)
- Se for débito/despesa, coloque tipo como "despesa"
- Se for crédito/receita, coloque tipo como "receita"
- Use a data completa (DD/MM/YYYY → YYYY-MM-DD)
- Retorne SOMENTE o JSON array, nada mais.
`;

// ======================================================================
// HELPERS
// ======================================================================
async function enviarMensagem(chatId: number, texto: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: texto,
      parse_mode: "Markdown",
    }),
  });
}

async function baixarArquivo(fileId: string): Promise<Buffer> {
  const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
  const json = await res.json();
  const filePath = json.result.file_path;
  const fileRes = await fetch(
    `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`
  );
  const arrayBuffer = await fileRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function extrairDadosTexto(texto: string): Promise<any> {
  const hoje = new Date().toISOString().split("T")[0];
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 300,
    messages: [
      { role: "system", content: PROMPT_EXTRACAO },
      { role: "user", content: `Data de hoje: ${hoje}. Mensagem: ${texto}` },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  const match = content.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

async function extrairDadosFoto(buffer: Buffer, mimeType: string): Promise<any> {
  const base64 = buffer.toString("base64");
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT_EXTRACAO },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64}`,
              detail: "high",
            },
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  const match = content.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

async function extrairTransacoesExtrato(
  buffer: Buffer,
  mimeType: string
): Promise<any[]> {
  try {
    console.log("🔍 [EXTRATO] Iniciando extração com mimeType:", mimeType);
    console.log("🔍 [EXTRATO] Tamanho do buffer:", buffer.length, "bytes");

    const base64 = buffer.toString("base64");
    console.log("🔍 [EXTRATO] Base64 gerado, primeiros 100 chars:", base64.substring(0, 100));

    console.log("🔍 [EXTRATO] Chamando OpenAI Vision API...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT_EXTRATO },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "[]";
    console.log("🔍 [EXTRATO] Resposta da Vision API:", content.substring(0, 500));

    const match = content.match(/\[[\s\S]*\]/);
    
    if (!match) {
      console.log("❌ [EXTRATO] Nenhum JSON array encontrado na resposta!");
      console.log("❌ [EXTRATO] Conteúdo completo:", content);
      return [];
    }

    const transacoes = JSON.parse(match[0]);
    console.log("✅ [EXTRATO] Transações extraídas:", transacoes.length);
    console.log("✅ [EXTRATO] Conteúdo:", JSON.stringify(transacoes, null, 2));

    return transacoes;
  } catch (error: any) {
    console.error("❌ [EXTRATO] Erro ao extrair transações:", error.message);
    console.error("❌ [EXTRATO] Stack completo:", error);
    return [];
  }
}

async function transcreverAudio(buffer: Buffer): Promise<string> {
  const { toFile } = await import("openai");
  const file = await toFile(buffer, "audio.ogg", { type: "audio/ogg" });
  const transcription = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file,
    language: "pt",
  });
  return transcription.text;
}

async function salvarTransacao(dados: any): Promise<boolean> {
  const hoje = new Date().toISOString().split("T")[0];
  const { error } = await supabase.from("transacoes").insert({
    id: uuidv4(),
    tipo: dados.tipo ?? "despesa",
    descricao: dados.descricao ?? "Lançamento via Telegram",
    valor: Number(dados.valor) || 0,
    data: dados.data === "hoje" ? hoje : (dados.data ?? hoje),
    categoria: dados.categoria ?? "Outros",
    conta: dados.conta ?? "Conta Corrente",
    parcelas: 1,
    pago: true,
  });
  return !error;
}

async function salvarMultiplasTransacoes(dados: any[]): Promise<number> {
  const hoje = new Date().toISOString().split("T")[0];
  const transacoes = dados.map((d) => ({
    id: uuidv4(),
    tipo: d.tipo ?? "despesa",
    descricao: d.descricao ?? "Importado de extrato",
    valor: Number(d.valor) || 0,
    data: d.data === "hoje" ? hoje : (d.data ?? hoje),
    categoria: d.categoria ?? "Outros",
    conta: d.conta ?? "Conta Corrente",
    parcelas: 1,
    pago: true,
  }));

  console.log("💾 [SUPABASE] Tentando salvar", transacoes.length, "transações");
  console.log("💾 [SUPABASE] Dados:", JSON.stringify(transacoes, null, 2));

  const { error } = await supabase.from("transacoes").insert(transacoes);
  
  if (error) {
    console.error("❌ [SUPABASE] Erro ao salvar:", error);
    return 0;
  }

  console.log("✅ [SUPABASE] Transações salvas com sucesso!");
  return transacoes.length;
}

// ======================================================================
// WEBHOOK PRINCIPAL
// ======================================================================
export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const message = update.message;

    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const nome = message.from?.first_name ?? "usuário";

    // ── TEXTO ──────────────────────────────────────────────────────
    if (message.text) {
      const texto = message.text;

      // Comando /start
      if (texto === "/start") {
        await enviarMensagem(
          chatId,
          `👋 Olá, *${nome}*! Sou seu assistente financeiro.\n\n` +
            `📝 Me mande uma mensagem como:\n` +
            `_"gastei 50 reais no mercado"_\n\n` +
            `📷 Ou envie a *foto de uma nota fiscal*\n\n` +
            `📊 Ou use */extrato* para importar extrato bancário/fatura\n\n` +
            `🎤 Ou mande um *áudio* descrevendo o gasto\n\n` +
            `E eu registro automaticamente! 🚀`
        );
        return NextResponse.json({ ok: true });
      }

      // Comando /saldo
      if (texto === "/saldo") {
        const { data: transacoes } = await supabase
          .from("transacoes")
          .select("tipo,valor,pago");

        const receitas = (transacoes ?? [])
          .filter((t) => t.tipo === "receita" && t.pago)
          .reduce((acc, t) => acc + Number(t.valor), 0);

        const despesas = (transacoes ?? [])
          .filter((t) => t.tipo === "despesa" && t.pago)
          .reduce((acc, t) => acc + Number(t.valor), 0);

        await enviarMensagem(
          chatId,
          `💰 *Resumo Financeiro*\n\n` +
            `📈 Receitas: R$ ${receitas.toFixed(2)}\n` +
            `📉 Despesas: R$ ${despesas.toFixed(2)}\n` +
            `💵 Saldo: R$ ${(receitas - despesas).toFixed(2)}`
        );
        return NextResponse.json({ ok: true });
      }

      // Comando /extrato
      if (texto === "/extrato") {
        await enviarMensagem(
          chatId,
          `📊 *Importar Extrato*\n\n` +
            `Envie um arquivo de:\n` +
            `✅ Extrato bancário (PDF ou screenshot)\n` +
            `✅ Fatura de cartão de crédito (PDF ou screenshot)\n\n` +
            `Vou extrair todas as transações e lançar automaticamente! 🚀`
        );
        return NextResponse.json({ ok: true });
      }

      // Lançamento por texto livre
      await enviarMensagem(chatId, "⏳ Processando...");
      const dados = await extrairDadosTexto(texto);

      if (!dados || !dados.valor) {
        await enviarMensagem(
          chatId,
          "❌ Não consegui entender. Tente:\n_\"gastei 45 no restaurante\"_"
        );
        return NextResponse.json({ ok: true });
      }

      const ok = await salvarTransacao(dados);
      if (ok) {
        await enviarMensagem(
          chatId,
          `✅ *Registrado!*\n\n` +
            `📝 ${dados.descricao}\n` +
            `💰 R$ ${Number(dados.valor).toFixed(2)}\n` +
            `🏷️ ${dados.categoria}\n` +
            `💳 ${dados.conta}\n` +
            `📅 ${dados.data === "hoje" ? new Date().toLocaleDateString("pt-BR") : dados.data}`
        );
      } else {
        await enviarMensagem(chatId, "❌ Erro ao salvar. Tente novamente.");
      }
    }

    // ── FOTO ───────────────────────────────────────────────────────
    if (message.photo) {
      await enviarMensagem(chatId, "📷 Analisando a nota fiscal...");

      const fotoId = message.photo[message.photo.length - 1].file_id;
      const buffer = await baixarArquivo(fotoId);
      const dados = await extrairDadosFoto(buffer, "image/jpeg");

      if (!dados || !dados.valor) {
        await enviarMensagem(
          chatId,
          "❌ Não consegui ler a nota. Tente uma foto mais nítida."
        );
        return NextResponse.json({ ok: true });
      }

      const ok = await salvarTransacao(dados);
      if (ok) {
        await enviarMensagem(
          chatId,
          `✅ *Nota registrada!*\n\n` +
            `📝 ${dados.descricao}\n` +
            `💰 R$ ${Number(dados.valor).toFixed(2)}\n` +
            `🏷️ ${dados.categoria}\n` +
            `💳 ${dados.conta}`
        );
      }
    }

    // ── DOCUMENTO (PDF) ────────────────────────────────────────────
    if (message.document) {
      const mimeType = message.document.mime_type ?? "application/pdf";
      console.log("📄 [DOCUMENTO] Arquivo recebido!");
      console.log("📄 [DOCUMENTO] Nome:", message.document.file_name);
      console.log("📄 [DOCUMENTO] MIME Type:", mimeType);

      if (
        mimeType === "application/pdf" ||
        mimeType.startsWith("image/")
      ) {
        await enviarMensagem(
          chatId,
          "📊 Extraindo transações do extrato..."
        );

        const docId = message.document.file_id;
        console.log("📄 [DOCUMENTO] Iniciando download do arquivo...");
        
        const buffer = await baixarArquivo(docId);
        console.log("📄 [DOCUMENTO] Download concluído, tamanho:", buffer.length, "bytes");

        console.log("📄 [DOCUMENTO] Chamando extrairTransacoesExtrato...");
        const transacoes = await extrairTransacoesExtrato(buffer, mimeType);
        console.log("📄 [DOCUMENTO] Resposta de transações:", transacoes);

        if (!transacoes || transacoes.length === 0) {
          console.log("❌ [DOCUMENTO] Nenhuma transação foi extraída");
          await enviarMensagem(
            chatId,
            "❌ Não consegui extrair transações. Verifique se o arquivo está claro."
          );
          return NextResponse.json({ ok: true });
        }

        console.log("📄 [DOCUMENTO] Iniciando salvamento das transações...");
        const quantidadeSalva = await salvarMultiplasTransacoes(transacoes);
        console.log("📄 [DOCUMENTO] Quantidade salva:", quantidadeSalva);

        if (quantidadeSalva > 0) {
          const totalValor = transacoes
            .reduce((acc, t) => acc + Number(t.valor), 0)
            .toFixed(2);

          await enviarMensagem(
            chatId,
            `✅ *${quantidadeSalva} transações importadas!*\n\n` +
              `💰 Valor total: R$ ${totalValor}\n` +
              `📅 Data: ${new Date().toLocaleDateString("pt-BR")}\n\n` +
              `Todas foram lançadas na sua carteira! 🚀`
          );
        } else {
          await enviarMensagem(
            chatId,
            "❌ Erro ao salvar as transações. Tente novamente."
          );
        }
      } else {
        await enviarMensagem(
          chatId,
          "❌ Envie um PDF ou imagem de extrato bancário."
        );
      }
    }

    // ── ÁUDIO / VOZ ────────────────────────────────────────────────
    if (message.voice || message.audio) {
      await enviarMensagem(chatId, "🎤 Transcrevendo áudio...");

      const fileId = (message.voice ?? message.audio).file_id;
      const buffer = await baixarArquivo(fileId);
      const transcricao = await transcreverAudio(buffer);

      await enviarMensagem(
        chatId,
        `🗣️ Entendi: _"${transcricao}"_\n\nProcessando...`
      );

      const dados = await extrairDadosTexto(transcricao);
      if (!dados || !dados.valor) {
        await enviarMensagem(
          chatId,
          "❌ Não consegui identificar o valor. Tente novamente."
        );
        return NextResponse.json({ ok: true });
      }

      const ok = await salvarTransacao(dados);
      if (ok) {
        await enviarMensagem(
          chatId,
          `✅ *Registrado por áudio!*\n\n` +
            `📝 ${dados.descricao}\n` +
            `💰 R$ ${Number(dados.valor).toFixed(2)}\n` +
            `🏷️ ${dados.categoria}`
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("❌ [WEBHOOK] Erro geral:", error);
    return NextResponse.json({ ok: true });
  }
}