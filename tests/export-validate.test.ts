import { describe, it, expect } from "vitest";
import { validateSurveyRecord, exportAsDarwinCore } from "../src/components/ExportPanel";
import type { SurveyRecord } from "../src/types";

function makeValidSurvey(): SurveyRecord {
  return {
    id: "test-1",
    date: "2024-06-01",
    stationName: "青岛栈桥A1",
    tideZone: "mid",
    quadratSize: "1×1m",
    substrateType: "rocky",
    location: { lat: 36.05, lng: 120.3 },
    species: [
      {
        speciesId: "sp001",
        scientificName: "Cellana toreuma",
        commonName: "嫁䗩",
        count: 15,
        coverage: 20,
        kingdom: "Animalia",
        phylum: "Mollusca",
        className: "Gastropoda",
        order: "null",
        family: "Nacellidae",
        genus: "Cellana",
      },
    ],
    notes: "测试样方",
    createdAt: Date.now(),
  };
}

describe("JSON 导入字段完整性校验", () => {
  it("完整记录校验通过", () => {
    const result = validateSurveyRecord(makeValidSurvey(), 0);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("拒绝缺少必填字段的记录", () => {
    const bad: any = { ...makeValidSurvey() };
    delete bad.stationName;
    const r = validateSurveyRecord(bad, 0);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("stationName"))).toBe(true);
  });

  it("日期格式必须为 YYYY-MM-DD", () => {
    const bad = { ...makeValidSurvey(), date: "2024/06/01" };
    const r = validateSurveyRecord(bad, 0);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("date"))).toBe(true);
  });

  it("潮位必须是 high/mid/low", () => {
    const bad = { ...makeValidSurvey(), tideZone: "xx" };
    const r = validateSurveyRecord(bad, 0);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("tideZone"))).toBe(true);
  });

  it("底质类型必须有效", () => {
    const bad = { ...makeValidSurvey(), substrateType: "invalid" };
    const r = validateSurveyRecord(bad, 0);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("substrateType"))).toBe(true);
  });

  it("经纬度必须在有效范围内", () => {
    const bad = { ...makeValidSurvey(), location: { lat: 200, lng: 120 } };
    const r = validateSurveyRecord(bad, 0);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("lat"))).toBe(true);
  });

  it("物种个体数不能为负", () => {
    const bad: any = {
      ...makeValidSurvey(),
      species: [{ ...makeValidSurvey().species[0], count: -1 }],
    };
    const r = validateSurveyRecord(bad, 0);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("count"))).toBe(true);
  });

  it("盖度必须在 0-100", () => {
    const bad: any = {
      ...makeValidSurvey(),
      species: [{ ...makeValidSurvey().species[0], coverage: 150 }],
    };
    const r = validateSurveyRecord(bad, 0);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("coverage"))).toBe(true);
  });

  it("species 必须是数组", () => {
    const bad: any = { ...makeValidSurvey(), species: "not-array" };
    const r = validateSurveyRecord(bad, 0);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("数组"))).toBe(true);
  });

  it("错误消息包含记录索引", () => {
    const r = validateSurveyRecord("not-object", 5);
    expect(r.errors[0]).toContain("第 6 条");
  });
});

describe("Darwin Core 导出", () => {
  it("包含所有分类层级列", () => {
    const csv = exportAsDarwinCore([makeValidSurvey()]);
    const lines = csv.split("\n");
    const headers = lines[0].split(",").map((h) => h.replace(/"/g, ""));
    ["kingdom", "phylum", "class", "order", "family", "genus", "scientificName"].forEach((col) =>
      expect(headers).toContain(col)
    );
  });

  it("填充完整七级分类字段", () => {
    const csv = exportAsDarwinCore([makeValidSurvey()]);
    const lines = csv.split("\n").filter((l) => l.trim().length > 0);
    const headerRow = lines[0].split(",").map((h) => h.replace(/"/g, ""));
    const dataRow = lines[1].split(",").map((c) => c.replace(/"/g, ""));
    const idxOf = (name: string) => headerRow.indexOf(name);
    expect(dataRow[idxOf("kingdom")]).toBe("Animalia");
    expect(dataRow[idxOf("phylum")]).toBe("Mollusca");
    expect(dataRow[idxOf("class")]).toBe("Gastropoda");
    expect(dataRow[idxOf("family")]).toBe("Nacellidae");
    expect(dataRow[idxOf("genus")]).toBe("Cellana");
    expect(dataRow[idxOf("scientificName")]).toBe("Cellana toreuma");
  });

  it("空 count 且空 coverage 的物种被跳过", () => {
    const s = makeValidSurvey();
    s.species[0].count = 0;
    s.species[0].coverage = 0;
    const csv = exportAsDarwinCore([s]);
    const lines = csv.split("\n").filter((l) => l.trim().length > 0);
    expect(lines.length).toBe(1);
  });

  it("每条有效物种生成一行 DwC Occurrence", () => {
    const s = makeValidSurvey();
    s.species.push({
      ...s.species[0],
      speciesId: "sp002",
      count: 5,
      coverage: 5,
    });
    const csv = exportAsDarwinCore([s]);
    expect(csv.split("\n").length).toBe(3);
  });
});
