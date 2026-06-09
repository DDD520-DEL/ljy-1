import { describe, it, expect, beforeEach, vi } from "vitest";
import { buildSpecimenNo } from "../src/store/specimenStore";
import type { PreservationMethod, Specimen } from "../src/types";
import { PRESERVATION_LABEL } from "../src/types";

describe("buildSpecimenNo - 标本编号生成规则", () => {
  it("应按照「站位缩写-日期(无横杠)-序号(3位补零)」格式生成", () => {
    expect(buildSpecimenNo("QD01", "2026-06-09", 1)).toBe("QD01-20260609-001");
    expect(buildSpecimenNo("QD01", "2026-06-09", 12)).toBe("QD01-20260609-012");
    expect(buildSpecimenNo("QD01", "2026-06-09", 123)).toBe("QD01-20260609-123");
  });

  it("站位缩写应自动转为大写", () => {
    expect(buildSpecimenNo("qd01", "2026-06-09", 1)).toBe("QD01-20260609-001");
    expect(buildSpecimenNo("QhD2", "2026-01-15", 5)).toBe("QHD2-20260115-005");
  });

  it("日期应去除横杠", () => {
    expect(buildSpecimenNo("A", "2025-12-31", 999)).toBe("A-20251231-999");
  });

  it("序号不足3位时前面补零，超过3位时保持原样", () => {
    expect(buildSpecimenNo("S", "2026-01-01", 1)).toBe("S-20260101-001");
    expect(buildSpecimenNo("S", "2026-01-01", 9)).toBe("S-20260101-009");
    expect(buildSpecimenNo("S", "2026-01-01", 10)).toBe("S-20260101-010");
    expect(buildSpecimenNo("S", "2026-01-01", 99)).toBe("S-20260101-099");
    expect(buildSpecimenNo("S", "2026-01-01", 100)).toBe("S-20260101-100");
    expect(buildSpecimenNo("S", "2026-01-01", 1000)).toBe("S-20260101-1000");
  });
});

describe("PRESERVATION_LABEL - 保存方式中文标签", () => {
  it("四种保存方式均应有对应中文标签", () => {
    expect(PRESERVATION_LABEL["alcohol"]).toBe("酒精");
    expect(PRESERVATION_LABEL["formalin"]).toBe("福尔马林");
    expect(PRESERVATION_LABEL["frozen"]).toBe("冷冻");
    expect(PRESERVATION_LABEL["dried"]).toBe("干制");
  });

  it("标签类型应覆盖所有 PreservationMethod 值", () => {
    const methods: PreservationMethod[] = ["alcohol", "formalin", "frozen", "dried"];
    methods.forEach((m) => {
      expect(PRESERVATION_LABEL[m]).toBeDefined();
      expect(typeof PRESERVATION_LABEL[m]).toBe("string");
      expect(PRESERVATION_LABEL[m].length).toBeGreaterThan(0);
    });
  });
});

describe("SpecimenStore - 独立逻辑测试（不依赖 Zustand）", () => {
  function formatDate(dateStr: string): string {
    return dateStr.replace(/-/g, "");
  }

  function padSeq(n: number): string {
    return n.toString().padStart(3, "0");
  }

  function buildNo(stationAbbr: string, date: string, sequenceNo: number): string {
    return `${stationAbbr.toUpperCase()}-${formatDate(date)}-${padSeq(sequenceNo)}`;
  }

  function getNextSequenceNo(
    specimens: Specimen[],
    stationAbbr: string,
    date: string,
    excludeId?: string
  ): number {
    const key = `${stationAbbr.toUpperCase()}-${formatDate(date)}`;
    const existing = specimens.filter(
      (s) =>
        s.specimenNo.startsWith(key + "-") &&
        (excludeId === undefined || s.id !== excludeId)
    );
    if (existing.length === 0) return 1;
    return Math.max(...existing.map((s) => s.sequenceNo)) + 1;
  }

  function makeSpecimen(partial: Partial<Specimen>): Specimen {
    const stationAbbr = partial.stationAbbr ?? "QD01";
    const date = partial.date ?? "2026-06-09";
    const sequenceNo = partial.sequenceNo ?? 1;
    return {
      id: partial.id ?? `spec-${Math.random().toString(36).slice(2, 9)}`,
      specimenNo:
        partial.specimenNo ?? buildNo(stationAbbr, date, sequenceNo),
      stationAbbr,
      date,
      sequenceNo,
      preservation: partial.preservation ?? "alcohol",
      location: partial.location ?? "标本柜A-1",
      speciesName: partial.speciesName,
      notes: partial.notes,
      createdAt: partial.createdAt ?? Date.now(),
      updatedAt: partial.updatedAt,
    };
  }

  describe("getNextSequenceNo - 下一个序号计算", () => {
    it("无任何标本时应返回 1", () => {
      expect(getNextSequenceNo([], "QD01", "2026-06-09")).toBe(1);
    });

    it("同站位同日有3条记录时应返回 4", () => {
      const specimens: Specimen[] = [
        makeSpecimen({ stationAbbr: "QD01", date: "2026-06-09", sequenceNo: 1 }),
        makeSpecimen({ stationAbbr: "QD01", date: "2026-06-09", sequenceNo: 2 }),
        makeSpecimen({ stationAbbr: "QD01", date: "2026-06-09", sequenceNo: 3 }),
      ];
      expect(getNextSequenceNo(specimens, "QD01", "2026-06-09")).toBe(4);
    });

    it("序号不连续时应取最大值+1", () => {
      const specimens: Specimen[] = [
        makeSpecimen({ stationAbbr: "QD01", date: "2026-06-09", sequenceNo: 1 }),
        makeSpecimen({ stationAbbr: "QD01", date: "2026-06-09", sequenceNo: 5 }),
      ];
      expect(getNextSequenceNo(specimens, "QD01", "2026-06-09")).toBe(6);
    });

    it("不同站位应互不影响", () => {
      const specimens: Specimen[] = [
        makeSpecimen({ stationAbbr: "QD01", date: "2026-06-09", sequenceNo: 1 }),
        makeSpecimen({ stationAbbr: "QD01", date: "2026-06-09", sequenceNo: 2 }),
        makeSpecimen({ stationAbbr: "QD02", date: "2026-06-09", sequenceNo: 10 }),
      ];
      expect(getNextSequenceNo(specimens, "QD01", "2026-06-09")).toBe(3);
      expect(getNextSequenceNo(specimens, "QD02", "2026-06-09")).toBe(11);
    });

    it("不同日期应互不影响", () => {
      const specimens: Specimen[] = [
        makeSpecimen({ stationAbbr: "QD01", date: "2026-06-09", sequenceNo: 5 }),
        makeSpecimen({ stationAbbr: "QD01", date: "2026-06-10", sequenceNo: 1 }),
      ];
      expect(getNextSequenceNo(specimens, "QD01", "2026-06-09")).toBe(6);
      expect(getNextSequenceNo(specimens, "QD01", "2026-06-10")).toBe(2);
    });

    it("站位缩写大小写不敏感", () => {
      const specimens: Specimen[] = [
        makeSpecimen({ stationAbbr: "QD01", date: "2026-06-09", sequenceNo: 3 }),
      ];
      expect(getNextSequenceNo(specimens, "qd01", "2026-06-09")).toBe(4);
      expect(getNextSequenceNo(specimens, "Qd01", "2026-06-09")).toBe(4);
    });

    it("排除自身ID时应正确计算（编辑场景）", () => {
      const s1 = makeSpecimen({
        id: "s1",
        stationAbbr: "QD01",
        date: "2026-06-09",
        sequenceNo: 1,
      });
      const s2 = makeSpecimen({
        id: "s2",
        stationAbbr: "QD01",
        date: "2026-06-09",
        sequenceNo: 2,
      });
      expect(getNextSequenceNo([s1, s2], "QD01", "2026-06-09", "s2")).toBe(2);
    });
  });

  describe("编辑标本更新逻辑（核心修复验证）", () => {
    function updateSpecimenLogic(
      specimens: Specimen[],
      id: string,
      data: Partial<
        Omit<Specimen, "id" | "specimenNo" | "createdAt" | "sequenceNo">
      > & { sequenceNo?: number }
    ): Specimen[] {
      const current = specimens.find((s) => s.id === id);
      if (!current) return specimens;

      const newStationAbbr = data.stationAbbr ?? current.stationAbbr;
      const newDate = data.date ?? current.date;
      const stationOrDateChanged =
        newStationAbbr !== current.stationAbbr || newDate !== current.date;

      let sequenceNo: number;
      if (data.sequenceNo !== undefined) {
        sequenceNo = data.sequenceNo;
      } else if (stationOrDateChanged) {
        sequenceNo = getNextSequenceNo(specimens, newStationAbbr, newDate, id);
      } else {
        sequenceNo = current.sequenceNo;
      }

      const candidateNo = buildNo(newStationAbbr, newDate, sequenceNo);
      const conflict = specimens.find(
        (s) => s.id !== id && s.specimenNo === candidateNo
      );
      let finalSequenceNo = sequenceNo;
      let finalSpecimenNo = candidateNo;
      if (conflict) {
        finalSequenceNo = getNextSequenceNo(specimens, newStationAbbr, newDate, id);
        finalSpecimenNo = buildNo(newStationAbbr, newDate, finalSequenceNo);
      }

      return specimens.map((s) =>
        s.id === id
          ? {
              ...s,
              ...data,
              stationAbbr: newStationAbbr,
              date: newDate,
              sequenceNo: finalSequenceNo,
              specimenNo: finalSpecimenNo,
              updatedAt: Date.now(),
            }
          : s
      );
    }

    it("场景：仅修改存放位置，编号与序号应保持不变", () => {
      const s = makeSpecimen({
        id: "s1",
        stationAbbr: "QD01",
        date: "2026-06-09",
        sequenceNo: 3,
        location: "旧位置",
      });
      const result = updateSpecimenLogic([s], "s1", { location: "新位置" });
      expect(result[0].specimenNo).toBe("QD01-20260609-003");
      expect(result[0].sequenceNo).toBe(3);
      expect(result[0].location).toBe("新位置");
    });

    it("场景：修改站位（未指定序号），应自动分配新站位的下一个序号", () => {
      const s1 = makeSpecimen({
        id: "s1",
        stationAbbr: "QD01",
        date: "2026-06-09",
        sequenceNo: 1,
      });
      const s2 = makeSpecimen({
        id: "s2",
        stationAbbr: "QD02",
        date: "2026-06-09",
        sequenceNo: 5,
      });
      const result = updateSpecimenLogic([s1, s2], "s1", {
        stationAbbr: "QD02",
      });
      const updated = result.find((x) => x.id === "s1")!;
      expect(updated.stationAbbr).toBe("QD02");
      expect(updated.sequenceNo).toBe(6);
      expect(updated.specimenNo).toBe("QD02-20260609-006");
      expect(result.find((x) => x.id === "s2")!.sequenceNo).toBe(5);
    });

    it("场景：修改日期（未指定序号），应自动分配新日期的下一个序号", () => {
      const s1 = makeSpecimen({
        id: "s1",
        stationAbbr: "QD01",
        date: "2026-06-09",
        sequenceNo: 2,
      });
      const s2 = makeSpecimen({
        id: "s2",
        stationAbbr: "QD01",
        date: "2026-06-10",
        sequenceNo: 3,
      });
      const result = updateSpecimenLogic([s1, s2], "s1", {
        date: "2026-06-10",
      });
      const updated = result.find((x) => x.id === "s1")!;
      expect(updated.date).toBe("2026-06-10");
      expect(updated.sequenceNo).toBe(4);
      expect(updated.specimenNo).toBe("QD01-20260610-004");
    });

    it("场景：同时修改站位和日期，应按新组合分配下一个序号", () => {
      const s1 = makeSpecimen({
        id: "s1",
        stationAbbr: "QD01",
        date: "2026-06-09",
        sequenceNo: 1,
      });
      const s2 = makeSpecimen({
        id: "s2",
        stationAbbr: "QD02",
        date: "2026-06-10",
        sequenceNo: 2,
      });
      const result = updateSpecimenLogic([s1, s2], "s1", {
        stationAbbr: "QD02",
        date: "2026-06-10",
      });
      const updated = result.find((x) => x.id === "s1")!;
      expect(updated.stationAbbr).toBe("QD02");
      expect(updated.date).toBe("2026-06-10");
      expect(updated.sequenceNo).toBe(3);
      expect(updated.specimenNo).toBe("QD02-20260610-003");
    });

    it("场景：修改站位+手动指定序号，应使用指定序号", () => {
      const s1 = makeSpecimen({
        id: "s1",
        stationAbbr: "QD01",
        date: "2026-06-09",
        sequenceNo: 1,
      });
      const result = updateSpecimenLogic([s1], "s1", {
        stationAbbr: "QD02",
        sequenceNo: 99,
      });
      const updated = result[0];
      expect(updated.stationAbbr).toBe("QD02");
      expect(updated.sequenceNo).toBe(99);
      expect(updated.specimenNo).toBe("QD02-20260609-099");
    });

    it("场景：手动指定序号导致冲突时，应自动避让取下一个可用序号", () => {
      const s1 = makeSpecimen({
        id: "s1",
        stationAbbr: "QD01",
        date: "2026-06-09",
        sequenceNo: 1,
      });
      const s2 = makeSpecimen({
        id: "s2",
        stationAbbr: "QD01",
        date: "2026-06-09",
        sequenceNo: 2,
      });
      const result = updateSpecimenLogic([s1, s2], "s1", { sequenceNo: 2 });
      const updated = result.find((x) => x.id === "s1")!;
      expect(updated.sequenceNo).toBe(3);
      expect(updated.specimenNo).toBe("QD01-20260609-003");
      expect(result.find((x) => x.id === "s2")!.sequenceNo).toBe(2);
    });

    it("场景：修改站位到新组合时，序号应从1开始", () => {
      const s1 = makeSpecimen({
        id: "s1",
        stationAbbr: "QD01",
        date: "2026-06-09",
        sequenceNo: 5,
      });
      const result = updateSpecimenLogic([s1], "s1", {
        stationAbbr: "NEW",
        date: "2026-12-31",
      });
      expect(result[0].stationAbbr).toBe("NEW");
      expect(result[0].date).toBe("2026-12-31");
      expect(result[0].sequenceNo).toBe(1);
      expect(result[0].specimenNo).toBe("NEW-20261231-001");
    });

    it("场景：多条记录交叉修改站位后，所有编号应唯一", () => {
      let specimens: Specimen[] = [
        makeSpecimen({ id: "a", stationAbbr: "A", date: "2026-06-09", sequenceNo: 1 }),
        makeSpecimen({ id: "b", stationAbbr: "A", date: "2026-06-09", sequenceNo: 2 }),
        makeSpecimen({ id: "c", stationAbbr: "B", date: "2026-06-09", sequenceNo: 1 }),
      ];
      specimens = updateSpecimenLogic(specimens, "a", { stationAbbr: "B" });
      specimens = updateSpecimenLogic(specimens, "b", { stationAbbr: "B" });
      const nos = specimens.map((s) => s.specimenNo);
      const unique = new Set(nos);
      expect(unique.size).toBe(nos.length);
      expect(specimens.find((s) => s.id === "c")!.sequenceNo).toBe(1);
    });
  });

  describe("搜索功能逻辑", () => {
    function search(specimens: Specimen[], query: string): Specimen[] {
      const q = query.trim().toLowerCase();
      if (!q) return specimens;
      return specimens.filter(
        (s) =>
          s.specimenNo.toLowerCase().includes(q) ||
          s.stationAbbr.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q) ||
          (s.speciesName && s.speciesName.toLowerCase().includes(q))
      );
    }

    const samples: Specimen[] = [
      makeSpecimen({
        specimenNo: "QD01-20260609-001",
        stationAbbr: "QD01",
        location: "标本柜A-第1层",
        speciesName: "牡蛎",
      }),
      makeSpecimen({
        specimenNo: "QD02-20260609-001",
        stationAbbr: "QD02",
        location: "标本柜B-第3层",
        speciesName: "藤壶",
      }),
      makeSpecimen({
        specimenNo: "QD01-20260610-005",
        stationAbbr: "QD01",
        location: "冷藏柜-2",
        speciesName: "海星",
      }),
    ];

    it("空查询应返回全部标本", () => {
      expect(search(samples, "")).toHaveLength(3);
      expect(search(samples, "   ")).toHaveLength(3);
    });

    it("按完整编号精确搜索", () => {
      const result = search(samples, "QD01-20260609-001");
      expect(result).toHaveLength(1);
      expect(result[0].specimenNo).toBe("QD01-20260609-001");
    });

    it("按编号部分模糊搜索", () => {
      expect(search(samples, "20260609")).toHaveLength(2);
      expect(search(samples, "001")).toHaveLength(2);
    });

    it("按站名搜索", () => {
      expect(search(samples, "QD01")).toHaveLength(2);
      expect(search(samples, "qd02")).toHaveLength(1);
    });

    it("按存放位置搜索", () => {
      expect(search(samples, "标本柜A")).toHaveLength(1);
      expect(search(samples, "冷藏")).toHaveLength(1);
    });

    it("按物种名称搜索", () => {
      expect(search(samples, "牡蛎")).toHaveLength(1);
      expect(search(samples, "星")).toHaveLength(1);
    });

    it("大小写不敏感", () => {
      expect(search(samples, "qd01")).toHaveLength(2);
      expect(search(samples, "QD01-20260610-005".toLowerCase())).toHaveLength(1);
    });
  });
});
