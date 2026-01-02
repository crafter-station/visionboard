const API_KEY = process.env.FAL_KEY_ADMIN;
const BASE_URL = "https://api.fal.ai/v1";

if (!API_KEY) {
  console.error("FAL_KEY_ADMIN environment variable is not set");
  process.exit(1);
}

const headers = {
  Authorization: `Key ${API_KEY}`,
  "Content-Type": "application/json",
};

const KNOWN_PRICING: Record<string, { price: number; unit: string }> = {
  "fal-ai/qwen-image-edit": { price: 0.035, unit: "image" },
  "fal-ai/birefnet": { price: 0.01, unit: "image" },
  "fal-ai/gpt-image-1.5/edit": { price: 0.08, unit: "image" },
};

interface UsageResult {
  endpoint_id: string;
  quantity: number;
  unit: string;
}

interface TimeBucket {
  start: string;
  end: string;
  results: UsageResult[];
}

interface UsageResponse {
  time_series: TimeBucket[];
}

async function fetchUsage(
  startDate: Date,
  endDate: Date,
): Promise<UsageResponse | null> {
  const params = new URLSearchParams({
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    limit: "1000",
  });

  const response = await fetch(`${BASE_URL}/models/usage?${params}`, {
    headers,
  });

  if (!response.ok) {
    console.error(`Error fetching usage data: ${response.status}`);
    const text = await response.text();
    console.error(text);
    return null;
  }

  return response.json();
}

function aggregateUsage(
  usageData: UsageResponse,
): Map<string, { quantity: number; unit: string }> {
  const aggregated = new Map<string, { quantity: number; unit: string }>();

  for (const bucket of usageData.time_series) {
    for (const result of bucket.results) {
      const existing = aggregated.get(result.endpoint_id);
      if (existing) {
        existing.quantity += result.quantity;
      } else {
        aggregated.set(result.endpoint_id, {
          quantity: result.quantity,
          unit: result.unit,
        });
      }
    }
  }

  return aggregated;
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

async function main() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  console.log("=".repeat(60));
  console.log("FAL.AI USAGE REPORT");
  console.log("=".repeat(60));
  console.log(
    `Period: ${startDate.toDateString()} - ${endDate.toDateString()}`,
  );
  console.log("");

  const usageData = await fetchUsage(startDate, endDate);

  if (!usageData) {
    console.error("Failed to retrieve usage data.");
    return;
  }

  const aggregatedUsage = aggregateUsage(usageData);

  const projectModels = [
    "fal-ai/qwen-image-edit",
    "fal-ai/birefnet",
    "fal-ai/gpt-image-1.5/edit",
  ];

  let totalCost = 0;
  const modelCosts: { model: string; quantity: number; cost: number }[] = [];

  console.log("MODEL USAGE BREAKDOWN");
  console.log("-".repeat(60));
  console.log("(Using estimated pricing from fal.ai website)");

  for (const model of projectModels) {
    const usage = aggregatedUsage.get(model);
    const pricing = KNOWN_PRICING[model];

    if (usage && pricing) {
      const cost = usage.quantity * pricing.price;
      totalCost += cost;
      modelCosts.push({ model, quantity: usage.quantity, cost });

      console.log(`\nModel: ${model}`);
      console.log(`  Requests: ${usage.quantity}`);
      console.log(
        `  Unit Price: ${formatCurrency(pricing.price)}/${pricing.unit}`,
      );
      console.log(`  Subtotal: ${formatCurrency(cost)}`);
    } else if (usage) {
      const estimatedPrice = 0.05;
      const cost = usage.quantity * estimatedPrice;
      totalCost += cost;
      modelCosts.push({ model, quantity: usage.quantity, cost });

      console.log(`\nModel: ${model}`);
      console.log(`  Requests: ${usage.quantity}`);
      console.log(
        `  Unit Price: ~${formatCurrency(estimatedPrice)}/request (estimated)`,
      );
      console.log(`  Subtotal: ~${formatCurrency(cost)}`);
    } else {
      console.log(`\nModel: ${model}`);
      console.log(`  No usage recorded`);
    }
  }

  console.log("\n" + "-".repeat(60));
  console.log(`TOTAL COST (30 days): ${formatCurrency(totalCost)}`);

  console.log("\n" + "=".repeat(60));
  console.log("ALL MODELS WITH USAGE");
  console.log("=".repeat(60));

  let allModelsCost = 0;
  for (const [endpointId, usage] of aggregatedUsage) {
    const pricing = KNOWN_PRICING[endpointId];
    const cost = pricing
      ? usage.quantity * pricing.price
      : usage.quantity * 0.05;
    allModelsCost += cost;

    console.log(`\n${endpointId}`);
    console.log(`  Requests: ${usage.quantity} ${usage.unit}`);
    console.log(
      `  Cost: ${formatCurrency(cost)}${!pricing ? " (estimated)" : ""}`,
    );
  }

  console.log("\n" + "-".repeat(60));
  console.log(`TOTAL COST (all models): ${formatCurrency(allModelsCost)}`);

  console.log("\n" + "=".repeat(60));
  console.log("PRICING RECOMMENDATIONS FOR ONE-TIME PAYMENT");
  console.log("=".repeat(60));

  const totalRequests = modelCosts.reduce((sum, m) => sum + m.quantity, 0);
  const dailyCost = totalCost / 30;
  const avgRequestsPerDay = totalRequests / 30;

  console.log(`\nCurrent Stats:`);
  console.log(`  Total requests: ${totalRequests}`);
  console.log(`  Daily cost: ${formatCurrency(dailyCost)}`);
  console.log(`  Avg requests/day: ${avgRequestsPerDay.toFixed(1)}`);
  console.log(`  Monthly cost: ${formatCurrency(totalCost)}`);

  const costPerBoard =
    (KNOWN_PRICING["fal-ai/qwen-image-edit"]?.price || 0.035) +
    (KNOWN_PRICING["fal-ai/birefnet"]?.price || 0.01) +
    (KNOWN_PRICING["fal-ai/gpt-image-1.5/edit"]?.price || 0.08);

  console.log(`\nCost per complete vision board (3 API calls):`);
  console.log(
    `  Pixelate: ${formatCurrency(KNOWN_PRICING["fal-ai/qwen-image-edit"]?.price || 0.035)}`,
  );
  console.log(
    `  Remove BG: ${formatCurrency(KNOWN_PRICING["fal-ai/birefnet"]?.price || 0.01)}`,
  );
  console.log(
    `  Generate: ${formatCurrency(KNOWN_PRICING["fal-ai/gpt-image-1.5/edit"]?.price || 0.08)}`,
  );
  console.log(`  TOTAL: ${formatCurrency(costPerBoard)}`);

  console.log(`\nRecommended One-Time Payment Tiers:`);

  const margins = [1.5, 2.0, 2.5, 3.0, 4.0];

  console.log("\n  Per-Board Pricing (with margin):");
  for (const margin of margins) {
    const price = costPerBoard * margin;
    const profit = price - costPerBoard;
    console.log(
      `    ${margin}x: ${formatCurrency(price)} (profit: ${formatCurrency(profit)})`,
    );
  }

  console.log("\n  Suggested Price Points:");
  const pricePoints = [0.49, 0.99, 1.49, 1.99, 2.99];
  for (const price of pricePoints) {
    const margin = price / costPerBoard;
    const profit = price - costPerBoard;
    console.log(
      `    $${price.toFixed(2)}: ${margin.toFixed(1)}x margin (profit: ${formatCurrency(profit)})`,
    );
  }

  console.log("\n  Bundle Pricing Suggestions:");
  const bundles = [
    { boards: 1, price: 0.99 },
    { boards: 3, price: 1.99 },
    { boards: 5, price: 2.99 },
    { boards: 10, price: 4.99 },
  ];
  for (const bundle of bundles) {
    const cost = costPerBoard * bundle.boards;
    const profit = bundle.price - cost;
    const perBoard = bundle.price / bundle.boards;
    console.log(
      `    ${bundle.boards} board${bundle.boards > 1 ? "s" : ""}: $${bundle.price.toFixed(2)} ($${perBoard.toFixed(2)}/each, profit: ${formatCurrency(profit)})`,
    );
  }

  console.log("\n  Revenue Projection (at $0.99/board):");
  const projections = [100, 500, 1000, 5000, 10000];
  for (const users of projections) {
    const revenue = users * 0.99;
    const costs = users * costPerBoard;
    const profit = revenue - costs;
    console.log(
      `    ${users.toLocaleString()} sales: $${revenue.toFixed(2)} revenue, $${costs.toFixed(2)} cost, $${profit.toFixed(2)} profit`,
    );
  }
}

main().catch(console.error);
