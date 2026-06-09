import type {
  SurveyRecord,
  DiversityIndices,
  TideZone,
  Season,
  SpeciesRecord,
} from "@/types";
import {
  calcDiversityIndices,
  calcBrayCurtisMatrix,
  getSeason,
  SEASON_LABEL,
  TIDE_LABEL,
  SUBSTRATE_LABEL,
  type BrayCurtisResult,
} from "@/lib/diversity";

export interface ReportSummary {
  totalSurveys: number;
  totalStations: number;
  totalSpecies: number;
  totalIndividuals: number;
  dateRange: { start: string; end: string } | null;
  stations: string[];
  seasons: Season[];
  tideZones: TideZone[];
  substrates: string[];
  avgShannonWiener: number;
  avgPielouEvenness: number;
  avgSpeciesCount: number;
}

export interface StationDiversity {
  stationName: string;
  date: string;
  tideZone: TideZone;
  season: Season;
  substrate: string;
  indices: DiversityIndices;
}

export interface DominantSpecies {
  speciesId: string;
  scientificName: string;
  commonName: string;
  totalCount: number;
  totalCoverage: number;
  frequency: number;
  relativeAbundance: number;
}

export interface SpeciesCompositionItem {
  category: string;
  species: { speciesId: string; scientificName: string; commonName: string; count: number }[];
}

export interface ReportData {
  summary: ReportSummary;
  stationDiversities: StationDiversity[];
  brayCurtis: BrayCurtisResult | null;
  dominantSpecies: DominantSpecies[];
  compositionBySeason: SpeciesCompositionItem[];
  compositionByTideZone: SpeciesCompositionItem[];
  rawCsv: string;
  generatedAt: number;
}

export function generateReportData(surveys: SurveyRecord[]): ReportData {
  const sorted = [...surveys].sort((a, b) => a.date.localeCompare(b.date));

  const summary = computeSummary(sorted);
  const stationDiversities = computeStationDiversities(sorted);
  const brayCurtis = sorted.length >= 2 ? calcBrayCurtisMatrix(sorted) : null;
  const dominantSpecies = computeDominantSpecies(sorted);
  const compositionBySeason = computeCompositionBySeason(sorted);
  const compositionByTideZone = computeCompositionByTideZone(sorted);
  const rawCsv = generateRawCsv(sorted);

  return {
    summary,
    stationDiversities,
    brayCurtis,
    dominantSpecies,
    compositionBySeason,
    compositionByTideZone,
    rawCsv,
    generatedAt: Date.now(),
  };
}

function computeSummary(surveys: SurveyRecord[]): ReportSummary {
  if (surveys.length === 0) {
    return {
      totalSurveys: 0,
      totalStations: 0,
      totalSpecies: 0,
      totalIndividuals: 0,
      dateRange: null,
      stations: [],
      seasons: [],
      tideZones: [],
      substrates: [],
      avgShannonWiener: 0,
      avgPielouEvenness: 0,
      avgSpeciesCount: 0,
    };
  }

  const stationSet = new Set(surveys.map((s) => s.stationName));
  const seasonSet = new Set<Season>();
  const tideSet = new Set<TideZone>();
  const substrateSet = new Set<string>();
  const speciesMap = new Map<string, SpeciesRecord>();
  let totalIndividuals = 0;
  let sumShannon = 0;
  let sumPielou = 0;
  let sumSpeciesCount = 0;

  for (const s of surveys) {
    seasonSet.add(getSeason(s.date));
    tideSet.add(s.tideZone);
    substrateSet.add(s.substrateType);
    for (const sp of s.species) {
      if (sp.count > 0 || sp.coverage > 0) {
        if (!speciesMap.has(sp.speciesId)) {
          speciesMap.set(sp.speciesId, sp);
        }
        totalIndividuals += sp.count;
      }
    }
    const idx = calcDiversityIndices(s.species);
    sumShannon += idx.shannonWiener;
    sumPielou += idx.pielouEvenness;
    sumSpeciesCount += idx.speciesCount;
  }

  const n = surveys.length;
  const dates = surveys.map((s) => s.date);

  return {
    totalSurveys: n,
    totalStations: stationSet.size,
    totalSpecies: speciesMap.size,
    totalIndividuals,
    dateRange: { start: dates[0], end: dates[n - 1] },
    stations: Array.from(stationSet),
    seasons: Array.from(seasonSet),
    tideZones: Array.from(tideSet),
    substrates: Array.from(substrateSet),
    avgShannonWiener: Number((sumShannon / n).toFixed(4)),
    avgPielouEvenness: Number((sumPielou / n).toFixed(4)),
    avgSpeciesCount: Number((sumSpeciesCount / n).toFixed(2)),
  };
}

function computeStationDiversities(surveys: SurveyRecord[]): StationDiversity[] {
  return surveys.map((s) => ({
    stationName: s.stationName,
    date: s.date,
    tideZone: s.tideZone,
    season: getSeason(s.date),
    substrate: s.substrateType,
    indices: calcDiversityIndices(s.species),
  }));
}

function computeDominantSpecies(surveys: SurveyRecord[]): DominantSpecies[] {
  const speciesData = new Map<
    string,
    {
      scientificName: string;
      commonName: string;
      totalCount: number;
      totalCoverage: number;
      occurrences: number;
    }
  >();

  let grandTotal = 0;

  for (const s of surveys) {
    for (const sp of s.species) {
      if (sp.count > 0 || sp.coverage > 0) {
        const existing = speciesData.get(sp.speciesId);
        if (existing) {
          existing.totalCount += sp.count;
          existing.totalCoverage = Math.max(existing.totalCoverage, sp.coverage);
          existing.occurrences += 1;
        } else {
          speciesData.set(sp.speciesId, {
            scientificName: sp.scientificName,
            commonName: sp.commonName,
            totalCount: sp.count,
            totalCoverage: sp.coverage,
            occurrences: 1,
          });
        }
        grandTotal += sp.count;
      }
    }
  }

  const result: DominantSpecies[] = [];
  for (const [speciesId, data of speciesData) {
    result.push({
      speciesId,
      scientificName: data.scientificName,
      commonName: data.commonName,
      totalCount: data.totalCount,
      totalCoverage: data.totalCoverage,
      frequency: surveys.length > 0 ? data.occurrences / surveys.length : 0,
      relativeAbundance: grandTotal > 0 ? data.totalCount / grandTotal : 0,
    });
  }

  return result.sort((a, b) => b.totalCount - a.totalCount);
}

function aggregateSpeciesByCategory(
  surveys: SurveyRecord[],
  getCategory: (s: SurveyRecord) => string,
  categoryOrder: string[]
): SpeciesCompositionItem[] {
  const categoryMap = new Map<
    string,
    Map<string, { scientificName: string; commonName: string; count: number }>
  >();

  for (const s of surveys) {
    const cat = getCategory(s);
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, new Map());
    }
    const speciesMap = categoryMap.get(cat)!;

    for (const sp of s.species) {
      if (sp.count > 0) {
        const existing = speciesMap.get(sp.speciesId);
        if (existing) {
          existing.count += sp.count;
        } else {
          speciesMap.set(sp.speciesId, {
            scientificName: sp.scientificName,
            commonName: sp.commonName,
            count: sp.count,
          });
        }
      }
    }
  }

  const result: SpeciesCompositionItem[] = [];
  for (const cat of categoryOrder) {
    const speciesMap = categoryMap.get(cat);
    if (!speciesMap || speciesMap.size === 0) continue;
    const species = Array.from(speciesMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    result.push({ category: cat, species });
  }

  return result;
}

function computeCompositionBySeason(
  surveys: SurveyRecord[]
): SpeciesCompositionItem[] {
  const seasonOrder: Season[] = ["spring", "summer", "autumn", "winter"];
  return aggregateSpeciesByCategory(
    surveys,
    (s) => getSeason(s.date),
    seasonOrder
  );
}

function computeCompositionByTideZone(
  surveys: SurveyRecord[]
): SpeciesCompositionItem[] {
  const tideOrder: TideZone[] = ["high", "mid", "low"];
  return aggregateSpeciesByCategory(
    surveys,
    (s) => s.tideZone,
    tideOrder
  );
}

export function getTopSpeciesForStackedBar(
  composition: SpeciesCompositionItem[],
  topN: number = 8
): {
  categories: string[];
  species: { speciesId: string; scientificName: string; commonName: string }[];
  data: { category: string; [speciesId: string; count: number }[];
} {
  const allSpecies = new Map<
    string,
    { scientificName: string; commonName: string; total: number }
  >();

  for (const item of composition) {
    for (const sp of item.species) {
      const existing = allSpecies.get(sp.speciesId);
      if (existing) {
        existing.total += sp.count;
      } else {
        allSpecies.set(sp.speciesId, {
          scientificName: sp.scientificName,
          commonName: sp.commonName,
          total: sp.count,
        });
      }
    }
  }

  const topSpeciesList = Array.from(allSpecies.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, topN)
    .map(([speciesId, data]) => ({
      speciesId,
      scientificName: data.scientificName,
      commonName: data.commonName,
    }));

  const topSpeciesIds = new Set(topSpeciesList.map((s) => s.speciesId));

  const data: { category: string; [speciesId: string]: number | string }[] = [];

  for (const item of composition) {
    const row: { category: string; [speciesId: string]: number | string } = {
      category: item.category,
    };
    for (const sp of topSpeciesList) {
      const found = item.species.find((s) => s.speciesId === sp.speciesId);
      row[sp.speciesId] = found ? found.count : 0;
    }
    data.push(row);
  }

  return {
    categories: composition.map((c) => c.category),
    species: topSpeciesList,
    data,
  };
}

export function generateRawCsv(surveys: SurveyRecord[]): string {
  const headers = [
    "surveyId",
    "date",
    "stationName",
    "tideZone",
    "season",
    "quadratSize",
    "substrateType",
    "latitude",
    "longitude",
    "speciesId",
    "scientificName",
    "commonName",
    "kingdom",
    "phylum",
    "className",
    "order",
    "family",
    "genus",
    "count",
    "coverage",
    "notes",
  ];

  const rows: string[][] = [];

  for (const s of surveys) {
    const season = SEASON_LABEL[getSeason(s.date)];
    const tide = TIDE_LABEL[s.tideZone];
    const substrate = SUBSTRATE_LABEL[s.substrateType];

    if (s.species.length === 0) {
      rows.push([
        s.id,
        s.date,
        s.stationName,
        tide,
        season,
        s.quadratSize,
        substrate,
        String(s.location.lat.toFixed(6)),
        String(s.location.lng.toFixed(6)),
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        s.notes || "",
      ]);
    } else {
      for (const sp of s.species) {
        if (sp.count === 0 && sp.coverage === 0) continue;
        rows.push([
          s.id,
          s.date,
          s.stationName,
          tide,
          season,
          s.quadratSize,
          substrate,
          String(s.location.lat.toFixed(6)),
          String(s.location.lng.toFixed(6)),
          sp.speciesId,
          sp.scientificName,
          sp.commonName,
          sp.kingdom || "",
          sp.phylum || "",
          sp.className || "",
          sp.order || "",
          sp.family || "",
          sp.genus || "",
          String(sp.count),
          String(sp.coverage),
          s.notes || "",
        ]);
      }
    }
  }

  return (
    headers.join(",") +
    "\n" +
    rows
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n")
  );
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
