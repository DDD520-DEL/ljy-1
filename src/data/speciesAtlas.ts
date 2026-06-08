import type { SpeciesAtlasItem } from "@/types";
import { speciesCatalog } from "./speciesCatalog";

const PHYLUM_COLORS: Record<string, string> = {
  Mollusca: "#3b82f6",
  Arthropoda: "#ef4444",
  Annelida: "#f59e0b",
  Echinodermata: "#a855f7",
  Cnidaria: "#ec4899",
  Hemichordata: "#14b8a6",
  Ochrophyta: "#22c55e",
  Rhodophyta: "#dc2626",
  Chlorophyta: "#10b981",
  Tracheophyta: "#84cc16",
};

function getPhylumColor(phylum: string) {
  return PHYLUM_COLORS[phylum] || "#64748b";
}

function makePlaceholder(prompt: string, size = "square_hd") {
  const encoded = encodeURIComponent(prompt);
  return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encoded}&image_size=${size}`;
}

function buildAtlasItem(item: (typeof speciesCatalog)[number]): SpeciesAtlasItem {
  const thumbnailPrompt = `${item.scientificName} ${item.commonName} ${item.phylum} marine organism, realistic biological illustration, underwater photography style, coastal tide pool species, high quality naturalist illustration`;

  const descMap: Record<string, { description: string; habitat: string }> = {
    Mollusca: {
      description: `软体动物，具有外壳或内壳，身体柔软分为头、足、内脏团三部分。${item.commonName}是${item.family}科典型代表物种。`,
      habitat: `常见于岩礁潮间带至潮下带，多附着于岩石表面或藏匿于岩缝间。适应潮间带温度、盐度变化。`,
    },
    Arthropoda: {
      description: `节肢动物，身体分节，具有外骨骼和分节的附肢。${item.commonName}是${item.family}科代表物种。`,
      habitat: `广泛分布于潮间带岩礁、泥沙质海底，部分种类营附着生活或底栖生活。`,
    },
    Annelida: {
      description: `环节动物，身体由许多相似的体节构成。${item.commonName}是${item.family}科代表物种。`,
      habitat: `多栖息于潮间带泥沙滩涂、岩礁缝隙或管栖生活。`,
    },
    Echinodermata: {
      description: `棘皮动物，具有独特的水管系统和棘刺。${item.commonName}是${item.className}纲代表物种。`,
      habitat: `栖息于潮间带至潮下带岩礁、沙质或泥质海底。`,
    },
    Cnidaria: {
      description: `刺胞动物，具有刺细胞用于捕食和防御。${item.commonName}是${item.family}科代表物种。`,
      habitat: `附着于潮间带岩礁、海藻或其他硬物表面，部分营固着生活。`,
    },
    Hemichordata: {
      description: `半索动物，具有口索和咽鳃裂。${item.commonName}是${item.family}科代表物种。`,
      habitat: `栖息于潮间带泥沙滩涂，营穴居生活。`,
    },
    Ochrophyta: {
      description: `褐藻，藻体褐色，含褐藻素。${item.commonName}是${item.family}科代表物种。`,
      habitat: `生长于潮间带岩礁上，是潮间带重要的大型海藻。`,
    },
    Rhodophyta: {
      description: `红藻，藻体多呈红色或紫红色。${item.commonName}是${item.family}科代表物种。`,
      habitat: `生长于潮间带岩礁或低潮带附近，适应较低潮线附近。`,
    },
    Chlorophyta: {
      description: `绿藻，藻体呈绿色。${item.commonName}是${item.family}科代表物种。`,
      habitat: `生长于潮间带岩礁、石沼或中潮带。`,
    },
    Tracheophyta: {
      description: `维管植物，具有维管组织。${item.commonName}是${item.family}科代表物种。`,
      habitat: `生长于潮上带至潮间带盐碱湿地，耐盐碱能力强。`,
    },
  };

  const baseInfo =
    descMap[item.phylum] || {
      description: `${item.commonName}是${item.family}科${item.genus}属的典型物种。`,
      habitat: `分布于潮间带生境。`,
    };

  const idKeys = [
    `分类地位：${item.kingdom}界 ${item.phylum}门 ${item.className}纲 ${item.order && item.order !== "null" ? item.order + "目" : ""} ${item.family}科 ${item.genus}属`,
    `学名 ${item.scientificName}`,
    `科属特征：${item.family}科 ${item.genus}属`,
    "外形特征具有典型的该科属特征",
  ];

  const morphology = [
    { label: "体型", value: item.phylum === "Mollusca" ? "具贝壳" : item.phylum === "Arthropoda" ? "分节" : "多样化" },
    { label: "体色", value: "视物种而定" },
    { label: "大小", value: "成体大小因种而异" },
    { label: "外壳/外骨骼", value: item.phylum === "Mollusca" ? "有钙质贝壳" : item.phylum === "Arthropoda" ? "有几丁质外骨骼" : "无" },
    { label: "运动方式", value: item.phylum === "Mollusca" ? "肉足" : item.phylum === "Arthropoda" ? "附肢" : "多样" },
    { label: "典型成体体长", value: "2-15", unit: "cm" },
  ];

  return {
    id: item.id,
    scientificName: item.scientificName,
    commonName: item.commonName,
    kingdom: item.kingdom,
    phylum: item.phylum,
    className: item.className,
    order: item.order && item.order !== "null" ? item.order : "",
    family: item.family,
    genus: item.genus,
    thumbnailUrl: makePlaceholder(thumbnailPrompt),
    images: [
      makePlaceholder(thumbnailPrompt + ", dorsal view"),
      makePlaceholder(thumbnailPrompt + ", ventral view"),
      makePlaceholder(thumbnailPrompt + ", habitat"),
    ],
    description: `${item.commonName}（${item.scientificName}）${baseInfo.description}`,
    habitat: baseInfo.habitat,
    identificationKeys: idKeys,
    morphology,
    conservationStatus: "未评估",
    edibility: item.kingdom === "Plantae" ? "部分可食用" : "部分可食用",
    distribution: "中国沿海均有分布",
    seasonality: "全年可见",
  };
}

export const speciesAtlas: SpeciesAtlasItem[] = speciesCatalog.map(buildAtlasItem);

export { makePlaceholder, getPhylumColor, PHYLUM_COLORS };
