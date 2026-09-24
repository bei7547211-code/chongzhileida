export type TokenPrice = {
  inputPerMillion: number;
  outputPerMillion: number;
};

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

export function calculateTokenCost({
  inputTokens,
  outputTokens,
  runs,
  price,
}: {
  inputTokens: number;
  outputTokens: number;
  runs: number;
  price: TokenPrice;
}) {
  const safeInputTokens = Number.isFinite(inputTokens)
    ? Math.max(0, inputTokens)
    : 0;
  const safeOutputTokens = Number.isFinite(outputTokens)
    ? Math.max(0, outputTokens)
    : 0;
  const safeRuns = Number.isFinite(runs) ? Math.max(0, runs) : 0;
  const inputCost = roundCurrency(
    (safeInputTokens / 1_000_000) * price.inputPerMillion * safeRuns,
  );
  const outputCost = roundCurrency(
    (safeOutputTokens / 1_000_000) * price.outputPerMillion * safeRuns,
  );

  return {
    inputCost,
    outputCost,
    totalCost: roundCurrency(inputCost + outputCost),
  };
}
