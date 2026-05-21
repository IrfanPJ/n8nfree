export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages } = await request.json();

  const [totalOrders, totalCustomers, totalRevenue, pendingOrders] = await Promise.all([
    prisma.order.count({ where: { isActive: true } }),
    prisma.customer.count({ where: { isActive: true } }),
    prisma.invoice.aggregate({ where: { isActive: true, status: "PAID" }, _sum: { paidAmount: true } }),
    prisma.order.count({ where: { isActive: true, status: { in: ["PENDING", "MEASURING", "CUTTING", "STITCHING", "TRIAL"] } } }),
  ]);

  const context = `You are the AI business assistant for "House of Tailors", a luxury tailoring ERP platform.

Current Business Data:
- Total Orders: ${totalOrders}
- Total Customers: ${totalCustomers}
- Total Revenue (Paid): ₹${(totalRevenue._sum.paidAmount ?? 0).toLocaleString("en-IN")}
- Pending/Active Orders: ${pendingOrders}

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
      totalOrders, totalCustomers,
      totalRevenue: totalRevenue._sum.paidAmount ?? 0,
      pendingOrders
    });
    return NextResponse.json({ choices: [{ message: { content: mockResponse } }] });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        stream: true,
        messages: [
          { role: "system", content: context },
          ...messages,
        ],
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
      totalOrders, totalCustomers,
      totalRevenue: totalRevenue._sum.paidAmount ?? 0,
      pendingOrders
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
    return `**Revenue Summary**\n\nTotal revenue collected: ₹${data.totalRevenue.toLocaleString("en-IN")}\n\n**Key Insights:**\n- Focus on increasing advance payment collection to improve cash flow\n- Consider offering loyalty discounts for repeat customers\n- Premium garments (suits, sherwanis) typically have 40-60% higher margins\n\n**Recommendation:** Target ₹50,000 monthly from VIP customers alone by offering exclusive membership packages.`;
  }

  if (q.includes("customer") || q.includes("retention")) {
    return `**Customer Analysis**\n\nTotal customers: ${data.totalCustomers}\n\n**Retention Strategies:**\n1. Send personalized SMS on birthdays and festivals\n2. Create a VIP loyalty program with priority booking\n3. Follow up within 7 days after delivery for feedback\n4. Offer seasonal promotions during wedding season\n\n**Insight:** Customers who return within 60 days have 3x higher lifetime value.`;
  }

  if (q.includes("order") || q.includes("trend")) {
    return `**Order Analytics**\n\nTotal orders: ${data.totalOrders} | Pending: ${data.pendingOrders}\n\n**Status Breakdown:**\n- ${data.pendingOrders} orders need immediate attention\n- Focus on clearing TRIAL status orders within 48 hours\n\n**Recommendations:**\n1. Assign dedicated tailors to urgent orders\n2. Set up SMS alerts for customers when orders reach READY status\n3. Batch similar garment types to increase production efficiency`;
  }

  return `**Business Intelligence Report**\n\n**Current Snapshot:**\n- Orders: ${data.totalOrders} (${data.pendingOrders} active)\n- Customers: ${data.totalCustomers}\n- Revenue: ₹${data.totalRevenue.toLocaleString("en-IN")}\n\n**Top Priorities:**\n1. Process the ${data.pendingOrders} pending orders efficiently\n2. Follow up with customers due for delivery\n3. Review overdue invoices for payment collection\n\n**Growth Tip:** Implement a referral program — satisfied customers referring 1 friend per year can grow your customer base by 20-30% annually.`;
}
