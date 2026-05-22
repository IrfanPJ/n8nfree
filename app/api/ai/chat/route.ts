export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// Simple in-memory rate limiter: 20 requests per minute per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!checkRateLimit(session.user.id)) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 });
  }

  const body = await request.json();
  const messages = (body.messages ?? []).slice(-20); // cap history to last 20 messages

  const [
    { count: totalOrders },
    { count: totalCustomers },
    { count: pendingOrders },
    { data: revenueData },
  ] = await Promise.all([
    supabase.from("Order").select("*", { count: "exact", head: true }).eq("isActive", true),
    supabase.from("Customer").select("*", { count: "exact", head: true }).eq("isActive", true),
    supabase.from("Order").select("*", { count: "exact", head: true }).eq("isActive", true).in("status", ["PENDING", "MEASURING", "CUTTING", "STITCHING", "TRIAL"]),
    supabase.from("Invoice").select("paidAmount").eq("isActive", true).eq("status", "PAID"),
  ]);

  const totalRevenue = revenueData?.reduce((s, r) => s + (r.paidAmount ?? 0), 0) ?? 0;

  const context = `You are the AI business assistant for "House of Tailors", a luxury tailoring ERP platform.

Current Business Data:
- Total Orders: ${totalOrders ?? 0}
- Total Customers: ${totalCustomers ?? 0}
- Total Revenue (Paid): AED ${totalRevenue.toLocaleString("en-AE")}
- Pending/Active Orders: ${pendingOrders ?? 0}

You provide:
1. Business analytics and insights
2. Revenue analysis and forecasting suggestions
3. Customer relationship recommendations
4. Order management advice
5. Tailoring business best practices
6. Operational efficiency suggestions

Always be concise, professional, and data-driven. Format responses clearly with key points highlighted.`;

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const mockResponse = generateMockResponse(messages[messages.length - 1]?.content ?? "", {
      totalOrders: totalOrders ?? 0,
      totalCustomers: totalCustomers ?? 0,
      totalRevenue,
      pendingOrders: pendingOrders ?? 0,
    });
    return NextResponse.json({ choices: [{ message: { content: mockResponse } }] });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        stream: true,
        messages: [{ role: "system", content: context }, ...messages],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch {
    const mockResponse = generateMockResponse(messages[messages.length - 1]?.content ?? "", {
      totalOrders: totalOrders ?? 0,
      totalCustomers: totalCustomers ?? 0,
      totalRevenue,
      pendingOrders: pendingOrders ?? 0,
    });
    return NextResponse.json({ choices: [{ message: { content: mockResponse } }] });
  }
}

function generateMockResponse(
  question: string,
  data: { totalOrders: number; totalCustomers: number; totalRevenue: number; pendingOrders: number }
): string {
  const q = question.toLowerCase();
  if (q.includes("revenue") || q.includes("sales")) {
    return `**Revenue Summary**\n\nTotal revenue collected: AED ${data.totalRevenue.toLocaleString("en-AE")}\n\n**Key Insights:**\n- Focus on increasing advance payment collection to improve cash flow\n- Consider offering loyalty discounts for repeat customers\n- Premium garments (suits, sherwanis) typically have 40-60% higher margins\n\n**Recommendation:** Target AED 50,000 monthly from VIP customers alone by offering exclusive membership packages.`;
  }
  if (q.includes("customer") || q.includes("retention")) {
    return `**Customer Analysis**\n\nTotal customers: ${data.totalCustomers}\n\n**Retention Strategies:**\n1. Send personalized SMS on birthdays and festivals\n2. Create a VIP loyalty program with priority booking\n3. Follow up within 7 days after delivery for feedback\n4. Offer seasonal promotions during wedding season\n\n**Insight:** Customers who return within 60 days have 3x higher lifetime value.`;
  }
  if (q.includes("order") || q.includes("trend")) {
    return `**Order Analytics**\n\nTotal orders: ${data.totalOrders} | Pending: ${data.pendingOrders}\n\n**Status Breakdown:**\n- ${data.pendingOrders} orders need immediate attention\n- Focus on clearing TRIAL status orders within 48 hours\n\n**Recommendations:**\n1. Assign dedicated tailors to urgent orders\n2. Set up SMS alerts for customers when orders reach READY status\n3. Batch similar garment types to increase production efficiency`;
  }
  return `**Business Intelligence Report**\n\n**Current Snapshot:**\n- Orders: ${data.totalOrders} (${data.pendingOrders} active)\n- Customers: ${data.totalCustomers}\n- Revenue: AED ${data.totalRevenue.toLocaleString("en-AE")}\n\n**Top Priorities:**\n1. Process the ${data.pendingOrders} pending orders efficiently\n2. Follow up with customers due for delivery\n3. Review overdue invoices for payment collection\n\n**Growth Tip:** Implement a referral program — satisfied customers referring 1 friend per year can grow your customer base by 20-30% annually.`;
}
