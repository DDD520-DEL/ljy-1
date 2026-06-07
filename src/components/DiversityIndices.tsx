import { useMemo } from "react";
import { BarChart3, Fish, Users, Leaf } from "lucide-react";
import { calcDiversityIndices } from "@/lib/diversity";
import type { SpeciesRecord } from "@/types";

interface DiversityIndicesProps {
  species: SpeciesRecord[];
}

export default function DiversityIndices({ species }: DiversityIndicesProps) {
  const indices = useMemo(() => calcDiversityIndices(species), [species]);

  return (
    <div className="card-glass p-5">
      <h3 className="section-title">
        <BarChart3 className="w-6 h-6 text-reef-400" />
        多样性指数
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="stat-card">
          <Fish className="w-6 h-6 mx-auto text-ocean-400 mb-1" />
          <div className="stat-value">{indices.speciesCount}</div>
          <div className="stat-label">物种数 (S)</div>
        </div>
        <div className="stat-card">
          <Users className="w-6 h-6 mx-auto text-ocean-400 mb-1" />
          <div className="stat-value">{indices.totalIndividuals}</div>
          <div className="stat-label">总个体数 (N)</div>
        </div>
        <div className="stat-card">
          <Leaf className="w-6 h-6 mx-auto text-reef-400 mb-1" />
          <div className="stat-value">{indices.shannonWiener}</div>
          <div className="stat-label">Shannon-Wiener (H')</div>
        </div>
        <div className="stat-card">
          <div className="w-6 h-6 mx-auto text-sand-400 mb-1 flex items-center justify-center font-bold">
            J
          </div>
          <div className="stat-value">{indices.pielouEvenness}</div>
          <div className="stat-label">Pielou 均匀度 (J)</div>
        </div>
        <div className="stat-card col-span-2 md:col-span-1">
          <div className="w-6 h-6 mx-auto text-purple-400 mb-1 flex items-center justify-center font-bold">
            d
          </div>
          <div className="stat-value">{indices.margalefRichness}</div>
          <div className="stat-label">Margalef 丰富度 (d)</div>
        </div>
      </div>
      <div className="mt-4 p-3 bg-ocean-950/40 rounded-xl text-xs text-ocean-300 space-y-1">
        <p>
          <span className="text-reef-300 font-medium">Shannon-Wiener H'</span> =
          -Σ(pi × ln pi)，值越大多样性越高，通常 1.5-3.5
        </p>
        <p>
          <span className="text-sand-300 font-medium">Pielou J</span> = H' /
          ln(S)，取值 0-1，越接近 1 均匀度越好
        </p>
        <p>
          <span className="text-purple-300 font-medium">Margalef d</span> = (S-1)
          / ln(N)，反映物种丰富度
        </p>
      </div>
    </div>
  );
}
