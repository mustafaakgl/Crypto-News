import { getMarketPrices } from "@/lib/prices";
import { PricesExplorer } from "@/components/PricesExplorer";

export const revalidate = 600;

export default async function PricesPage() {
  const result = await getMarketPrices();

  return (
    <PricesExplorer assets={result.assets} asOf={result.asOf} error={result.error} scope={result.scope} />
  );
}
