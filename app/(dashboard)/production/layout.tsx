import { ProductionHeaderBar } from "@/components/production/production-header-bar";

export default function ProductionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ProductionHeaderBar />
      {children}
    </div>
  );
}
