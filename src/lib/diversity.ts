import type {
  SurveyRecord,
  DiversityIndices,
  TideZone,
  Season,
  SpeciesRecord,
} from "@/types";

export const TIDE_LABEL: Record<TideZone, string> = {
  high: "高潮带",
  mid: "中潮带",
  low: "低潮带",
};

export const SEASON_LABEL: Record<Season, string> = {
  spring: "春季",
  summer: "夏季",
  autumn: "秋季",
  winter: "冬季",
};

export const SUBSTRATE_LABEL: Record<string, string> = {
  rocky: "岩礁",
  sandy: "沙滩",
  muddy: "泥滩",
  pebble: "砾石",
  cobble: "卵石",
  mixed: "混合底质",
};

export function getSeason(dateStr: string): Season {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

export function calcDiversityIndices(
  species: SpeciesRecord[]
): DiversityIndices {
  const validSpecies = species.filter((s) => s.count > 0);
  const S = validSpecies.length;
  const N = validSpecies.reduce((sum, s) => sum + s.count, 0);

  if (N === 0 || S === 0) {
    return {
      shannonWiener: 0,
      pielouEvenness: 0,
      margalefRichness: 0,
      speciesCount: S,
      totalIndividuals: N,
    };
  }

  let H = 0;
  for (const sp of validSpecies) {
    const pi = sp.count / N;
    if (pi > 0) {
      H -= pi * Math.log(pi);
    }
  }

  const Hmax = Math.log(S);
  const J = Hmax > 0 ? H / Hmax : 0;

  const d = N > 1 ? (S - 1) / Math.log(N) : 0;

  return {
    shannonWiener: Number(H.toFixed(4)),
    pielouEvenness: Number(J.toFixed(4)),
    margalefRichness: Number(d.toFixed(4)),
    speciesCount: S,
    totalIndividuals: N,
  };
}

export function getSpeciesAbundanceVector(survey: SurveyRecord): Map<string, number> {
  const vec = new Map<string, number>();
  for (const sp of survey.species) {
    if (sp.count > 0) {
      vec.set(sp.speciesId, (vec.get(sp.speciesId) || 0) + sp.count);
    }
  }
  return vec;
}

export function brayCurtisDistance(
  vecA: Map<string, number>,
  vecB: Map<string, number>
): number {
  const allKeys = new Set([...vecA.keys(), ...vecB.keys()]);
  let sumMin = 0;
  let sumTotal = 0;
  for (const key of allKeys) {
    const a = vecA.get(key) || 0;
    const b = vecB.get(key) || 0;
    sumMin += Math.min(a, b);
    sumTotal += a + b;
  }
  if (sumTotal === 0) return 1;
  return 1 - (2 * sumMin) / sumTotal;
}

export interface BrayCurtisResult {
  matrix: number[][];
  labels: string[];
}

export function calcBrayCurtisMatrix(surveys: SurveyRecord[]): BrayCurtisResult {
  const n = surveys.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const labels = surveys.map((s) => `${s.stationName}-${s.date}`);
  const vectors = surveys.map(getSpeciesAbundanceVector);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dist = brayCurtisDistance(vectors[i], vectors[j]);
      matrix[i][j] = dist;
      matrix[j][i] = dist;
    }
  }

  return { matrix, labels };
}

export interface PCoAPoint {
  x: number;
  y: number;
}

export function pcoa(distanceMatrix: number[][]): PCoAPoint[] {
  const n = distanceMatrix.length;
  if (n < 2) return [];

  const D2 = distanceMatrix.map((row) => row.map((d) => d * d));

  const rowMean = D2.map((row) => row.reduce((a, b) => a + b, 0) / n);
  const colMean: number[] = [];
  for (let j = 0; j < n; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += D2[i][j];
    colMean.push(sum / n);
  }
  const totalMean = D2.flat().reduce((a, b) => a + b, 0) / (n * n);

  const B: number[][] = [];
  for (let i = 0; i < n; i++) {
    B[i] = [];
    for (let j = 0; j < n; j++) {
      B[i][j] = -0.5 * (D2[i][j] - rowMean[i] - colMean[j] + totalMean);
    }
  }

  const eigenvalues = jacobiEigen(B);
  eigenvalues.sort((a, b) => b.value - a.value);

  const points: PCoAPoint[] = [];
  for (let i = 0; i < n; i++) {
    const ev1 = Math.max(0, eigenvalues[0]?.value || 0);
    const ev2 = Math.max(0, eigenvalues[1]?.value || 0);
    points.push({
      x: (eigenvalues[0]?.vector[i] || 0) * Math.sqrt(ev1),
      y: (eigenvalues[1]?.vector[i] || 0) * Math.sqrt(ev2),
    });
  }

  return points;
}

interface EigenResult {
  value: number;
  vector: number[];
}

function jacobiEigen(A: number[][]): EigenResult[] {
  const n = A.length;
  const V: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
  const M = A.map((row) => [...row]);

  for (let iter = 0; iter < 100; iter++) {
    let p = 0,
      q = 1;
    let maxOff = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(M[i][j]) > maxOff) {
          maxOff = Math.abs(M[i][j]);
          p = i;
          q = j;
        }
      }
    }
    if (maxOff < 1e-10) break;

    const theta = (M[q][q] - M[p][p]) / (2 * M[p][q]);
    const t = theta >= 0 ? 1 / (theta + Math.sqrt(1 + theta * theta)) : 1 / (theta - Math.sqrt(1 + theta * theta));
    const c = 1 / Math.sqrt(1 + t * t);
    const s = t * c;

    const Mpp = M[p][p];
    const Mqq = M[q][q];
    const Mpq = M[p][q];
    M[p][p] = Mpp - t * Mpq;
    M[q][q] = Mqq + t * Mpq;
    M[p][q] = 0;
    M[q][p] = 0;

    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const aip = M[i][p];
        const aiq = M[i][q];
        M[i][p] = c * aip - s * aiq;
        M[p][i] = M[i][p];
        M[i][q] = s * aip + c * aiq;
        M[q][i] = M[i][q];
      }
      const vip = V[i][p];
      const viq = V[i][q];
      V[i][p] = c * vip - s * viq;
      V[i][q] = s * vip + c * viq;
    }
  }

  const result: EigenResult[] = [];
  for (let i = 0; i < n; i++) {
    result.push({
      value: M[i][i],
      vector: V.map((row) => row[i]),
    });
  }
  return result;
}

export interface ClusterNode {
  id: string;
  label?: string;
  height: number;
  left?: ClusterNode;
  right?: ClusterNode;
  leaf?: boolean;
}

export function hclust(
  distanceMatrix: number[][],
  labels: string[],
  method: "average" | "complete" | "single" = "average"
): ClusterNode {
  const n = distanceMatrix.length;
  if (n === 0) return { id: "empty", height: 0 };
  if (n === 1) return { id: "0", label: labels[0], height: 0, leaf: true };

  const clusters: ClusterNode[] = [];
  const active: boolean[] = [];
  const clusterSize: number[] = [];
  for (let i = 0; i < n; i++) {
    clusters.push({ id: String(i), label: labels[i], height: 0, leaf: true });
    active.push(true);
    clusterSize.push(1);
  }

  const dist: number[][] = distanceMatrix.map((row) => [...row]);
  let nextId = n;

  while (active.filter(Boolean).length > 1) {
    let minD = Infinity;
    let a = -1,
      b = -1;
    for (let i = 0; i < dist.length; i++) {
      if (!active[i]) continue;
      for (let j = i + 1; j < dist.length; j++) {
        if (!active[j]) continue;
        if (dist[i][j] < minD) {
          minD = dist[i][j];
          a = i;
          b = j;
        }
      }
    }

    const newNode: ClusterNode = {
      id: String(nextId++),
      height: minD,
      left: clusters[a],
      right: clusters[b],
    };
    clusters.push(newNode);
    active.push(true);
    clusterSize.push(clusterSize[a] + clusterSize[b]);
    active[a] = false;
    active[b] = false;

    const sizeA = clusterSize[a];
    const sizeB = clusterSize[b];
    const newRow: number[] = [];
    for (let k = 0; k < clusters.length - 1; k++) {
      if (!active[k]) {
        newRow.push(0);
      } else {
        let d: number;
        if (method === "average") {
          d = (dist[a][k] * sizeA + dist[b][k] * sizeB) / (sizeA + sizeB);
        } else if (method === "complete") {
          d = Math.max(dist[a][k], dist[b][k]);
        } else {
          d = Math.min(dist[a][k], dist[b][k]);
        }
        newRow.push(d);
      }
    }
    for (let k = 0; k < clusters.length - 1; k++) {
      dist[k].push(newRow[k]);
    }
    newRow.push(0);
    dist.push(newRow);
  }

  return clusters[clusters.length - 1];
}

export interface DendrogramLayout {
  width: number;
  height: number;
  links: { points: string }[];
  nodes: { id: string; x: number; y: number; leaf: boolean; label?: string }[];
}

export function layoutDendrogram(root: ClusterNode): DendrogramLayout {
  const leafWidth = 80;
  const maxHeight = 400;

  function countLeaves(node: ClusterNode): number {
    if (node.leaf) return 1;
    return countLeaves(node.left!) + countLeaves(node.right!);
  }

  const totalLeaves = countLeaves(root);
  const width = Math.max(600, totalLeaves * leafWidth + 100);
  const height = maxHeight;

  const links: { points: string }[] = [];
  const nodes: DendrogramLayout["nodes"] = [];

  let maxH = root.height || 1;
  function findMax(node: ClusterNode): void {
    if (node.height > maxH) maxH = node.height;
    if (node.left) findMax(node.left);
    if (node.right) findMax(node.right);
  }
  findMax(root);
  if (maxH === 0) maxH = 1;

  function layout(
    node: ClusterNode,
    xStart: number,
    xEnd: number
  ): { x: number; y: number } {
    const y = height - 40 - (node.height / maxH) * (height - 80);
    let x: number;

    if (node.leaf) {
      x = (xStart + xEnd) / 2;
      nodes.push({
        id: node.id,
        x,
        y,
        leaf: true,
        label: node.label,
      });
    } else {
      const leaves = countLeaves(node);
      const leftLeaves = countLeaves(node.left!);
      const split = xStart + (xEnd - xStart) * (leftLeaves / leaves);

      const left = layout(node.left!, xStart, split);
      const right = layout(node.right!, split, xEnd);

      x = (left.x + right.x) / 2;

      links.push({
        points: `M ${left.x} ${left.y} L ${left.x} ${y} L ${right.x} ${y} L ${right.x} ${right.y}`,
      });

      nodes.push({ id: node.id, x, y, leaf: false });
    }

    return { x, y };
  }

  layout(root, 50, width - 50);

  return { width, height, links, nodes };
}
