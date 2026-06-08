import type { SpeciesRecord, SurveyTemplate, TemplateSpecies } from "@/types";

export function mergeTemplateSpecies(
  currentSpecies: SpeciesRecord[],
  templateSpecies: TemplateSpecies[]
): SpeciesRecord[] {
  const existingIds = new Set(currentSpecies.map((s) => s.speciesId));
  const newSpeciesFromTemplate: SpeciesRecord[] = templateSpecies
    .filter((ts) => !existingIds.has(ts.speciesId))
    .map((ts) => ({
      speciesId: ts.speciesId,
      scientificName: ts.scientificName,
      commonName: ts.commonName,
      count: 0,
      coverage: 0,
      kingdom: ts.kingdom,
      phylum: ts.phylum,
      className: ts.className,
      order: ts.order,
      family: ts.family,
      genus: ts.genus,
      photoIds: [],
    }));
  return [...currentSpecies, ...newSpeciesFromTemplate];
}

export function speciesToTemplateSpecies(
  species: SpeciesRecord[]
): TemplateSpecies[] {
  return species.map((s) => ({
    speciesId: s.speciesId,
    scientificName: s.scientificName,
    commonName: s.commonName,
    kingdom: s.kingdom,
    phylum: s.phylum,
    className: s.className,
    order: s.order,
    family: s.family,
    genus: s.genus,
  }));
}
