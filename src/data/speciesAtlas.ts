import type { MorphologyTrait, SpeciesAtlasItem } from "@/types";
import { speciesCatalog } from "./speciesCatalog";

export const PHYLUM_COLORS: Record<string, string> = {
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

const PHYLUM_NAMES_CN: Record<string, string> = {
  Mollusca: "软体动物门",
  Arthropoda: "节肢动物门",
  Annelida: "环节动物门",
  Echinodermata: "棘皮动物门",
  Cnidaria: "刺胞动物门",
  Hemichordata: "半索动物门",
  Ochrophyta: "褐藻门",
  Rhodophyta: "红藻门",
  Chlorophyta: "绿藻门",
  Tracheophyta: "维管植物门",
};

export function getPhylumColor(phylum: string) {
  return PHYLUM_COLORS[phylum] || "#64748b";
}

export function getPhylumNameCn(phylum: string) {
  return PHYLUM_NAMES_CN[phylum] || phylum;
}

function svgToDataUri(svg: string) {
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

export function makePlaceholderSvg(
  phylum: string,
  label: string,
  scientificName?: string,
  width = 400,
  height = 400
) {
  const color = getPhylumColor(phylum);
  const phylumCn = getPhylumNameCn(phylum);
  const r = Math.round(parseInt(color.slice(1, 3), 16));
  const g = Math.round(parseInt(color.slice(3, 5), 16));
  const b = Math.round(parseInt(color.slice(5, 7), 16));

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgb(${r},${g},${b});stop-opacity:0.35" />
      <stop offset="100%" style="stop-color:rgb(${r},${g},${b});stop-opacity:0.15" />
    </linearGradient>
    <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.08)" />
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="#082f49" />
  <rect width="${width}" height="${height}" fill="url(#bg)" />
  <rect width="${width}" height="${height}" fill="url(#dots)" />
  <rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="24" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2" />
  <text x="${width / 2}" y="${height / 2 - 10}" fill="rgba(255,255,255,0.92)" font-family="-apple-system,Segoe UI,sans-serif" font-size="${Math.min(64, width / 7)}" font-weight="700" text-anchor="middle" dominant-baseline="middle">
    ${label.slice(0, 2)}
  </text>
  <text x="${width / 2}" y="${height / 2 + 50}" fill="${color}" font-family="-apple-system,Segoe UI,sans-serif" font-size="${Math.min(22, width / 18)}" font-weight="600" text-anchor="middle" dominant-baseline="middle">
    ${phylumCn}
  </text>
  ${scientificName ? `<text x="${width / 2}" y="${height - 50}" fill="rgba(255,255,255,0.55)" font-family="Georgia,serif" font-size="${Math.min(18, width / 22)}" font-style="italic" text-anchor="middle" dominant-baseline="middle">
    ${scientificName}
  </text>` : ""}
</svg>`;
  return svgToDataUri(svg);
}

export function makePlaceholder(
  prompt: string,
  size: "square_hd" | "square" | "portrait_4_3" | "portrait_16_9" | "landscape_4_3" | "landscape_16_9" = "square_hd",
  fallback?: { phylum: string; label: string; scientificName?: string }
) {
  const encoded = encodeURIComponent(prompt);
  const remote = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encoded}&image_size=${size}`;
  if (fallback) {
    const dims: Record<string, [number, number]> = {
      square_hd: [400, 400],
      square: [300, 300],
      portrait_4_3: [300, 400],
      portrait_16_9: [360, 640],
      landscape_4_3: [400, 300],
      landscape_16_9: [640, 360],
    };
    const [w, h] = dims[size] || [400, 400];
    return {
      src: remote,
      fallback: makePlaceholderSvg(fallback.phylum, fallback.label, fallback.scientificName, w, h),
    };
  }
  return remote;
}

const PHYLUM_DESC: Record<string, { description: string; habitat: string }> = {
  Mollusca: {
    description: "软体动物，具有外壳或内壳，身体柔软分为头、足、内脏团三部分。",
    habitat: "常见于岩礁潮间带至潮下带，多附着于岩石表面或藏匿于岩缝间。适应潮间带温度、盐度变化。",
  },
  Arthropoda: {
    description: "节肢动物，身体分节，具有外骨骼和分节的附肢。",
    habitat: "广泛分布于潮间带岩礁、泥沙质海底，部分种类营附着生活或底栖生活。",
  },
  Annelida: {
    description: "环节动物，身体由许多相似的体节构成。",
    habitat: "多栖息于潮间带泥沙滩涂、岩礁缝隙或管栖生活。",
  },
  Echinodermata: {
    description: "棘皮动物，具有独特的水管系统和棘刺。",
    habitat: "栖息于潮间带至潮下带岩礁、沙质或泥质海底。",
  },
  Cnidaria: {
    description: "刺胞动物，具有刺细胞用于捕食和防御。",
    habitat: "附着于潮间带岩礁、海藻或其他硬物表面，部分营固着生活。",
  },
  Hemichordata: {
    description: "半索动物，具有口索和咽鳃裂。",
    habitat: "栖息于潮间带泥沙滩涂，营穴居生活。",
  },
  Ochrophyta: {
    description: "褐藻，藻体褐色，含褐藻素。",
    habitat: "生长于潮间带岩礁上，是潮间带重要的大型海藻。",
  },
  Rhodophyta: {
    description: "红藻，藻体多呈红色或紫红色。",
    habitat: "生长于潮间带岩礁或低潮带附近，适应较低潮线附近。",
  },
  Chlorophyta: {
    description: "绿藻，藻体呈绿色。",
    habitat: "生长于潮间带岩礁、石沼或中潮带。",
  },
  Tracheophyta: {
    description: "维管植物，具有维管组织。",
    habitat: "生长于潮上带至潮间带盐碱湿地，耐盐碱能力强。",
  },
};

const FAMILY_MORPHOLOGY: Record<string, Partial<Record<string, Partial<MorphologyTrait>>>> = {
  Nacellidae: {
    体型: { value: "笠状，扁平卵圆形" },
    体色: { value: "灰褐色至黄褐色，具放射肋" },
    大小: { value: "壳长 3-6" },
    "外壳/外骨骼": { value: "单壳，笠形，无螺层" },
    运动方式: { value: "肥大腹足爬行" },
    典型成体体长: { value: "4-7", unit: "cm" },
  },
  Siphonariidae: {
    体型: { value: "笠状，侧面具呼吸孔" },
    体色: { value: "黑褐色，壳面具放射纹" },
    大小: { value: "壳长 1-3" },
    "外壳/外骨骼": { value: "单壳，假壳缘，右侧有呼吸沟" },
    运动方式: { value: "腹足缓慢爬行" },
    典型成体体长: { value: "1.5-3", unit: "cm" },
  },
  Littorinidae: {
    体型: { value: "圆锥形，螺层分明" },
    体色: { value: "黄褐色至棕褐色，具斑纹" },
    大小: { value: "壳高 1-2.5" },
    "外壳/外骨骼": { value: "螺旋形单壳，壳质厚" },
    运动方式: { value: "腹足爬行，可短期离水" },
    典型成体体长: { value: "1-2.5", unit: "cm" },
  },
  Trochidae: {
    体型: { value: "陀螺形或圆锥形" },
    体色: { value: "墨绿色杂有黑白斑纹，壳口内面珍珠层" },
    大小: { value: "壳高 2-4" },
    "外壳/外骨骼": { value: "螺旋形单壳，壳质厚，齿舌纽舌型" },
    运动方式: { value: "腹足爬行" },
    典型成体体长: { value: "2-4", unit: "cm" },
  },
  Tegulidae: {
    体型: { value: "圆锥形，螺层膨圆" },
    体色: { value: "铁锈色或棕褐色，具螺肋" },
    大小: { value: "壳高 2-3.5" },
    "外壳/外骨骼": { value: "螺旋形单壳，脐孔深" },
    运动方式: { value: "腹足爬行" },
    典型成体体长: { value: "2-4", unit: "cm" },
  },
  Muricidae: {
    体型: { value: "纺锤形或卵圆形，壳面具瘤状突起" },
    体色: { value: "灰褐色或黑褐色，具结节" },
    大小: { value: "壳高 3-8" },
    "外壳/外骨骼": { value: "螺旋形单壳，壳口具水管沟" },
    运动方式: { value: "肉足爬行，肉食性" },
    典型成体体长: { value: "3-8", unit: "cm" },
  },
  Tetraclitidae: {
    体型: { value: "圆锥形或扁平，壳壁由四片组成" },
    体色: { value: "灰绿色或淡灰褐色，壳面具粗肋" },
    大小: { value: "峰吻径 2-5" },
    "外壳/外骨骼": { value: "钙质外壳四块，壳板互相接合" },
    运动方式: { value: "固着生活，蔓足滤食" },
    典型成体体长: { value: "2-5", unit: "cm" },
  },
  Balanidae: {
    体型: { value: "圆锥形，壳壁六片" },
    体色: { value: "灰白色，具纵向白色肋纹" },
    大小: { value: "峰吻径 1-3" },
    "外壳/外骨骼": { value: "钙质外壳六块，壳板有放射肋" },
    运动方式: { value: "固着生活，蔓足滤食" },
    典型成体体长: { value: "1-3", unit: "cm" },
  },
  Chthamalidae: {
    体型: { value: "扁平圆锥形，壳壁六片" },
    体色: { value: "灰褐色，较小" },
    大小: { value: "峰吻径 0.5-1.5" },
    "外壳/外骨骼": { value: "钙质外壳六片，壳板薄" },
    运动方式: { value: "固着生活，蔓足滤食" },
    典型成体体长: { value: "0.5-1.5", unit: "cm" },
  },
  Mytilidae: {
    体型: { value: "楔形或三角形，两壳相等" },
    体色: { value: "紫黑色或翠绿色，具光泽" },
    大小: { value: "壳长 4-10" },
    "外壳/外骨骼": { value: "双壳，壳质厚，足丝附着" },
    运动方式: { value: "足丝附着，偶可开闭移动" },
    典型成体体长: { value: "5-10", unit: "cm" },
  },
  Ostreidae: {
    体型: { value: "不规则卵圆形或三角形，左壳大右壳小" },
    体色: { value: "灰黄色或灰白色，壳面鳞片层" },
    大小: { value: "壳长 5-15" },
    "外壳/外骨骼": { value: "双壳不等，左壳固着，壳质坚厚" },
    运动方式: { value: "终身固着生活，开闭壳滤食" },
    典型成体体长: { value: "6-15", unit: "cm" },
  },
  Veneridae: {
    体型: { value: "卵圆形或三角形，两壳膨胀" },
    体色: { value: "黄褐色杂有斑纹，壳面光滑" },
    大小: { value: "壳长 2-6" },
    "外壳/外骨骼": { value: "双壳相等，壳质坚厚，具光泽" },
    运动方式: { value: "斧足挖穴，缓慢移动" },
    典型成体体长: { value: "2-6", unit: "cm" },
  },
  Arcidae: {
    体型: { value: "斜卵圆形，两壳膨胀具毛" },
    体色: { value: "棕褐色，被绒毛壳皮" },
    大小: { value: "壳长 3-7" },
    "外壳/外骨骼": { value: "双壳，壳面放射肋明显，被绒毛" },
    运动方式: { value: "斧足挖穴，可缓慢移动" },
    典型成体体长: { value: "3-7", unit: "cm" },
  },
  Varunidae: {
    体型: { value: "头胸甲方形或横卵圆形" },
    体色: { value: "青绿褐色或灰青色，螯足指端红色" },
    大小: { value: "头胸甲宽 2-5" },
    "外壳/外骨骼": { value: "几丁质外骨骼，头胸甲光滑" },
    运动方式: { value: "步足横行，善攀爬" },
    典型成体体长: { value: "3-6", unit: "cm" },
  },
  Sesarmidae: {
    体型: { value: "头胸甲方形，额宽" },
    体色: { value: "黑褐色或紫褐色，螯足无齿" },
    大小: { value: "头胸甲宽 2-4" },
    "外壳/外骨骼": { value: "几丁质外骨骼，分区明显" },
    运动方式: { value: "步足横行，可攀爬" },
    典型成体体长: { value: "2-4", unit: "cm" },
  },
  Grapsidae: {
    体型: { value: "头胸甲横方形，侧缘具齿" },
    体色: { value: "紫褐色，额区有四齿" },
    大小: { value: "头胸甲宽 2-4" },
    "外壳/外骨骼": { value: "几丁质外骨骼，表面具粗糙颗粒" },
    运动方式: { value: "步足敏捷横行" },
    典型成体体长: { value: "2-4", unit: "cm" },
  },
  Paguridae: {
    体型: { value: "腹部柔软不对称，寄居螺壳" },
    体色: { value: "红棕色，螯足不等大" },
    大小: { value: "头胸甲长 1-4" },
    "外壳/外骨骼": { value: "头胸甲钙化，腹部柔软无壳" },
    运动方式: { value: "附肢爬行，背负螺壳" },
    典型成体体长: { value: "3-8", unit: "cm" },
  },
  Hippolytidae: {
    体型: { value: "侧扁，额角发达" },
    体色: { value: "透明具红棕色条纹" },
    大小: { value: "体长 3-6" },
    "外壳/外骨骼": { value: "薄几丁质外骨骼，体透明" },
    运动方式: { value: "腹肢划水，尾部弹跳" },
    典型成体体长: { value: "3-6", unit: "cm" },
  },
  Alpheidae: {
    体型: { value: "圆筒形，螯足极不对称" },
    体色: { value: "棕褐色，大螯可发声" },
    大小: { value: "体长 2-5" },
    "外壳/外骨骼": { value: "几丁质外骨骼较厚" },
    运动方式: { value: "腹肢划水，可弹跳" },
    典型成体体长: { value: "2-5", unit: "cm" },
  },
  Squillidae: {
    体型: { value: "长扁，前胸节发达具掠足" },
    体色: { value: "浅黄绿色，腹部具节" },
    大小: { value: "体长 6-18" },
    "外壳/外骨骼": { value: "几丁质外骨骼，头胸甲短小" },
    运动方式: { value: "腹肢划水，尾扇推进" },
    典型成体体长: { value: "8-18", unit: "cm" },
  },
  Gammaridae: {
    体型: { value: "侧扁，弯曲呈虾形" },
    体色: { value: "半透明白色或淡褐色" },
    大小: { value: "体长 0.5-2" },
    "外壳/外骨骼": { value: "薄几丁质外骨骼" },
    运动方式: { value: "腹侧游泳，弹跳" },
    典型成体体长: { value: "0.5-2", unit: "cm" },
  },
  Idoteidae: {
    体型: { value: "长椭圆形，背腹扁平" },
    体色: { value: "暗褐色或绿色" },
    大小: { value: "体长 1-4" },
    "外壳/外骨骼": { value: "几丁质外骨骼较硬" },
    运动方式: { value: "附肢爬行，缓慢游泳" },
    典型成体体长: { value: "1-4", unit: "cm" },
  },
  Capitellidae: {
    体型: { value: "细长蠕虫形，体节明显" },
    体色: { value: "血红色或肉红色" },
    大小: { value: "体长 5-15" },
    "外壳/外骨骼": { value: "无，体壁薄" },
    运动方式: { value: "体节蠕动钻穴" },
    典型成体体长: { value: "5-15", unit: "cm" },
  },
  Nereididae: {
    体型: { value: "长扁，体节多，具疣足" },
    体色: { value: "黄褐色或绿色，具金属光泽" },
    大小: { value: "体长 5-30" },
    "外壳/外骨骼": { value: "无，几丁质颚齿" },
    运动方式: { value: "疣足划动，可游泳" },
    典型成体体长: { value: "10-25", unit: "cm" },
  },
  Arenicolidae: {
    体型: { value: "圆柱形，头部退化" },
    体色: { value: "暗红色或暗绿色" },
    大小: { value: "体长 8-25" },
    "外壳/外骨骼": { value: "无，体壁粗糙" },
    运动方式: { value: "体节伸缩掘沙" },
    典型成体体长: { value: "10-25", unit: "cm" },
  },
  Serpulidae: {
    体型: { value: "管栖，栖管钙质螺旋状" },
    体色: { value: "鳃冠彩色，栖管白或淡黄" },
    大小: { value: "栖管长 2-8" },
    "外壳/外骨骼": { value: "分泌钙质栖管" },
    运动方式: { value: "管栖固着，鳃冠伸出滤食" },
    典型成体体长: { value: "2-6", unit: "cm" },
  },
  Asterinidae: {
    体型: { value: "五角星形，腕短钝" },
    体色: { value: "蓝紫色或橙红色，背面具骨片" },
    大小: { value: "腕长 3-8" },
    "外壳/外骨骼": { value: "钙质骨片组成的内骨骼" },
    运动方式: { value: "管足吸附缓慢移动" },
    典型成体体长: { value: "5-10", unit: "cm" },
  },
  Stichopodidae: {
    体型: { value: "圆筒形，背面具肉刺" },
    体色: { value: "黄褐色或黑褐色，腹面管足密集" },
    大小: { value: "体长 10-40" },
    "外壳/外骨骼": { value: "微小钙质骨片埋于体壁" },
    运动方式: { value: "管足和体壁收缩缓慢移动" },
    典型成体体长: { value: "15-35", unit: "cm" },
  },
  Strongylocentrotidae: {
    体型: { value: "半球形，棘刺密布" },
    体色: { value: "暗绿色或灰褐色，棘短密" },
    大小: { value: "壳径 3-6" },
    "外壳/外骨骼": { value: "钙质骨板组成硬壳，被可动棘刺" },
    运动方式: { value: "管足与棘刺配合移动" },
    典型成体体长: { value: "3-6", unit: "cm" },
  },
  Ophiotrichidae: {
    体型: { value: "中央盘小，腕细长易断" },
    体色: { value: "黄褐色或紫褐色，腕具环纹" },
    大小: { value: "腕长 5-12" },
    "外壳/外骨骼": { value: "钙质骨片覆盖体盘和腕" },
    运动方式: { value: "腕弯曲摆动，移动迅速" },
    典型成体体长: { value: "5-12", unit: "cm" },
  },
  Actiniidae: {
    体型: { value: "圆柱状，口盘周围具触手" },
    体色: { value: "绿色或棕褐色，触手排列整齐" },
    大小: { value: "柱高 2-8" },
    "外壳/外骨骼": { value: "无骨骼，基盘固着" },
    运动方式: { value: "基盘缓慢滑行，触手捕食" },
    典型成体体长: { value: "3-8", unit: "cm" },
  },
  Diadumenidae: {
    体型: { value: "细圆柱形，体壁光滑" },
    体色: { value: "淡黄褐色具橙黄色纵纹" },
    大小: { value: "柱高 1-4" },
    "外壳/外骨骼": { value: "无骨骼，基盘固着" },
    运动方式: { value: "基盘缓慢移动" },
    典型成体体长: { value: "1-4", unit: "cm" },
  },
  Campanulariidae: {
    体型: { value: "树枝状群体，螅茎分节" },
    体色: { value: "透明或淡褐色" },
    大小: { value: "群体高 2-10" },
    "外壳/外骨骼": { value: "几丁质围鞘包被群体" },
    运动方式: { value: "固着生活，水螅体捕食" },
    典型成体体长: { value: "3-8", unit: "cm" },
  },
  Ptychoderidae: {
    体型: { value: "蠕虫形，分吻、领、躯干三部分" },
    体色: { value: "黄白色或淡褐色" },
    大小: { value: "体长 10-40" },
    "外壳/外骨骼": { value: "无，体壁柔软" },
    运动方式: { value: "体壁收缩掘沙穴居" },
    典型成体体长: { value: "15-30", unit: "cm" },
  },
  Sargassaceae: {
    体型: { value: "树枝状，具气囊，固着器盘状" },
    体色: { value: "深褐色或黑褐色" },
    大小: { value: "藻体高 30-200" },
    "外壳/外骨骼": { value: "细胞壁含褐藻酸" },
    运动方式: { value: "固着生活，气囊漂浮" },
    典型成体体长: { value: "50-150", unit: "cm" },
  },
  Alariaceae: {
    体型: { value: "叶片状，具中肋，固着器根状" },
    体色: { value: "黄褐色，有光泽" },
    大小: { value: "藻体长 50-200" },
    "外壳/外骨骼": { value: "细胞壁含褐藻酸" },
    运动方式: { value: "固着生活" },
    典型成体体长: { value: "80-200", unit: "cm" },
  },
  Endocladiaceae: {
    体型: { value: "软骨质，叉状分枝丛生" },
    体色: { value: "紫红色或暗紫色" },
    大小: { value: "藻体高 4-15" },
    "外壳/外骨骼": { value: "细胞壁含琼胶质" },
    运动方式: { value: "固着生活" },
    典型成体体长: { value: "5-12", unit: "cm" },
  },
  Gracilariaceae: {
    体型: { value: "细线状或圆柱状分枝" },
    体色: { value: "紫红色或紫褐色" },
    大小: { value: "藻体长 10-50" },
    "外壳/外骨骼": { value: "细胞壁含丰富琼胶" },
    运动方式: { value: "固着或半漂浮生活" },
    典型成体体长: { value: "15-40", unit: "cm" },
  },
  Bangiaceae: {
    体型: { value: "薄膜状叶状体" },
    体色: { value: "紫红色或棕红色，光滑膜质" },
    大小: { value: "藻体长 10-30" },
    "外壳/外骨骼": { value: "细胞壁含琼胶质" },
    运动方式: { value: "固着生活" },
    典型成体体长: { value: "10-25", unit: "cm" },
  },
  Ulvaceae: {
    体型: { value: "膜质叶状体，片状或管状" },
    体色: { value: "鲜绿色，膜质半透明" },
    大小: { value: "藻体长 5-50" },
    "外壳/外骨骼": { value: "薄纤维素细胞壁" },
    运动方式: { value: "固着或漂浮" },
    典型成体体长: { value: "10-30", unit: "cm" },
  },
  Codiaceae: {
    体型: { value: "海绵质，叉状分枝" },
    体色: { value: "深绿色，表面有刺状突起" },
    大小: { value: "藻体长 10-40" },
    "外壳/外骨骼": { value: "多核体结构，海绵质" },
    运动方式: { value: "固着生活" },
    典型成体体长: { value: "10-30", unit: "cm" },
  },
  Amaranthaceae: {
    体型: { value: "草本，茎直立多分枝，肉质叶" },
    体色: { value: "绿色，秋季变红色" },
    大小: { value: "株高 20-100" },
    "外壳/外骨骼": { value: "植物纤维素细胞壁" },
    运动方式: { value: "固着生活" },
    典型成体体长: { value: "30-80", unit: "cm" },
  },
  Poaceae: {
    体型: { value: "高大草本，茎中空有节" },
    体色: { value: "黄绿色，叶片披针状" },
    大小: { value: "株高 100-300" },
    "外壳/外骨骼": { value: "植物纤维素细胞壁" },
    运动方式: { value: "固着生活" },
    典型成体体长: { value: "150-250", unit: "cm" },
  },
  Rhizophoraceae: {
    体型: { value: "灌木或小乔木，具支柱根" },
    体色: { value: "绿色，树皮灰褐色" },
    大小: { value: "株高 200-600" },
    "外壳/外骨骼": { value: "植物纤维素细胞壁，木栓层" },
    运动方式: { value: "固着生活" },
    典型成体体长: { value: "200-500", unit: "cm" },
  },
  Primulaceae: {
    体型: { value: "灌木，多分枝，叶互生" },
    体色: { value: "深绿色，叶片革质有光泽" },
    大小: { value: "株高 50-300" },
    "外壳/外骨骼": { value: "植物纤维素细胞壁，革质叶" },
    运动方式: { value: "固着生活" },
    典型成体体长: { value: "100-200", unit: "cm" },
  },
};

const MORPHOLOGY_LABELS = [
  "体型",
  "体色",
  "大小",
  "外壳/外骨骼",
  "运动方式",
  "典型成体体长",
] as const;

function buildMorphology(item: (typeof speciesCatalog)[number]): MorphologyTrait[] {
  const override = FAMILY_MORPHOLOGY[item.family] || {};
  const genusHash = [...item.genus].reduce((a, c) => a + c.charCodeAt(0), 0);
  const speciesHash = [...item.id].reduce((a, c) => a + c.charCodeAt(0), 0);

  const defaultValues: Record<string, MorphologyTrait> = {
    体型: { label: "体型", value: item.kingdom === "Plantae" ? "叶状体/植株" : item.phylum === "Mollusca" ? "具贝壳" : item.phylum === "Arthropoda" ? "身体分节" : "多样化" },
    体色: { label: "体色", value: `${["暗褐色", "黄褐色", "灰褐色", "灰绿色", "棕黄色"][speciesHash % 5]}为主，具斑纹` },
    大小: { label: "大小", value: `成体 ${1 + (genusHash % 10)}-${5 + (genusHash % 20)}` },
    "外壳/外骨骼": { label: "外壳/外骨骼", value: item.phylum === "Mollusca" ? "有钙质贝壳" : item.phylum === "Arthropoda" ? "有几丁质外骨骼" : item.kingdom === "Plantae" ? "纤维素细胞壁" : "无坚硬外壳" },
    运动方式: { label: "运动方式", value: item.kingdom === "Plantae" ? "固着生活" : item.phylum === "Mollusca" ? "肉质腹足爬行" : item.phylum === "Arthropoda" ? "附肢/步足运动" : "缓慢移动" },
    典型成体体长: { label: "典型成体体长", value: `${1 + (speciesHash % 15)}-${5 + (speciesHash % 25)}`, unit: "cm" },
  };

  return MORPHOLOGY_LABELS.map((label) => {
    const ov = override[label];
    const base = defaultValues[label];
    return {
      label,
      value: ov?.value ?? base.value,
      unit: ov?.unit ?? base.unit,
    } as MorphologyTrait;
  });
}

function buildDescriptionAndHabitat(item: (typeof speciesCatalog)[number]) {
  const base =
    PHYLUM_DESC[item.phylum] || {
      description: `${item.commonName}是${item.family}科${item.genus}属的典型物种。`,
      habitat: "分布于潮间带生境。",
    };
  return {
    description: `${item.commonName}（${item.scientificName}）${base.description}${item.commonName}是${item.family}科${item.genus}属的典型代表，在潮间带生态系统中具有重要的生态地位。`,
    habitat: base.habitat,
  };
}

function buildIdentificationKeys(item: (typeof speciesCatalog)[number]): string[] {
  const keys: string[] = [
    `分类地位：${item.kingdom}界 ${item.phylum}门 ${item.className}纲${item.order && item.order !== "null" ? " " + item.order + "目" : ""} ${item.family}科 ${item.genus}属`,
    `学名：${item.scientificName}`,
    `科属特征：隶属于${item.family}科${item.genus}属，具有该科属典型形态特征`,
    `中文名：${item.commonName}`,
  ];
  if (item.order && item.order !== "null") {
    keys.push(`目级分类：${item.order}`);
  }
  return keys;
}

function buildEdibility(item: (typeof speciesCatalog)[number]) {
  if (item.kingdom === "Plantae") {
    if (["Sargassaceae", "Alariaceae", "Bangiaceae", "Gracilariaceae", "Ulvaceae", "Endocladiaceae"].includes(item.family)) {
      return "可食用，经济海藻";
    }
    if (["Amaranthaceae", "Rhizophoraceae", "Primulaceae", "Poaceae"].includes(item.family)) {
      return "部分可食用或药用";
    }
    return "食用性需进一步鉴定";
  }
  if (["Mytilidae", "Ostreidae", "Veneridae", "Arcidae"].includes(item.family)) {
    return "可食用，重要经济贝类";
  }
  if (["Muricidae", "Trochidae", "Tegulidae"].includes(item.family)) {
    return "可食用，小型食用贝类";
  }
  if (["Varunidae", "Sesarmidae", "Grapsidae", "Hippolytidae", "Squillidae"].includes(item.family)) {
    return "可食用，小型甲壳类";
  }
  if (["Stichopodidae"].includes(item.family)) {
    return "名贵食用海参";
  }
  if (["Strongylocentrotidae"].includes(item.family)) {
    return "生殖腺可食用";
  }
  return "食用性需进一步鉴定";
}

function buildDistribution(item: (typeof speciesCatalog)[number]) {
  const distMap: Record<string, string> = {
    Mollusca: "中国南北沿海均有分布，以东海、南海产量较大",
    Arthropoda: "广泛分布于中国沿海，部分种类分布于全球温带海域",
    Annelida: "中国沿海均产，广泛分布于西北太平洋沿岸",
    Echinodermata: "主要分布于中国黄渤海、东海沿岸，部分种类可达南海",
    Cnidaria: "分布于中国沿海，南海种类尤为丰富",
    Hemichordata: "主要分布于中国东海、南海潮间带",
    Ochrophyta: "中国沿海均有生长，为冷水性或温水性褐藻",
    Rhodophyta: "多分布于中国东海、南海，少数分布于黄渤海",
    Chlorophyta: "广布于中国南北沿海，喜高盐环境",
    Tracheophyta: "分布于中国东南沿海红树林区及盐沼湿地",
  };
  return distMap[item.phylum] || "中国沿海均有分布";
}

function buildSeasonality(item: (typeof speciesCatalog)[number]) {
  if (item.kingdom === "Plantae") {
    return item.phylum === "Tracheophyta" ? "多年生，全年可见，夏秋季繁盛" : "全年可见，春夏秋季生长旺盛";
  }
  if (item.phylum === "Mollusca") {
    return "全年可见，春秋季为繁殖旺季";
  }
  if (item.phylum === "Arthropoda") {
    return "全年可见，夏秋季种群密度较高";
  }
  return "全年可见";
}

function buildConservation(item: (typeof speciesCatalog)[number]) {
  if (["Rhizophoraceae", "Primulaceae"].includes(item.family)) return "红树林重点保护植物";
  if (["Stichopodidae"].includes(item.family)) return "需要保护，商业采捕压力大";
  return "未评估，常见物种";
}

function buildAtlasItem(item: (typeof speciesCatalog)[number]): SpeciesAtlasItem {
  const thumbnailPrompt = `${item.scientificName} ${item.commonName} ${item.phylum} marine organism, realistic biological illustration, underwater photography style, coastal tide pool species, high quality naturalist illustration`;

  const fallback = { phylum: item.phylum, label: item.commonName, scientificName: item.scientificName };

  const { description, habitat } = buildDescriptionAndHabitat(item);

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
    thumbnail: makePlaceholder(thumbnailPrompt, "square_hd", fallback) as { src: string; fallback: string },
    images: [
      makePlaceholder(thumbnailPrompt + ", dorsal view", "square_hd", fallback) as { src: string; fallback: string },
      makePlaceholder(thumbnailPrompt + ", ventral view", "square_hd", fallback) as { src: string; fallback: string },
      makePlaceholder(thumbnailPrompt + ", habitat", "landscape_4_3", fallback) as { src: string; fallback: string },
    ],
    description,
    habitat,
    identificationKeys: buildIdentificationKeys(item),
    morphology: buildMorphology(item),
    conservationStatus: buildConservation(item),
    edibility: buildEdibility(item),
    distribution: buildDistribution(item),
    seasonality: buildSeasonality(item),
  };
}

export const speciesAtlas: SpeciesAtlasItem[] = speciesCatalog.map(buildAtlasItem);

export { buildAtlasItem, buildMorphology };
