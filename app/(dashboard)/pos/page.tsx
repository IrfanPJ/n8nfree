export const dynamic = "force-dynamic";
import { getProducts } from "@/actions/products";
import { POSClient } from "./pos-client";

export default async function POSPage() {
  const products = await getProducts();
  return <POSClient products={products} />;
}
