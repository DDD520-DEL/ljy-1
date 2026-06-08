import { describe, it, expect } from "vitest";
import { mergeTemplateSpecies, speciesToTemplateSpecies } from "../src/lib/template";
import type { SpeciesRecord, TemplateSpecies } from "../src/types";

function makeSpeciesRecord(
  id: string,
  count: number,
  coverage: number
): SpeciesRecord {
  return {
    speciesId: id,
    scientificName: `Scientific ${id}`,
    commonName: `种${id}`,
    count,
    coverage,
    kingdom: "Animalia",
    phylum: "Mollusca",
    className: "Gastropoda",
    order: "",
    family: "Family",
    genus: "Genus",
    photoIds: [],
  };
}

function makeTemplateSpecies(id: string): TemplateSpecies {
  return {
    speciesId: id,
    scientificName: `Scientific ${id}`,
    commonName: `种${id}`,
    kingdom: "Animalia",
    phylum: "Mollusca",
    className: "Gastropoda",
    order: "",
    family: "Family",
    genus: "Genus",
  };
}

describe("mergeTemplateSpecies - 模板物种合并逻辑", () => {
  it("场景1：当前调查为空，加载模板应返回模板中的所有物种（count=0, coverage=0）", () => {
    const current: SpeciesRecord[] = [];
    const template = [makeTemplateSpecies("sp1"), makeTemplateSpecies("sp2")];
    const result = mergeTemplateSpecies(current, template);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.speciesId)).toEqual(["sp1", "sp2"]);
    result.forEach((s) => {
      expect(s.count).toBe(0);
      expect(s.coverage).toBe(0);
    });
  });

  it("场景2：所有模板物种已存在于调查中 - 应保留已有物种的个体数和盖度，不替换", () => {
    const current = [
      makeSpeciesRecord("sp1", 15, 30),
      makeSpeciesRecord("sp2", 8, 20),
    ];
    const template = [makeTemplateSpecies("sp1"), makeTemplateSpecies("sp2")];
    const result = mergeTemplateSpecies(current, template);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.speciesId)).toEqual(["sp1", "sp2"]);
    const sp1 = result.find((s) => s.speciesId === "sp1")!;
    const sp2 = result.find((s) => s.speciesId === "sp2")!;
    expect(sp1.count).toBe(15);
    expect(sp1.coverage).toBe(30);
    expect(sp2.count).toBe(8);
    expect(sp2.coverage).toBe(20);
  });

  it("场景3：部分模板物种已存在 - 保留已有物种数据，追加新物种", () => {
    const current = [makeSpeciesRecord("sp1", 10, 25)];
    const template = [
      makeTemplateSpecies("sp1"),
      makeTemplateSpecies("sp2"),
      makeTemplateSpecies("sp3"),
    ];
    const result = mergeTemplateSpecies(current, template);
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.speciesId)).toEqual(["sp1", "sp2", "sp3"]);
    const sp1 = result.find((s) => s.speciesId === "sp1")!;
    const sp2 = result.find((s) => s.speciesId === "sp2")!;
    const sp3 = result.find((s) => s.speciesId === "sp3")!;
    expect(sp1.count).toBe(10);
    expect(sp1.coverage).toBe(25);
    expect(sp2.count).toBe(0);
    expect(sp2.coverage).toBe(0);
    expect(sp3.count).toBe(0);
    expect(sp3.coverage).toBe(0);
  });

  it("场景4：当前调查中有模板不包含的独有物种 - 独有物种必须完整保留", () => {
    const current = [
      makeSpeciesRecord("sp1", 5, 10),
      makeSpeciesRecord("sp_unique", 20, 40),
    ];
    const template = [makeTemplateSpecies("sp1"), makeTemplateSpecies("sp2")];
    const result = mergeTemplateSpecies(current, template);
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.speciesId)).toEqual([
      "sp1",
      "sp_unique",
      "sp2",
    ]);
    const unique = result.find((s) => s.speciesId === "sp_unique")!;
    expect(unique.count).toBe(20);
    expect(unique.coverage).toBe(40);
    const sp1 = result.find((s) => s.speciesId === "sp1")!;
    expect(sp1.count).toBe(5);
    expect(sp1.coverage).toBe(10);
  });

  it("场景5：所有模板物种已存在 + 调查有独有物种 - 保留全部物种及各自数据", () => {
    const current = [
      makeSpeciesRecord("sp1", 3, 15),
      makeSpeciesRecord("sp2", 7, 25),
      makeSpeciesRecord("extra", 12, 50),
    ];
    const template = [
      makeTemplateSpecies("sp1"),
      makeTemplateSpecies("sp2"),
    ];
    const result = mergeTemplateSpecies(current, template);
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.speciesId)).toEqual(["sp1", "sp2", "extra"]);
    expect(result.find((s) => s.speciesId === "sp1")!.count).toBe(3);
    expect(result.find((s) => s.speciesId === "sp1")!.coverage).toBe(15);
    expect(result.find((s) => s.speciesId === "sp2")!.count).toBe(7);
    expect(result.find((s) => s.speciesId === "sp2")!.coverage).toBe(25);
    expect(result.find((s) => s.speciesId === "extra")!.count).toBe(12);
    expect(result.find((s) => s.speciesId === "extra")!.coverage).toBe(50);
  });

  it("场景6：模板为空，不应改变当前调查物种", () => {
    const current = [makeSpeciesRecord("sp1", 5, 10)];
    const template: TemplateSpecies[] = [];
    const result = mergeTemplateSpecies(current, template);
    expect(result).toHaveLength(1);
    expect(result[0].speciesId).toBe("sp1");
    expect(result[0].count).toBe(5);
    expect(result[0].coverage).toBe(10);
  });

  it("场景7：新物种的 photoIds 初始化为空数组", () => {
    const current: SpeciesRecord[] = [];
    const template = [makeTemplateSpecies("sp1")];
    const result = mergeTemplateSpecies(current, template);
    expect(result[0].photoIds).toEqual([]);
  });

  it("场景8：已有物种的 photoIds 不应被清空", () => {
    const current: SpeciesRecord[] = [
      {
        ...makeSpeciesRecord("sp1", 5, 10),
        photoIds: ["photo1", "photo2"],
      },
    ];
    const template = [makeTemplateSpecies("sp1")];
    const result = mergeTemplateSpecies(current, template);
    expect(result[0].photoIds).toEqual(["photo1", "photo2"]);
  });
});

describe("speciesToTemplateSpecies - 物种转换为模板物种", () => {
  it("应丢弃 count、coverage 和 photoIds，只保留分类信息", () => {
    const input: SpeciesRecord[] = [
      {
        speciesId: "sp1",
        scientificName: "Scientific sp1",
        commonName: "种sp1",
        count: 100,
        coverage: 50,
        kingdom: "Animalia",
        phylum: "Mollusca",
        className: "Gastropoda",
        order: "",
        family: "Family",
        genus: "Genus",
        photoIds: ["p1", "p2"],
      },
    ];
    const result = speciesToTemplateSpecies(input);
    expect(result).toHaveLength(1);
    expect(result[0].speciesId).toBe("sp1");
    expect(result[0].scientificName).toBe("Scientific sp1");
    expect(result[0].commonName).toBe("种sp1");
    expect(result[0].kingdom).toBe("Animalia");
    expect(result[0].phylum).toBe("Mollusca");
    expect(result[0].className).toBe("Gastropoda");
    expect(result[0].family).toBe("Family");
    expect(result[0].genus).toBe("Genus");
    expect((result[0] as any).count).toBeUndefined();
    expect((result[0] as any).coverage).toBeUndefined();
    expect((result[0] as any).photoIds).toBeUndefined();
  });

  it("空数组应返回空数组", () => {
    expect(speciesToTemplateSpecies([])).toEqual([]);
  });
});
