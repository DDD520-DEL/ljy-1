import { describe, it, expect } from "vitest";
import {
  calcDiversityIndices,
  brayCurtisDistance,
  calcBrayCurtisMatrix,
  hclust,
  pcoa,
  getSeason,
} from "../src/lib/diversity";
import type { SpeciesRecord } from "../src/types";

function makeSpecies(counts: number[]): SpeciesRecord[] {
  return counts.map((c, i) => ({
    speciesId: `sp${i}`,
    scientificName: `Species ${i}`,
    commonName: `种${i}`,
    count: c,
    coverage: 10,
  }));
}

describe("多样性指数计算", () => {
  it("空样方返回零值", () => {
    const result = calcDiversityIndices([]);
    expect(result.shannonWiener).toBe(0);
    expect(result.pielouEvenness).toBe(0);
    expect(result.margalefRichness).toBe(0);
    expect(result.speciesCount).toBe(0);
    expect(result.totalIndividuals).toBe(0);
  });

  it("单物种均匀度为1 Shannon-Wiener 为 0", () => {
    const result = calcDiversityIndices(makeSpecies([10]));
    expect(result.speciesCount).toBe(1);
    expect(result.totalIndividuals).toBe(10);
    expect(result.pielouEvenness).toBeCloseTo(0, 5);
    expect(result.shannonWiener).toBeCloseTo(0, 5);
  });

  it("两等丰度物种均匀度为1", () => {
    const result = calcDiversityIndices(makeSpecies([50, 50]));
    expect(result.speciesCount).toBe(2);
    expect(result.totalIndividuals).toBe(100);
    const ln2 = Math.log(2);
    expect(result.shannonWiener).toBeCloseTo(ln2, 4);
    expect(result.pielouEvenness).toBeCloseTo(1, 4);
  });

  it("Shannon-Wiener 典型样地测试", () => {
    const result = calcDiversityIndices(makeSpecies([60, 25, 10, 5]));
    expect(result.speciesCount).toBe(4);
    expect(result.totalIndividuals).toBe(100);
    const pi = [0.6, 0.25, 0.1, 0.05];
    const expectedH = -pi.reduce((sum, p) => sum + p * Math.log(p), 0);
    expect(result.shannonWiener).toBeCloseTo(expectedH, 4);
    const expectedJ = expectedH / Math.log(4);
    expect(result.pielouEvenness).toBeCloseTo(expectedJ, 4);
    const expectedD = (4 - 1) / Math.log(100);
    expect(result.margalefRichness).toBeCloseTo(expectedD, 4);
  });
});

describe("季节判断", () => {
  it("3-5月为春季", () => {
    expect(getSeason("2024-03-15")).toBe("spring");
    expect(getSeason("2024-05-31")).toBe("spring");
  });
  it("6-8月为夏季", () => {
    expect(getSeason("2024-06-01")).toBe("summer");
    expect(getSeason("2024-08-31")).toBe("summer");
  });
  it("9-11月为秋季", () => {
    expect(getSeason("2024-09-01")).toBe("autumn");
    expect(getSeason("2024-11-30")).toBe("autumn");
  });
  it("12-2月为冬季", () => {
    expect(getSeason("2024-12-01")).toBe("winter");
    expect(getSeason("2024-01-15")).toBe("winter");
    expect(getSeason("2024-02-28")).toBe("winter");
  });
});

describe("Bray-Curtis 相异度", () => {
  function vec(arr: [string, number][]) {
    const m = new Map<string, number>();
    arr.forEach(([k, v]) => m.set(k, v));
    return m;
  }

  it("完全相同群落距离为0", () => {
    const a = vec([
      ["sp1", 10],
      ["sp2", 20],
    ]);
    expect(brayCurtisDistance(a, a)).toBeCloseTo(0, 6);
  });

  it("完全不同群落距离为1", () => {
    const a = vec([["sp1", 10]]);
    const b = vec([["sp2", 10]]);
    expect(brayCurtisDistance(a, b)).toBeCloseTo(1, 6);
  });

  it("经典案例：A=[3,0,1], B=[2,1,0]", () => {
    const a = vec([
      ["x", 3],
      ["y", 0],
      ["z", 1],
    ]);
    const b = vec([
      ["x", 2],
      ["y", 1],
      ["z", 0],
    ]);
    const sumMin = Math.min(3, 2) + Math.min(0, 1) + Math.min(1, 0);
    const sumTot = (3 + 2) + (0 + 1) + (1 + 0);
    const expected = 1 - (2 * sumMin) / sumTot;
    expect(brayCurtisDistance(a, b)).toBeCloseTo(expected, 6);
  });

  it("矩阵对称且对角线为0", () => {
    const surveys = [
      {
        id: "1",
        date: "2024-01-01",
        stationName: "A",
        tideZone: "mid" as const,
        quadratSize: "1×1m",
        substrateType: "rocky" as const,
        location: { lat: 30, lng: 120 },
        species: makeSpecies([10, 5, 0]),
        createdAt: 1,
      },
      {
        id: "2",
        date: "2024-02-01",
        stationName: "B",
        tideZone: "high" as const,
        quadratSize: "1×1m",
        substrateType: "rocky" as const,
        location: { lat: 30.1, lng: 120.1 },
        species: makeSpecies([2, 8, 5]),
        createdAt: 2,
      },
      {
        id: "3",
        date: "2024-03-01",
        stationName: "C",
        tideZone: "low" as const,
        quadratSize: "1×1m",
        substrateType: "sandy" as const,
        location: { lat: 30.2, lng: 120.2 },
        species: makeSpecies([0, 3, 12]),
        createdAt: 3,
      },
    ];
    const { matrix } = calcBrayCurtisMatrix(surveys);
    for (let i = 0; i < 3; i++) {
      expect(matrix[i][i]).toBe(0);
      for (let j = 0; j < 3; j++) {
        expect(matrix[i][j]).toBeCloseTo(matrix[j][i], 8);
        expect(matrix[i][j]).toBeGreaterThanOrEqual(0);
        expect(matrix[i][j]).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("层次聚类 UPGMA", () => {
  it("两个样本合并节点高度为其距离", () => {
    const D = [
      [0, 0.4],
      [0.4, 0],
    ];
    const tree = hclust(D, ["A", "B"], "average");
    expect(tree.leaf).toBeFalsy();
    expect(tree.height).toBeCloseTo(0.4, 6);
    expect(tree.left?.label).toBe("A");
    expect(tree.right?.label).toBe("B");
  });

  it("UPGMA 平均连锁验证：距离取加权平均", () => {
    const D = [
      [0, 2, 6],
      [2, 0, 6],
      [6, 6, 0],
    ];
    const tree = hclust(D, ["A", "B", "C"], "average");
    function collectLeaves(node: any): string[] {
      if (node.leaf) return [node.label];
      return [...collectLeaves(node.left), ...collectLeaves(node.right)];
    }
    const leaves = collectLeaves(tree);
    expect(leaves).toContain("A");
    expect(leaves).toContain("B");
    expect(leaves).toContain("C");
    const expectedFinalHeight = (6 + 6) / 2;
    expect(tree.height).toBeCloseTo(expectedFinalHeight, 6);
    const childHeights = [tree.left?.height ?? 0, tree.right?.height ?? 0];
    expect(childHeights).toContain(0);
    expect(Math.max(...childHeights)).toBeCloseTo(2, 6);
  });

  it("完全连锁使用 max，与 UPGMA 结果不同", () => {
    const D = [
      [0, 2, 5],
      [2, 0, 7],
      [5, 7, 0],
    ];
    const upgma = hclust(D, ["A", "B", "C"], "average");
    const complete = hclust(D, ["A", "B", "C"], "complete");
    expect(upgma.height).toBeCloseTo((5 + 7) / 2, 6);
    expect(complete.height).toBeCloseTo(Math.max(5, 7), 6);
    expect(upgma.height).not.toBe(complete.height);
  });
});

describe("PCoA 主坐标分析", () => {
  it("输出点数与输入相同", () => {
    const D = [
      [0, 0.3, 0.8],
      [0.3, 0, 0.7],
      [0.8, 0.7, 0],
    ];
    const pts = pcoa(D);
    expect(pts.length).toBe(3);
    pts.forEach((p) => {
      expect(typeof p.x).toBe("number");
      expect(typeof p.y).toBe("number");
    });
  });

  it("相同距离的两点在第一轴上距离等于原始", () => {
    const d = 0.6;
    const D = [
      [0, d],
      [d, 0],
    ];
    const pts = pcoa(D);
    const distInPCoA = Math.abs(pts[0].x - pts[1].x);
    expect(distInPCoA).toBeCloseTo(d, 4);
  });
});
