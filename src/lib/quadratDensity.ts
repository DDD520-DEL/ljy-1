export type ShapeType = "square" | "circle";

export interface SquarePreset {
  label: string;
  side: number;
}

export interface CirclePreset {
  label: string;
  radius: number;
}

export const SQUARE_PRESETS: SquarePreset[] = [
  { label: "0.25×0.25m", side: 0.25 },
  { label: "0.5×0.5m", side: 0.5 },
  { label: "1×1m", side: 1 },
  { label: "2×2m", side: 2 },
  { label: "5×5m", side: 5 },
];

export const CIRCLE_PRESETS: CirclePreset[] = [
  { label: "r=0.28m", radius: 0.282 },
  { label: "r=0.56m", radius: 0.564 },
  { label: "r=1m", radius: 1 },
  { label: "r=1.78m", radius: 1.784 },
  { label: "r=2.82m", radius: 2.821 },
];

const CIRCLE_TO_SQUARE_MAP: Record<string, string> = {
  "r=0.28m": "0.5×0.5m",
  "r=0.56m": "1×1m",
  "r=1m": "2×2m",
  "r=1.78m": "2×2m",
  "r=2.82m": "5×5m",
};

const VALID_QUADRAT_SIZES = new Set(SQUARE_PRESETS.map((p) => p.label));

export function mapCircleToSquare(circleLabel: string): string | null {
  return CIRCLE_TO_SQUARE_MAP[circleLabel] || null;
}

export function isValidQuadratSize(size: string): boolean {
  return VALID_QUADRAT_SIZES.has(size);
}

export function getMappedQuadratSize(
  shape: ShapeType,
  label: string
): string | null {
  if (shape === "square") {
    return isValidQuadratSize(label) ? label : null;
  }
  return mapCircleToSquare(label);
}

export function calculateSquareArea(side: number): number {
  return side * side;
}

export function calculateCircleArea(radius: number): number {
  return Math.PI * radius * radius;
}

export function sqMetersToHectares(sqMeters: number): number {
  return sqMeters / 10000;
}

export function calculateDensity(
  totalIndividuals: number,
  areaSqMeters: number
): { perSqMeter: number; perHectare: number } {
  if (areaSqMeters <= 0) {
    return { perSqMeter: 0, perHectare: 0 };
  }
  const perSqMeter = totalIndividuals / areaSqMeters;
  const perHectare = perSqMeter * 10000;
  return { perSqMeter, perHectare };
}

export function findNearestSquarePreset(area: number): string | null {
  if (area <= 0) return null;
  let nearest: string | null = null;
  let minDiff = Infinity;
  for (const preset of SQUARE_PRESETS) {
    const presetArea = preset.side * preset.side;
    const diff = Math.abs(presetArea - area);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = preset.label;
    }
  }
  return nearest;
}
