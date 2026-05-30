export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { fetchBusinessContext, buildSystemInstruction, callGemini } from "@/lib/ai-context";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const ALLOWED_CHAT_IDS_RAW = process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? "";
// Comma-separated chat IDs that are allowed to use the bot (leave empty to allow everyone)
const ALLOWED_IDS = ALLOWED_CHAT_IDS_RAW
  ? ALLOWED_CHAT_IDS_RAW.split(",").map((s) => s.trim())
  : [];

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
}

async function sendTyping(chatId: number) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  });
}

// Strip markdown to plain text for Telegram HTML mode
function mdToHtml(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.*?)\*/g, "<i>$1</i>")
    .replace(/^## (.+)$/gm, "<b>$1</b>")
    .replace(/^### (.+)$/gm, "<b>$1</b>")
    .replace(/^- /gm, "• ")
    .replace(/&/g, "&amp;")
    .substring(0, 4096); // Telegram message limit
}

export async function POST(request: NextRequest) {
  if (!BOT_TOKEN) return NextResponse.json({ ok: false }, { status: 503 });

  const body = await request.json();
  const message = body?.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId: number = message.chat?.id;
  const text: string = message.text ?? "";
  const firstName: string = message.from?.first_name ?? "there";

  if (!chatId || !text) return NextResponse.json({ ok: true });

  // Check if chat is allowed
  if (ALLOWED_IDS.length > 0 && !ALLOWED_IDS.includes(String(chatId))) {
    await sendMessage(chatId, "⛔ You are not authorized to use this bot.");
    return NextResponse.json({ ok: true });
  }

  // Handle /start command
  if (text === "/start") {
    await sendMessage(chatId, `👋 Hello ${firstName}!\n\nI'm your <b>House of Tailors</b> AI assistant. I have live access to your CRM data.\n\nAsk me anything:\n• "How many orders are overdue?"\n• "Who hasn't paid this month?"\n• "Show today's appointments"\n• "What's our revenue this month?"\n• "List all active leads"\n\nYour <b>Chat ID</b> is: <code>${chatId}</code>`);
    return NextResponse.json({ ok: true });
  }

  // Send typing indicator while processing
  await sendTyping(chatId);

  try {
    const [businessContext] = await Promise.all([
      fetchBusinessContext(),
      sendTyping(chatId),
    ]);

    const systemInstruction = buildSystemInstruction(businessContext);
    const reply = await callGemini(systemInstruction, text);
    await sendMessage(chatId, mdToHtml(reply));
  } catch (err) {
    console.error("Telegram bot error:", err);
    await sendMessage(chatId, "❌ Something went wrong. Please try again.");
  }

  return NextResponse.json({ ok: true });
}
