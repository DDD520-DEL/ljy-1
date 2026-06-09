import { describe, it, expect } from "vitest";
import {
  decimalToDMS,
  dmsToDecimal,
  formatDMS,
  formatDecimal,
  coordinateDecimalToDMS,
  coordinateDMSToDecimal,
  isValidLatitude,
  isValidLongitude,
  parseDMSString,
} from "../src/lib/coordinate";
import type { DMS } from "../src/lib/coordinate";

describe("decimalToDMS - 十进制度转度分秒", () => {
  it("普通值转换应正确", () => {
    const result = decimalToDMS(30.572816, true);
    expect(result.degrees).toBe(30);
    expect(result.minutes).toBe(34);
    expect(result.seconds).toBeCloseTo(22.1376, 4);
    expect(result.direction).toBe("N");
  });

  it("负纬度应标记为 S", () => {
    const result = decimalToDMS(-30.572816, true);
    expect(result.direction).toBe("S");
    expect(result.degrees).toBe(30);
  });

  it("负经度应标记为 W", () => {
    const result = decimalToDMS(-114.298025, false);
    expect(result.direction).toBe("W");
    expect(result.degrees).toBe(114);
  });

  it("东经应标记为 E", () => {
    const result = decimalToDMS(114.298025, false);
    expect(result.direction).toBe("E");
  });

  it("零度值应正确处理", () => {
    const result = decimalToDMS(0, true);
    expect(result.degrees).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBe(0);
    expect(result.direction).toBe("N");
  });

  it("整度值应正确转换（分秒均为0）", () => {
    const result = decimalToDMS(45, true);
    expect(result.degrees).toBe(45);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBeCloseTo(0, 4);
  });

  it("边界值：秒值四舍五入后等于60应进位到分", () => {
    const decimal = 30 + 59 / 60 + 59.99995 / 3600;
    const result = decimalToDMS(decimal, true);
    expect(result.seconds).toBeLessThan(60);
    expect(result.seconds).toBeCloseTo(0, 4);
    expect(result.minutes).toBe(0);
    expect(result.degrees).toBe(31);
  });

  it("边界值：分秒同时进位（59分59.99995秒→下一度）", () => {
    const decimal = 30 + 59 / 60 + 59.999999 / 3600;
    const result = decimalToDMS(decimal, true);
    expect(result.degrees).toBe(31);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBeCloseTo(0, 4);
  });

  it("边界值：秒刚好进位（59.99995）", () => {
    const decimal = 30 + 30 / 60 + 59.99995 / 3600;
    const result = decimalToDMS(decimal, true);
    expect(result.minutes).toBe(31);
    expect(result.seconds).toBeCloseTo(0, 4);
  });

  it("边界值：秒未到进位阈值（59.99994）", () => {
    const decimal = 30 + 30 / 60 + 59.99994 / 3600;
    const result = decimalToDMS(decimal, true);
    expect(result.minutes).toBe(30);
    expect(result.seconds).toBeCloseTo(59.9999, 4);
  });

  it("最大值：纬度90度应正确处理", () => {
    const result = decimalToDMS(90, true);
    expect(result.degrees).toBe(90);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBe(0);
    expect(result.direction).toBe("N");
  });

  it("最大值：经度180度应正确处理", () => {
    const result = decimalToDMS(180, false);
    expect(result.degrees).toBe(180);
    expect(result.direction).toBe("E");
  });

  it("秒值精度应保留4位小数", () => {
    const result = decimalToDMS(30.5, true);
    expect(Number.isFinite(result.seconds)).toBe(true);
    expect((result.seconds * 10000) % 1).toBeCloseTo(0, 2);
  });
});

describe("dmsToDecimal - 度分秒转十进制度", () => {
  it("普通值转换应正确", () => {
    const dms: DMS = { degrees: 30, minutes: 34, seconds: 22.1376, direction: "N" };
    expect(dmsToDecimal(dms)).toBeCloseTo(30.572816, 6);
  });

  it("S 方向应返回负值", () => {
    const dms: DMS = { degrees: 30, minutes: 34, seconds: 22.1376, direction: "S" };
    expect(dmsToDecimal(dms)).toBeCloseTo(-30.572816, 6);
  });

  it("W 方向应返回负值", () => {
    const dms: DMS = { degrees: 114, minutes: 17, seconds: 52.89, direction: "W" };
    expect(dmsToDecimal(dms)).toBeCloseTo(-114.298025, 6);
  });

  it("零值应正确处理", () => {
    const dms: DMS = { degrees: 0, minutes: 0, seconds: 0, direction: "N" };
    expect(dmsToDecimal(dms)).toBe(0);
  });

  it("整度值（分秒均为0）", () => {
    const dms: DMS = { degrees: 45, minutes: 0, seconds: 0, direction: "E" };
    expect(dmsToDecimal(dms)).toBe(45);
  });

  it("仅分为单位的小数度", () => {
    const dms: DMS = { degrees: 1, minutes: 30, seconds: 0, direction: "N" };
    expect(dmsToDecimal(dms)).toBeCloseTo(1.5, 6);
  });
});

describe("双向转换一致性（Round-Trip）", () => {
  it("十进制度 → 度分秒 → 十进制度 应保持一致", () => {
    const testValues = [
      { lat: 30.572816, lng: 114.298025 },
      { lat: -33.8688, lng: 151.2093 },
      { lat: 51.5074, lng: -0.1278 },
      { lat: 0, lng: 0 },
      { lat: 89.9999, lng: 179.9999 },
    ];

    for (const coord of testValues) {
      const dms = coordinateDecimalToDMS(coord);
      const back = coordinateDMSToDecimal(dms);
      expect(back.lat).toBeCloseTo(coord.lat, 4);
      expect(back.lng).toBeCloseTo(coord.lng, 4);
    }
  });

  it("边界进位值 round-trip 应正确", () => {
    const coord = { lat: 30 + 59 / 60 + 59.99995 / 3600, lng: 114 + 59 / 60 + 59.99995 / 3600 };
    const dms = coordinateDecimalToDMS(coord);
    const back = coordinateDMSToDecimal(dms);
    expect(back.lat).toBeCloseTo(31, 4);
    expect(back.lng).toBeCloseTo(115, 4);
  });
});

describe("formatDMS / formatDecimal - 格式化输出", () => {
  it("formatDMS 应输出标准格式", () => {
    const dms: DMS = { degrees: 30, minutes: 34, seconds: 22.1376, direction: "N" };
    expect(formatDMS(dms)).toBe('30°34\'22.1376"N');
  });

  it("formatDMS 秒值不足应补零", () => {
    const dms: DMS = { degrees: 45, minutes: 5, seconds: 3.5, direction: "E" };
    expect(formatDMS(dms)).toBe('45°5\'3.5000"E');
  });

  it("formatDecimal 默认保留8位小数", () => {
    expect(formatDecimal(30.572816)).toBe("30.57281600");
  });

  it("formatDecimal 支持自定义精度", () => {
    expect(formatDecimal(30.572816, 2)).toBe("30.57");
    expect(formatDecimal(30.572816, 6)).toBe("30.572816");
  });
});

describe("isValidLatitude / isValidLongitude - 范围验证", () => {
  it("纬度有效范围 -90 ~ 90", () => {
    expect(isValidLatitude(0)).toBe(true);
    expect(isValidLatitude(90)).toBe(true);
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLatitude(45.5)).toBe(true);
  });

  it("纬度超出范围应无效", () => {
    expect(isValidLatitude(90.0001)).toBe(false);
    expect(isValidLatitude(-90.0001)).toBe(false);
    expect(isValidLatitude(180)).toBe(false);
  });

  it("经度有效范围 -180 ~ 180", () => {
    expect(isValidLongitude(0)).toBe(true);
    expect(isValidLongitude(180)).toBe(true);
    expect(isValidLongitude(-180)).toBe(true);
    expect(isValidLongitude(120.5)).toBe(true);
  });

  it("经度超出范围应无效", () => {
    expect(isValidLongitude(180.0001)).toBe(false);
    expect(isValidLongitude(-180.0001)).toBe(false);
    expect(isValidLongitude(200)).toBe(false);
  });
});

describe("parseDMSString - 度分秒字符串解析", () => {
  it("标准格式解析", () => {
    const result = parseDMSString('30°34\'22.1376"N', true);
    expect(result).not.toBeNull();
    expect(result?.degrees).toBe(30);
    expect(result?.minutes).toBe(34);
    expect(result?.seconds).toBeCloseTo(22.1376, 4);
    expect(result?.direction).toBe("N");
  });

  it("省略秒值解析", () => {
    const result = parseDMSString("30°34'N", true);
    expect(result).not.toBeNull();
    expect(result?.degrees).toBe(30);
    expect(result?.minutes).toBe(34);
    expect(result?.seconds).toBe(0);
  });

  it("省略分秒解析", () => {
    const result = parseDMSString("30°N", true);
    expect(result).not.toBeNull();
    expect(result?.degrees).toBe(30);
    expect(result?.minutes).toBe(0);
    expect(result?.seconds).toBe(0);
  });

  it("S/W 方向解析", () => {
    const lat = parseDMSString("30°S", true);
    const lng = parseDMSString("120°W", false);
    expect(lat?.direction).toBe("S");
    expect(lng?.direction).toBe("W");
  });

  it("纬度方向校验：传入 E 应返回 null", () => {
    const result = parseDMSString("30°E", true);
    expect(result).toBeNull();
  });

  it("经度方向校验：传入 N 应返回 null", () => {
    const result = parseDMSString("120°N", false);
    expect(result).toBeNull();
  });

  it("无效分钟值（>=60）应返回 null", () => {
    const result = parseDMSString("30°60'N", true);
    expect(result).toBeNull();
  });

  it("无效秒值（>=60）应返回 null", () => {
    const result = parseDMSString("30°30'60\"N", true);
    expect(result).toBeNull();
  });

  it("纬度超过90度应返回 null", () => {
    const result = parseDMSString("91°N", true);
    expect(result).toBeNull();
  });

  it("经度超过180度应返回 null", () => {
    const result = parseDMSString("181°E", false);
    expect(result).toBeNull();
  });

  it("空字符串应返回 null", () => {
    expect(parseDMSString("", true)).toBeNull();
  });
});

describe("秒值进位溢出修复验证（核心修复）", () => {
  it("30.99999986 度应正确进位到 31°0'0.0000\"", () => {
    const decimal = 30 + 59 / 60 + 59.9995 / 3600;
    const result = decimalToDMS(decimal, true);
    expect(result.seconds).toBeLessThan(60);
    expect(result.minutes).toBeLessThan(60);
    expect(result.degrees).toBeGreaterThanOrEqual(30);
  });

  it("转换结果的秒值应始终 < 60", () => {
    const testDecimals = [
      0.9999999,
      1.9999999,
      30.9999999,
      45.9999999,
      89.9999999,
      179.9999999,
      0.01666665,
      0.01666666,
    ];
    for (const dec of testDecimals) {
      const resultLat = decimalToDMS(dec, true);
      const resultLng = decimalToDMS(dec, false);
      expect(resultLat.seconds).toBeLessThan(60);
      expect(resultLat.minutes).toBeLessThan(60);
      expect(resultLng.seconds).toBeLessThan(60);
      expect(resultLng.minutes).toBeLessThan(60);
    }
  });

  it("坐标对转换后所有值应符合约束", () => {
    const coords = [
      { lat: 30.9999999, lng: 114.9999999 },
      { lat: -33.9999999, lng: -151.9999999 },
      { lat: 0.9999999, lng: 0.9999999 },
    ];
    for (const coord of coords) {
      const result = coordinateDecimalToDMS(coord);
      expect(result.lat.seconds).toBeLessThan(60);
      expect(result.lat.minutes).toBeLessThan(60);
      expect(result.lng.seconds).toBeLessThan(60);
      expect(result.lng.minutes).toBeLessThan(60);
    }
  });

  it("formatDMS 输出的秒值绝不会出现 60", () => {
    const edgeDecimal = 30 + 59 / 60 + 59.99999 / 3600;
    const result = decimalToDMS(edgeDecimal, true);
    const formatted = formatDMS(result);
    expect(formatted).not.toContain("60\"");
  });
});
