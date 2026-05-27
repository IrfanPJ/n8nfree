export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrderForScan } from "@/actions/scan";
import { ScanOrderClient } from "./scan-order-client";

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function ScanOrderPage({ params }: Props) {
  const { orderId } = await params;

  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/scan/${orderId}`);

  const result = await getOrderForScan(orderId);

  if (!result.success || !result.data) {
    notFound();
  }

  const { order, allowedStages, userPosition, userName } = result.data;

  return (
    <ScanOrderClient
      order={order}
      allowedStages={allowedStages}
      userPosition={userPosition}
      userName={userName}
      userRole={session.user.role}
    />
  );
}
