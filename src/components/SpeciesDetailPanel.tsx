import {
  X,
  Info,
  Waves,
  Eye,
  Ruler,
  MapPin,
  Calendar,
  AlertTriangle,
  Utensils,
  GitCompare,
  Check,
} from "lucide-react";
import { useAtlasStore } from "@/store/atlasStore";
import { getPhylumColor } from "@/data/speciesAtlas";
import AtlasImage from "./AtlasImage";
import type { AtlasImage as AtlasImageType } from "@/types";
import { cn } from "@/lib/utils";

interface SpeciesDetailPanelProps {
  speciesId: string;
  onClose: () => void;
  onAddToCompare?: () => void;
  isInCompare?: boolean;
}

export default function SpeciesDetailPanel({
  speciesId,
  onClose,
  onAddToCompare,
  isInCompare,
}: SpeciesDetailPanelProps) {
  const species = useAtlasStore((s) => s.getSpecies(speciesId));

  if (!species) {
    return (
      <div className="p-8 text-center text-ocean-400">
        未找到该物种信息
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="relative">
        <div className="aspect-video w-full bg-ocean-950 overflow-hidden relative">
          <AtlasImage
            image={species.thumbnail as AtlasImageType | undefined}
            alt={species.commonName}
            phylum={species.phylum}
            commonName={species.commonName}
            scientificName={species.scientificName}
          />
        </div>
        <div
          className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-ocean-950/80 to-transparent pointer-events-none"
        />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full bg-ocean-950/60 text-ocean-100 hover:bg-ocean-900/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        {isInCompare && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-reef-500 text-white text-xs font-semibold flex items-center gap-1">
            <Check className="w-3 h-3" />
            已加入对比
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-reef-300">
                  {species.commonName}
                </h2>
                <p className="text-sm text-ocean-400 italic">
                  {species.scientificName}
                </p>
              </div>
              <span
                className="chip text-xs"
                style={{ borderColor: getPhylumColor(species.phylum), color: getPhylumColor(species.phylum) }}
              >
                {species.phylum}
              </span>
            </div>
            <div className="mt-2 text-xs text-ocean-500">
              {species.kingdom} · {species.className}
              {species.order && ` · ${species.order}`} · {species.family} · {species.genus}
            </div>
          </div>

          {onAddToCompare && (
            <button
              onClick={onAddToCompare}
              disabled={isInCompare}
              className={cn(
                "w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
                isInCompare
                  ? "bg-reef-600/30 text-reef-300 cursor-default"
                  : "btn-secondary py-2.5"
              )}
            >
              <GitCompare className="w-4 h-4" />
              {isInCompare ? "已加入对比" : "加入形态对比"}
            </button>
          )}

          <Section icon={<Info className="w-4 h-4 text-reef-400" />} title="物种描述">
            <p className="text-sm text-ocean-200 leading-relaxed">{species.description}</p>
          </Section>

          <Section icon={<Waves className="w-4 h-4 text-ocean-400" />} title="栖息环境">
            <p className="text-sm text-ocean-200 leading-relaxed">{species.habitat}</p>
          </Section>

          <Section icon={<Eye className="w-4 h-4 text-sand-400" />} title="鉴别特征">
            <ul className="space-y-1.5">
              {species.identificationKeys.map((key, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-ocean-200">
                  <span className="text-reef-400 mt-0.5">•</span>
                  <span>{key}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section icon={<Ruler className="w-4 h-4 text-purple-400" />} title="形态特征">
            <div className="grid grid-cols-2 gap-2">
              {species.morphology.map((trait) => (
                <div
                  key={trait.label}
                  className="bg-ocean-900/40 rounded-lg p-2.5 border border-ocean-700/30"
                >
                  <div className="text-xs text-ocean-400 mb-0.5">{trait.label}</div>
                  <div className="text-sm text-ocean-100 font-medium">
                    {trait.value}
                    {trait.unit && (
                      <span className="text-ocean-400 ml-0.5 font-normal">{trait.unit}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <div className="grid grid-cols-2 gap-2">
            {species.distribution && (
              <InfoChip icon={<MapPin className="w-3 h-3" />} label="分布" value={species.distribution} />
            )}
            {species.seasonality && (
              <InfoChip icon={<Calendar className="w-3 h-3" />} label="季节" value={species.seasonality} />
            )}
            {species.conservationStatus && (
              <InfoChip icon={<AlertTriangle className="w-3 h-3" />} label="保护状态" value={species.conservationStatus} />
            )}
            {species.edibility && (
              <InfoChip icon={<Utensils className="w-3 h-3" />} label="食用性" value={species.edibility} />
            )}
          </div>

          {species.images && species.images.length > 0 && (
            <Section title="图鉴图片">
              <div className="grid grid-cols-3 gap-2">
                {species.images.map((img, idx) => (
                  <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-ocean-900/50 relative">
                    <AtlasImage
                      image={img as AtlasImageType}
                      alt={`${species.commonName}-${idx + 1}`}
                      phylum={species.phylum}
                      commonName={species.commonName}
                    />
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="section-title text-base mb-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-ocean-900/40 rounded-lg p-2.5 border border-ocean-700/30">
      <div className="text-xs text-ocean-400 mb-0.5 flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="text-sm text-ocean-100">{value}</div>
    </div>
  );
}
