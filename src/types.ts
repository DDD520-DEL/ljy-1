export type TideZone = "high" | "mid" | "low";

export type SubstrateType =
  | "rocky"
  | "sandy"
  | "muddy"
  | "pebble"
  | "cobble"
  | "mixed";

export type Season = "spring" | "summer" | "autumn" | "winter";

export interface SpeciesRecord {
  speciesId: string;
  scientificName: string;
  commonName: string;
  count: number;
  coverage: number;
  kingdom?: string;
  phylum?: string;
  className?: string;
  order?: string;
  family?: string;
  genus?: string;
}

export interface SurveyLocation {
  lat: number;
  lng: number;
}

export interface SurveyRecord {
  id: string;
  date: string;
  stationName: string;
  tideZone: TideZone;
  quadratSize: string;
  substrateType: SubstrateType;
  location: SurveyLocation;
  species: SpeciesRecord[];
  notes?: string;
  createdAt: number;
}

export interface TaxonNode {
  id: string;
  name: string;
  rank: "kingdom" | "phylum" | "class" | "order" | "family" | "genus" | "species";
  scientificName: string;
  commonName?: string;
  children?: TaxonNode[];
}

export interface SpeciesCatalogItem {
  id: string;
  scientificName: string;
  commonName: string;
  phylum: string;
  className: string;
  order: string;
  family: string;
  genus: string;
  kingdom: string;
}

export interface DiversityIndices {
  shannonWiener: number;
  pielouEvenness: number;
  margalefRichness: number;
  speciesCount: number;
  totalIndividuals: number;
}
