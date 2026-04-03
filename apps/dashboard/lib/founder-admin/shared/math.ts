export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function safeRatio(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}
