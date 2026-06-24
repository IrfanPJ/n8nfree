export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchBusinessContext, buildSystemInstruction } from "@/lib/ai-context";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) { rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 }); return true; }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkRateLimit(session.user.id)) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const body = await request.json();
  const messages: { role: string; content: string }[] = body.messages ?? [];

  const userFirst = messages.findIndex((m) => m.role === "user");
  if (userFirst === -1) {
    return NextResponse.json({ choices: [{ message: { content: "Please ask a question." } }] });
  }

  const businessContext = await fetchBusinessContext(session);
  const systemInstruction = buildSystemInstruction(businessContext);

  // Build Gemini conversation — skip leading assistant messages, requires user-first alternating turns
  const contents: { role: string; parts: { text: string }[] }[] = [];
  for (const msg of messages.slice(userFirst)) {
    const role = msg.role === "assistant" ? "model" : "user";
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += "\n" + msg.content;
    } else {
      contents.push({ role, parts: [{ text: msg.content }] });
    }
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { maxOutputTokens: 2048, temperature: 0.2 },
        }),
      }
    );

    if (!response.ok) {
      console.error("Gemini error:", await response.text());
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "I couldn't generate a response. Please try again.";
    return NextResponse.json({ choices: [{ message: { content } }] });
  } catch (err) {
    console.error("Gemini fetch error:", err);
    return NextResponse.json({ error: "Failed to reach AI service" }, { status: 502 });
  }
}
