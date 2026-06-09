import { describe, it, expect } from "vitest";
import {
  SQUARE_PRESETS,
  CIRCLE_PRESETS,
  mapCircleToSquare,
  isValidQuadratSize,
  getMappedQuadratSize,
  calculateSquareArea,
  calculateCircleArea,
  sqMetersToHectares,
  calculateDensity,
  findNearestSquarePreset,
} from "../src/lib/quadratDensity";
import type { ShapeType } from "../src/lib/quadratDensity";

describe("SQUARE_PRESETS - 正方形预设配置", () => {
  it("应包含 5 档标准样方预设", () => {
    expect(SQUARE_PRESETS).toHaveLength(5);
    expect(SQUARE_PRESETS.map((p) => p.label)).toEqual([
      "0.25×0.25m",
      "0.5×0.5m",
      "1×1m",
      "2×2m",
      "5×5m",
    ]);
  });

  it("每档预设的边长和面积应正确", () => {
    expect(SQUARE_PRESETS[0].side).toBe(0.25);
    expect(calculateSquareArea(SQUARE_PRESETS[0].side)).toBeCloseTo(0.0625);

    expect(SQUARE_PRESETS[1].side).toBe(0.5);
    expect(calculateSquareArea(SQUARE_PRESETS[1].side)).toBeCloseTo(0.25);

    expect(SQUARE_PRESETS[2].side).toBe(1);
    expect(calculateSquareArea(SQUARE_PRESETS[2].side)).toBeCloseTo(1);

    expect(SQUARE_PRESETS[3].side).toBe(2);
    expect(calculateSquareArea(SQUARE_PRESETS[3].side)).toBeCloseTo(4);

    expect(SQUARE_PRESETS[4].side).toBe(5);
    expect(calculateSquareArea(SQUARE_PRESETS[4].side)).toBeCloseTo(25);
  });
});

describe("CIRCLE_PRESETS - 圆形预设配置", () => {
  it("应包含 5 档圆形预设", () => {
    expect(CIRCLE_PRESETS).toHaveLength(5);
    expect(CIRCLE_PRESETS.map((p) => p.label)).toEqual([
      "r=0.28m",
      "r=0.56m",
      "r=1m",
      "r=1.78m",
      "r=2.82m",
    ]);
  });

  it("圆形预设面积应近似对应方形预设", () => {
    expect(calculateCircleArea(0.28)).toBeCloseTo(0.25, 2);
    expect(calculateCircleArea(0.56)).toBeCloseTo(1, 2);
    expect(calculateCircleArea(1)).toBeCloseTo(3.14, 2);
    expect(calculateCircleArea(1.78)).toBeCloseTo(10, 1);
    expect(calculateCircleArea(2.82)).toBeCloseTo(25, 1);
  });
});

describe("mapCircleToSquare - 圆形预设映射为方形标签（核心修复）", () => {
  it("r=0.28m ≈ 0.25m² → 应映射为 0.5×0.5m", () => {
    expect(mapCircleToSquare("r=0.28m")).toBe("0.5×0.5m");
  });

  it("r=0.56m ≈ 1m² → 应映射为 1×1m", () => {
    expect(mapCircleToSquare("r=0.56m")).toBe("1×1m");
  });

  it("r=1m ≈ 3.14m² → 应映射为最接近的 2×2m", () => {
    expect(mapCircleToSquare("r=1m")).toBe("2×2m");
  });

  it("r=1.78m ≈ 10m² → 应映射为 2×2m（无完全对应时取保守值）", () => {
    expect(mapCircleToSquare("r=1.78m")).toBe("2×2m");
  });

  it("r=2.82m ≈ 25m² → 应映射为 5×5m", () => {
    expect(mapCircleToSquare("r=2.82m")).toBe("5×5m");
  });

  it("未知圆形标签应返回 null 而非非法值", () => {
    expect(mapCircleToSquare("r=0.1m")).toBeNull();
    expect(mapCircleToSquare("unknown")).toBeNull();
    expect(mapCircleToSquare("")).toBeNull();
  });
});

describe("isValidQuadratSize - 验证 quadratSize 合法性", () => {
  it("5 个方形预设标签应为合法值", () => {
    expect(isValidQuadratSize("0.25×0.25m")).toBe(true);
    expect(isValidQuadratSize("0.5×0.5m")).toBe(true);
    expect(isValidQuadratSize("1×1m")).toBe(true);
    expect(isValidQuadratSize("2×2m")).toBe(true);
    expect(isValidQuadratSize("5×5m")).toBe(true);
  });

  it("圆形标签不应被视为合法 quadratSize", () => {
    expect(isValidQuadratSize("r=0.28m")).toBe(false);
    expect(isValidQuadratSize("r=1m")).toBe(false);
  });

  it("任意字符串应为非法值", () => {
    expect(isValidQuadratSize("")).toBe(false);
    expect(isValidQuadratSize("10x10m")).toBe(false);
    expect(isValidQuadratSize("abc")).toBe(false);
  });
});

describe("getMappedQuadratSize - 根据形状获取合法 quadratSize", () => {
  it("方形 + 合法标签 → 返回原标签", () => {
    expect(getMappedQuadratSize("square", "1×1m")).toBe("1×1m");
    expect(getMappedQuadratSize("square", "5×5m")).toBe("5×5m");
  });

  it("方形 + 非法标签 → 返回 null（防止传递非法值）", () => {
    expect(getMappedQuadratSize("square", "r=1m")).toBeNull();
    expect(getMappedQuadratSize("square", "invalid")).toBeNull();
  });

  it("圆形 + 已配置标签 → 返回映射后的方形标签", () => {
    expect(getMappedQuadratSize("circle", "r=0.28m")).toBe("0.5×0.5m");
    expect(getMappedQuadratSize("circle", "r=0.56m")).toBe("1×1m");
    expect(getMappedQuadratSize("circle", "r=2.82m")).toBe("5×5m");
  });

  it("圆形 + 未配置标签 → 返回 null", () => {
    expect(getMappedQuadratSize("circle", "r=0.1m")).toBeNull();
  });
});

describe("calculateSquareArea - 正方形面积计算", () => {
  it("边长为 0.5 → 面积为 0.25", () => {
    expect(calculateSquareArea(0.5)).toBeCloseTo(0.25);
  });

  it("边长为 1 → 面积为 1", () => {
    expect(calculateSquareArea(1)).toBe(1);
  });

  it("边长为 0 → 面积为 0", () => {
    expect(calculateSquareArea(0)).toBe(0);
  });
});

describe("calculateCircleArea - 圆形面积计算", () => {
  it("半径 0.28 → 面积约 0.25", () => {
    expect(calculateCircleArea(0.28)).toBeCloseTo(0.25, 2);
  });

  it("半径 0.56 → 面积约 1", () => {
    expect(calculateCircleArea(0.56)).toBeCloseTo(1, 2);
  });

  it("半径 1 → 面积约 3.14", () => {
    expect(calculateCircleArea(1)).toBeCloseTo(Math.PI, 4);
  });
});

describe("sqMetersToHectares - 平方米转公顷", () => {
  it("10000 平方米 = 1 公顷", () => {
    expect(sqMetersToHectares(10000)).toBe(1);
  });

  it("1 平方米 = 0.0001 公顷", () => {
    expect(sqMetersToHectares(1)).toBe(0.0001);
  });

  it("0 平方米 = 0 公顷", () => {
    expect(sqMetersToHectares(0)).toBe(0);
  });
});

describe("calculateDensity - 密度计算", () => {
  it("100 个体 / 1m² → 100 个体/m²，1000000 个体/公顷", () => {
    const result = calculateDensity(100, 1);
    expect(result.perSqMeter).toBe(100);
    expect(result.perHectare).toBe(1000000);
  });

  it("25 个体 / 0.25m² → 100 个体/m²", () => {
    const result = calculateDensity(25, 0.25);
    expect(result.perSqMeter).toBe(100);
    expect(result.perHectare).toBe(1000000);
  });

  it("面积为 0 时应返回 0 密度（防止除零错误）", () => {
    const result = calculateDensity(100, 0);
    expect(result.perSqMeter).toBe(0);
    expect(result.perHectare).toBe(0);
  });

  it("面积为负数时应返回 0 密度", () => {
    const result = calculateDensity(100, -1);
    expect(result.perSqMeter).toBe(0);
    expect(result.perHectare).toBe(0);
  });

  it("个体数为 0 时密度应为 0", () => {
    const result = calculateDensity(0, 1);
    expect(result.perSqMeter).toBe(0);
    expect(result.perHectare).toBe(0);
  });
});

describe("findNearestSquarePreset - 查找面积最接近的方形预设", () => {
  it("面积 0.24 → 最接近 0.5×0.5m (0.25m²)", () => {
    expect(findNearestSquarePreset(0.24)).toBe("0.5×0.5m");
  });

  it("面积 1 → 最接近 1×1m", () => {
    expect(findNearestSquarePreset(1)).toBe("1×1m");
  });

  it("面积 3.14 → 最接近 2×2m (4m²)", () => {
    expect(findNearestSquarePreset(3.14)).toBe("2×2m");
  });

  it("面积 25 → 最接近 5×5m", () => {
    expect(findNearestSquarePreset(25)).toBe("5×5m");
  });

  it("面积 <= 0 时应返回 null", () => {
    expect(findNearestSquarePreset(0)).toBeNull();
    expect(findNearestSquarePreset(-1)).toBeNull();
  });
});

describe("集成场景：选择圆形预设时不传递非法 quadratSize（Bug 修复验证）", () => {
  function simulateSelectPreset(
    shape: ShapeType,
    label: string,
    currentSize: string
  ): { nextSize: string | null; isValid: boolean } {
    const mapped = getMappedQuadratSize(shape, label);
    return {
      nextSize: mapped,
      isValid: mapped ? isValidQuadratSize(mapped) : false,
    };
  }

  it("场景：选择圆形预设 r=0.28m → 传递合法值 0.5×0.5m", () => {
    const result = simulateSelectPreset("circle", "r=0.28m", "1×1m");
    expect(result.nextSize).toBe("0.5×0.5m");
    expect(result.isValid).toBe(true);
  });

  it("场景：选择圆形预设 r=0.56m → 传递合法值 1×1m", () => {
    const result = simulateSelectPreset("circle", "r=0.56m", "1×1m");
    expect(result.nextSize).toBe("1×1m");
    expect(result.isValid).toBe(true);
  });

  it("场景：选择方形预设 1×1m → 直接传递原值", () => {
    const result = simulateSelectPreset("square", "1×1m", "0.5×0.5m");
    expect(result.nextSize).toBe("1×1m");
    expect(result.isValid).toBe(true);
  });

  it("场景：SurveyForm 下拉框所有 QUADRAT_OPTIONS 均为合法值", () => {
    const QUADRAT_OPTIONS = ["0.25×0.25m", "0.5×0.5m", "1×1m", "2×2m", "5×5m"];
    for (const opt of QUADRAT_OPTIONS) {
      expect(isValidQuadratSize(opt)).toBe(true);
    }
  });

  it("场景：圆形预设映射后的值均存在于 QUADRAT_OPTIONS 中", () => {
    const QUADRAT_OPTIONS = new Set([
      "0.25×0.25m",
      "0.5×0.5m",
      "1×1m",
      "2×2m",
      "5×5m",
    ]);
    for (const circle of CIRCLE_PRESETS) {
      const mapped = mapCircleToSquare(circle.label);
      expect(mapped).not.toBeNull();
      expect(QUADRAT_OPTIONS.has(mapped!)).toBe(true);
    }
  });

  it("场景：完整流程 - 从圆形预设到密度计算", () => {
    const circleLabel = "r=0.56m";
    const circlePreset = CIRCLE_PRESETS.find((p) => p.label === circleLabel)!;
    const area = calculateCircleArea(circlePreset.radius);
    const mappedSize = getMappedQuadratSize("circle", circleLabel);
    const density = calculateDensity(50, area);

    expect(area).toBeCloseTo(1, 2);
    expect(mappedSize).toBe("1×1m");
    expect(isValidQuadratSize(mappedSize!)).toBe(true);
    expect(density.perSqMeter).toBeCloseTo(50, 0);
    expect(density.perHectare).toBeCloseTo(500000, -3);
  });
});
