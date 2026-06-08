import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  validateSyncPackage,
  detectConflicts,
  encodeSyncPackageForQR,
  decodeSyncPackageFromQR,
  simpleHash,
} from "../src/lib/sync";
import { useSurveyStore } from "../src/store/surveyStore";
import type {
  SyncPackage,
  SurveyRecord,
  SpeciesRecord,
  SurveySyncData,
} from "../src/types";

vi.mock("../src/lib/photoStore", () => ({
  getAllPhotos: vi.fn().mockResolvedValue([]),
  getPhoto: vi.fn().mockResolvedValue(undefined),
  savePhoto: vi.fn().mockResolvedValue({
    id: "photo-1",
    createdAt: Date.now(),
  }),
}));

function makeSpecies(overrides: Partial<SpeciesRecord> = {}): SpeciesRecord {
  return {
    speciesId: "sp-001",
    scientificName: "Cellana toreuma",
    commonName: "嫁䗩",
    count: 10,
    coverage: 25,
    ...overrides,
  };
}

function makeSurvey(overrides: Partial<SurveyRecord> = {}): SurveyRecord {
  return {
    id: "survey-001",
    date: "2024-06-01",
    stationName: "青岛栈桥A1",
    tideZone: "mid",
    quadratSize: "1×1m",
    substrateType: "rocky",
    location: { lat: 36.05, lng: 120.3 },
    species: [makeSpecies()],
    notes: "测试",
    photoIds: [],
    createdAt: 1717209600000,
    ...overrides,
  };
}

function makeSyncPackage(
  surveys: SurveySyncData[] = [],
  overrides: Partial<SyncPackage> = {}
): SyncPackage {
  const payload = JSON.stringify({ surveys, photos: [] });
  const checksum = simpleHash(payload);
  return {
    version: 1,
    deviceId: "dev-test",
    deviceName: "测试设备",
    exportedAt: Date.now(),
    surveys,
    photos: [],
    checksum,
    ...overrides,
  };
}

describe("simpleHash", () => {
  it("对相同输入产生一致的哈希值", () => {
    const input = JSON.stringify({ a: 1, b: "test" });
    expect(simpleHash(input)).toBe(simpleHash(input));
  });

  it("对不同输入产生不同的哈希值", () => {
    const a = simpleHash('{"a":1}');
    const b = simpleHash('{"a":2}');
    expect(a).not.toBe(b);
  });
});

describe("validateSyncPackage", () => {
  it("接受合法的同步包", () => {
    const pkg = makeSyncPackage([
      { ...makeSurvey(), updatedAt: 1717209600000 },
    ]);
    expect(validateSyncPackage(pkg)).toBe(true);
  });

  it("拒绝缺失必填字段的包", () => {
    const pkg = makeSyncPackage();
    // @ts-expect-error intentionally remove field
    delete (pkg as Partial<SyncPackage>).version;
    expect(validateSyncPackage(pkg)).toBe(false);
  });

  it("拒绝 checksum 不匹配的包", () => {
    const pkg = makeSyncPackage();
    pkg.checksum = "invalid-checksum";
    expect(validateSyncPackage(pkg)).toBe(false);
  });

  it("拒绝类型错误的包", () => {
    expect(validateSyncPackage(null)).toBe(false);
    expect(validateSyncPackage(undefined)).toBe(false);
    expect(validateSyncPackage("string")).toBe(false);
    expect(validateSyncPackage({})).toBe(false);
  });

  it("拒绝 surveys 不是数组的包", () => {
    const pkg = makeSyncPackage();
    // @ts-expect-error intentionally wrong type
    pkg.surveys = "not-array";
    expect(validateSyncPackage(pkg)).toBe(false);
  });
});

describe("encodeSyncPackageForQR / decodeSyncPackageFromQR", () => {
  it("能正确往返编码解码包含中文字符的同步包", () => {
    const original = makeSyncPackage([
      {
        ...makeSurvey({
          stationName: "青岛栈桥站位A1",
          notes: "包含中文备注和特殊字符: @#$%",
        }),
        updatedAt: Date.now(),
      },
    ]);

    const encoded = encodeSyncPackageForQR(original);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decodeSyncPackageFromQR(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.deviceName).toBe(original.deviceName);
    expect(decoded!.surveys[0].stationName).toBe("青岛栈桥站位A1");
    expect(decoded!.surveys[0].notes).toBe("包含中文备注和特殊字符: @#$%");
  });

  it("解码无效字符串返回 null", () => {
    expect(decodeSyncPackageFromQR("not-valid-base64!!!")).toBeNull();
    expect(decodeSyncPackageFromQR("")).toBeNull();
  });

  it("解码校验和错误的包返回 null", () => {
    const badPkg: SyncPackage = {
      version: 1,
      deviceId: "dev-x",
      deviceName: "X",
      exportedAt: Date.now(),
      surveys: [],
      photos: [],
      checksum: "fake-checksum",
    };
    const json = JSON.stringify(badPkg);
    const bytes = new TextEncoder().encode(json);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) {
      bin += String.fromCharCode(bytes[i]);
    }
    const encoded = btoa(bin);
    expect(decodeSyncPackageFromQR(encoded)).toBeNull();
  });
});

describe("detectConflicts", () => {
  it("相同数据不产生冲突", () => {
    const survey = makeSurvey();
    const local = [survey];
    const remote: SurveySyncData[] = [
      { ...survey, updatedAt: survey.createdAt },
    ];
    const conflicts = detectConflicts(local, remote);
    expect(conflicts).toHaveLength(0);
  });

  it("检测到调查字段变更时产生冲突", () => {
    const local = [makeSurvey()];
    const remote: SurveySyncData[] = [
      {
        ...makeSurvey({ stationName: "Station Modified" }),
        updatedAt: Date.now(),
      },
    ];
    const conflicts = detectConflicts(local, remote);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].type).toBe("survey");
    expect(conflicts[0].id).toBe("survey-001");
    expect(conflicts[0].localVersion).toBeDefined();
    expect(conflicts[0].remoteVersion).toBeDefined();
  });

  it("检测到物种数量变更时产生冲突", () => {
    const local = [makeSurvey()];
    const remote: SurveySyncData[] = [
      {
        ...makeSurvey({
          species: [makeSpecies({ count: 999 })],
        }),
        updatedAt: Date.now(),
      },
    ];
    const conflicts = detectConflicts(local, remote);
    const speciesConflicts = conflicts.filter((c) => c.type === "species");
    expect(speciesConflicts.length).toBeGreaterThan(0);
  });

  it("本地独有记录不产生冲突", () => {
    const local = [makeSurvey({ id: "only-local" })];
    const remote: SurveySyncData[] = [];
    const conflicts = detectConflicts(local, remote);
    expect(conflicts).toHaveLength(0);
  });

  it("远程独有记录不产生冲突", () => {
    const local: SurveyRecord[] = [];
    const remote: SurveySyncData[] = [
      { ...makeSurvey({ id: "only-remote" }), updatedAt: Date.now() },
    ];
    const conflicts = detectConflicts(local, remote);
    expect(conflicts).toHaveLength(0);
  });

  it("正确处理多条记录的混合冲突", () => {
    const local = [
      makeSurvey({ id: "s1", stationName: "不变的站位" }),
      makeSurvey({ id: "s2", notes: "旧备注" }),
    ];
    const remote: SurveySyncData[] = [
      {
        ...makeSurvey({ id: "s1", stationName: "不变的站位" }),
        updatedAt: Date.now(),
      },
      {
        ...makeSurvey({ id: "s2", notes: "新备注" }),
        updatedAt: Date.now(),
      },
    ];
    const conflicts = detectConflicts(local, remote);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].id).toBe("s2");
  });
});

describe("useSurveyStore.importSurvey", () => {
  beforeEach(() => {
    useSurveyStore.getState().clearAll();
  });

  it("能以不可变方式添加新记录并触发重渲染", () => {
    const { importSurvey, surveys } = useSurveyStore.getState();
    expect(surveys).toHaveLength(0);

    const originalArrayRef = useSurveyStore.getState().surveys;
    const newSurvey = makeSurvey({ id: "imported-1" });
    importSurvey(newSurvey);

    const afterImport = useSurveyStore.getState().surveys;
    expect(afterImport).not.toBe(originalArrayRef);
    expect(afterImport).toHaveLength(1);
    expect(afterImport[0].id).toBe("imported-1");
    expect(afterImport[0].stationName).toBe("青岛栈桥A1");
  });

  it("导入已存在 ID 的记录时执行更新而非重复添加", () => {
    const { importSurvey } = useSurveyStore.getState();
    importSurvey(makeSurvey({ id: "dup", stationName: "原始" }));
    importSurvey(makeSurvey({ id: "dup", stationName: "更新后" }));

    const { surveys } = useSurveyStore.getState();
    expect(surveys).toHaveLength(1);
    expect(surveys[0].stationName).toBe("更新后");
  });

  it("保留导入记录的原始 createdAt 时间戳", () => {
    const { importSurvey } = useSurveyStore.getState();
    const fixedTs = 1609459200000;
    importSurvey(makeSurvey({ id: "ts-test", createdAt: fixedTs }));

    const { surveys } = useSurveyStore.getState();
    expect(surveys[0].createdAt).toBe(fixedTs);
  });
});

describe("mergeSyncPackage 集成测试", () => {
  beforeEach(() => {
    useSurveyStore.getState().clearAll();
  });

  it("导入全新记录触发 Zustand 重渲染（数组引用变更）", async () => {
    const { mergeSyncPackage } = await import("../src/lib/sync");

    const beforeArray = useSurveyStore.getState().surveys;
    const pkg = makeSyncPackage([
      {
        ...makeSurvey({ id: "brand-new" }),
        updatedAt: Date.now(),
      },
    ]);

    const result = await mergeSyncPackage(pkg);
    const afterArray = useSurveyStore.getState().surveys;

    expect(result.added).toBe(1);
    expect(afterArray).not.toBe(beforeArray);
    expect(afterArray.some((s) => s.id === "brand-new")).toBe(true);
  });

  it("对无冲突但更新时间更新的记录正确应用", async () => {
    const { importSurvey } = useSurveyStore.getState();
    importSurvey(makeSurvey({ id: "s1", notes: "same", createdAt: 1000 }));

    const { mergeSyncPackage } = await import("../src/lib/sync");
    const localSurvey = makeSurvey({ id: "s1", notes: "same", createdAt: 1000 });
    const pkg = makeSyncPackage([
      {
        ...localSurvey,
        updatedAt: 2000,
      },
    ]);

    const result = await mergeSyncPackage(pkg);
    expect(result.updated).toBe(1);
    expect(result.conflicts).toHaveLength(0);

    const { surveys } = useSurveyStore.getState();
    expect(surveys[0].notes).toBe("same");
  });

  it("存在冲突时返回冲突列表而不自动合并", async () => {
    const { importSurvey } = useSurveyStore.getState();
    importSurvey(makeSurvey({ id: "conflict-1", notes: "本地备注", createdAt: 1000 }));

    const { mergeSyncPackage } = await import("../src/lib/sync");
    const pkg = makeSyncPackage([
      {
        ...makeSurvey({ id: "conflict-1", notes: "远程备注", createdAt: 1000 }),
        updatedAt: 2000,
      },
    ]);

    const result = await mergeSyncPackage(pkg);
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.updated).toBe(0);

    const { surveys } = useSurveyStore.getState();
    expect(surveys[0].notes).toBe("本地备注");
  });

  it("根据用户 resolution 选择远程版本进行合并", async () => {
    const { importSurvey } = useSurveyStore.getState();
    importSurvey(
      makeSurvey({
        id: "resolve-test",
        stationName: "本地站位",
        notes: "本地备注",
        createdAt: 1000,
      })
    );

    const { mergeSyncPackage, detectConflicts } = await import("../src/lib/sync");
    const remoteSurvey: SurveySyncData = {
      ...makeSurvey({
        id: "resolve-test",
        stationName: "远程站位",
        notes: "远程备注",
        createdAt: 1000,
      }),
      updatedAt: 2000,
    };
    const pkg = makeSyncPackage([remoteSurvey]);

    const conflicts = detectConflicts(
      useSurveyStore.getState().surveys,
      pkg.surveys
    );
    const resolutions = conflicts.map((c) => ({
      conflictId: c.id,
      choice: "remote" as const,
    }));

    const result = await mergeSyncPackage(pkg, resolutions);
    expect(result.conflicts).toHaveLength(0);
    expect(result.updated).toBe(1);

    const { surveys } = useSurveyStore.getState();
    expect(surveys[0].stationName).toBe("远程站位");
    expect(surveys[0].notes).toBe("远程备注");
  });
});
