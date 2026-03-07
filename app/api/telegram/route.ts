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
    id:        uuidv4(),
    tipo:      dados.tipo ?? "despesa",
    descricao: dados.descricao ?? "Lançamento via Telegram",
    valor:     Number(dados.valor) || 0,
    data:      dados.data === "hoje" ? hoje : (dados.data ?? hoje),
    categoria: dados.categoria ?? "Outros",
    conta:     dados.conta ?? "Conta Corrente",
    parcelas:  1,
    pago:      true,
  });
  return !error;
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
        await enviarMensagem(chatId,
          `👋 Olá, *${nome}*! Sou seu assistente financeiro.\n\n` +
          `📝 Me mande uma mensagem como:\n` +
          `_"gastei 50 reais no mercado"_\n\n` +
          `📷 Ou envie a *foto de uma nota fiscal*\n\n` +
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

        await enviarMensagem(chatId,
          `💰 *Resumo Financeiro*\n\n` +
          `📈 Receitas: R$ ${receitas.toFixed(2)}\n` +
          `📉 Despesas: R$ ${despesas.toFixed(2)}\n` +
          `💵 Saldo: R$ ${(receitas - despesas).toFixed(2)}`
        );
        return NextResponse.json({ ok: true });
      }

      // Lançamento por texto livre
      await enviarMensagem(chatId, "⏳ Processando...");
      const dados = await extrairDadosTexto(texto);

      if (!dados || !dados.valor) {
        await enviarMensagem(chatId,
          "❌ Não consegui entender. Tente:\n_\"gastei 45 no restaurante\"_"
        );
        return NextResponse.json({ ok: true });
      }

      const ok = await salvarTransacao(dados);
      if (ok) {
        await enviarMensagem(chatId,
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
        await enviarMensagem(chatId, "❌ Não consegui ler a nota. Tente uma foto mais nítida.");
        return NextResponse.json({ ok: true });
      }

      const ok = await salvarTransacao(dados);
      if (ok) {
        await enviarMensagem(chatId,
          `✅ *Nota registrada!*\n\n` +
          `📝 ${dados.descricao}\n` +
          `💰 R$ ${Number(dados.valor).toFixed(2)}\n` +
          `🏷️ ${dados.categoria}\n` +
          `💳 ${dados.conta}`
        );
      }
    }

    // ── ÁUDIO / VOZ ────────────────────────────────────────────────
    if (message.voice || message.audio) {
      await enviarMensagem(chatId, "🎤 Transcrevendo áudio...");

      const fileId = (message.voice ?? message.audio).file_id;
      const buffer = await baixarArquivo(fileId);
      const transcricao = await transcreverAudio(buffer);

      await enviarMensagem(chatId, `🗣️ Entendi: _"${transcricao}"_\n\nProcessando...`);

      const dados = await extrairDadosTexto(transcricao);
      if (!dados || !dados.valor) {
        await enviarMensagem(chatId, "❌ Não consegui identificar o valor. Tente novamente.");
        return NextResponse.json({ ok: true });
      }

      const ok = await salvarTransacao(dados);
      if (ok) {
        await enviarMensagem(chatId,
          `✅ *Registrado por áudio!*\n\n` +
          `📝 ${dados.descricao}\n` +
          `💰 R$ ${Number(dados.valor).toFixed(2)}\n` +
          `🏷️ ${dados.categoria}`
        );
      }
    }

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}