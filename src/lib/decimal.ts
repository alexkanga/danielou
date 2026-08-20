import Decimal from "decimal.js";

Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
});

export type RoundingStrategy = "HALF_UP" | "HALF_EVEN" | "TRUNCATE";

type Rounding = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const ROUNDING_MAP: Record<RoundingStrategy, Rounding> = {
  HALF_UP: Decimal.ROUND_HALF_UP,
  HALF_EVEN: Decimal.ROUND_HALF_EVEN,
  TRUNCATE: Decimal.ROUND_DOWN,
};

export function add(a: string | number, b: string | number): string {
  return new Decimal(a).plus(new Decimal(b)).toString();
}

export function subtract(a: string | number, b: string | number): string {
  return new Decimal(a).minus(new Decimal(b)).toString();
}

export function multiply(a: string | number, b: string | number): string {
  return new Decimal(a).times(new Decimal(b)).toString();
}

export function divide(a: string | number, b: string | number, dp = 10): string {
  if (new Decimal(b).isZero()) {
    throw new Error("Division by zero");
  }
  return new Decimal(a).div(new Decimal(b)).toDecimalPlaces(dp).toString();
}

export function round(
  value: string | number,
  decimals: number,
  strategy: RoundingStrategy = "HALF_UP"
): string {
  return new Decimal(value)
    .toDecimalPlaces(decimals, ROUNDING_MAP[strategy])
    .toString();
}

export function normalize(
  rawGrade: string | number,
  originalScale: number,
  targetScale: number,
  decimals: number = 2,
  strategy: RoundingStrategy = "HALF_UP"
): string {
  if (originalScale === targetScale) {
    return round(rawGrade, decimals, strategy);
  }
  if (originalScale <= 0) {
    throw new Error("Original scale must be positive");
  }
  const normalized = new Decimal(rawGrade)
    .times(new Decimal(targetScale))
    .div(new Decimal(originalScale));
  return normalized.toDecimalPlaces(decimals, ROUNDING_MAP[strategy]).toString();
}

export function simpleAverage(values: (string | number)[], decimals: number = 2, strategy: RoundingStrategy = "HALF_UP"): string {
  if (values.length === 0) return "0";
  const sum = values.reduce(
    (acc, val) => acc.plus(new Decimal(val)),
    new Decimal(0)
  );
  return sum
    .div(new Decimal(values.length))
    .toDecimalPlaces(decimals, ROUNDING_MAP[strategy])
    .toString();
}

export function weightedAverage(
  values: { grade: string | number; weight: number }[],
  decimals: number = 2,
  strategy: RoundingStrategy = "HALF_UP"
): string {
  if (values.length === 0) return "0";
  const totalWeight = values.reduce(
    (acc, v) => acc.plus(new Decimal(v.weight)),
    new Decimal(0)
  );
  if (totalWeight.isZero()) return "0";

  const weightedSum = values.reduce(
    (acc, v) => acc.plus(new Decimal(v.grade).times(new Decimal(v.weight))),
    new Decimal(0)
  );
  return weightedSum
    .div(totalWeight)
    .toDecimalPlaces(decimals, ROUNDING_MAP[strategy])
    .toString();
}

export function decimalMax(a: string | number, b: string | number): string {
  return Decimal.max(new Decimal(a), new Decimal(b)).toString();
}

export function decimalMin(a: string | number, b: string | number): string {
  return Decimal.min(new Decimal(a), new Decimal(b)).toString();
}

export function isBetween(
  value: string | number,
  min: string | number,
  max: string | number
): boolean {
  const d = new Decimal(value);
  return d.gte(new Decimal(min)) && d.lte(new Decimal(max));
}
