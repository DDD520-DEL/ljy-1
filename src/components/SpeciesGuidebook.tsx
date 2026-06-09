import { useState, useEffect, useMemo, useRef } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Leaf,
  Fish,
  Shield,
  Lightbulb,
  Shuffle,
  CalendarDays,
  Waves,
} from "lucide-react";
import guidebookData from "@/data/guidebookSpecies.json";
import type { GuidebookSpeciesItem } from "@/types";
import { getPhylumColor, makePlaceholder } from "@/data/speciesAtlas";
import { cn } from "@/lib/utils";

interface SpeciesGuidebookProps {
  onClose?: () => void;
}

function getTodayDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function seededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export default function SpeciesGuidebook({ onClose }: SpeciesGuidebookProps) {
  const speciesList = guidebookData as GuidebookSpeciesItem[];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeFactIndex, setActiveFactIndex] = useState(0);
  const [dailyShown, setDailyShown] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  const dailySpeciesIndex = useMemo(() => {
    const key = getTodayDateKey();
    return seededRandom(key) % speciesList.length;
  }, [speciesList.length]);

  useEffect(() => {
    setCurrentIndex(dailySpeciesIndex);
    setDailyShown(true);
  }, [dailySpeciesIndex]);

  const goTo = (index: number, dir: "left" | "right") => {
    if (isAnimating) return;
    setDirection(dir);
    setIsAnimating(true);
    setActiveFactIndex(0);
    setTimeout(() => {
      setCurrentIndex(index);
      setTimeout(() => {
        setIsAnimating(false);
        setDirection(null);
      }, 50);
    }, 300);
  };

  const prev = () => {
    const next =
      currentIndex === 0 ? speciesList.length - 1 : currentIndex - 1;
    goTo(next, "right");
  };

  const next = () => {
    const next = (currentIndex + 1) % speciesList.length;
    goTo(next, "left");
  };

  const random = () => {
    if (isAnimating) return;
    let newIndex = Math.floor(Math.random() * speciesList.length);
    while (newIndex === currentIndex && speciesList.length > 1) {
      newIndex = Math.floor(Math.random() * speciesList.length);
    }
    const dir = newIndex > currentIndex ? "left" : "right";
    goTo(newIndex, dir);
  };

  const showDaily = () => {
    if (isAnimating) return;
    const dir = dailySpeciesIndex > currentIndex ? "left" : "right";
    goTo(dailySpeciesIndex, dir);
    setDailyShown(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };

  const handleTouchEnd = () => {
    if (Math.abs(touchDeltaX.current) > 60) {
      if (touchDeltaX.current > 0) {
        prev();
      } else {
        next();
      }
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  const species = speciesList[currentIndex];
  const phylumColor = getPhylumColor(species.phylum);

  const imageSrc = useMemo(() => {
    return makePlaceholder(species.imagePrompt, "square_hd", {
      phylum: species.phylum,
      label: species.commonName,
      scientificName: species.scientificName,
    });
  }, [species]);

  return (
    <div className="fixed inset-0 z-50 bg-ocean-950/95 backdrop-blur-xl flex flex-col">
      <header className="sticky top-0 z-10 bg-ocean-950/80 backdrop-blur-xl border-b border-ocean-700/40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-reef-400 to-ocean-400 flex items-center justify-center shadow-lg flex-shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-ocean-50 text-lg leading-tight truncate">
                潮间带生物科普图鉴
              </h1>
              <p className="text-xs text-ocean-400 leading-tight">
                {currentIndex + 1} / {speciesList.length} · 左右滑动浏览
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={showDaily}
              className={cn(
                "px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 min-h-[44px] text-sm font-medium",
                dailyShown && currentIndex === dailySpeciesIndex
                  ? "bg-reef-500 text-white"
                  : "bg-reef-500/20 text-reef-300 hover:bg-reef-500/30"
              )}
              title="今日推荐"
            >
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">今日推荐</span>
            </button>
            <button
              onClick={random}
              className="p-2 rounded-xl bg-ocean-800/50 text-ocean-200 hover:bg-ocean-700/50 transition-colors min-h-[44px]"
              title="随机浏览"
            >
              <Shuffle className="w-5 h-5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-ocean-800/50 text-ocean-200 hover:bg-ocean-700/50 transition-colors min-h-[44px]"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="relative">
            <button
              onClick={prev}
              className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-20 w-10 h-10 rounded-full bg-ocean-800/80 backdrop-blur text-ocean-100 items-center justify-center hover:bg-ocean-700 transition-colors"
              aria-label="上一个"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={next}
              className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-20 w-10 h-10 rounded-full bg-ocean-800/80 backdrop-blur text-ocean-100 items-center justify-center hover:bg-ocean-700 transition-colors"
              aria-label="下一个"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <div
              className="relative mx-8"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {currentIndex === dailySpeciesIndex && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-30">
                  <span className="chip bg-gradient-to-r from-reef-500/80 to-ocean-500/80 border-reef-400 text-white text-xs font-semibold flex items-center gap-1 shadow-lg">
                    <Sparkles className="w-3 h-3" />
                    今日推荐物种
                  </span>
                </div>
              )}
              <div
                className={cn(
                  "card-glass overflow-hidden transition-all duration-300",
                  isAnimating &&
                    direction === "left" &&
                    "-translate-x-4 opacity-0",
                  isAnimating &&
                    direction === "right" &&
                    "translate-x-4 opacity-0"
                )}
                key={species.id}
              >
                <div className="relative aspect-[4/3] bg-ocean-950 overflow-hidden">
                  <img
                    src={imageSrc.src}
                    alt={species.commonName}
                    className="w-full h-full object-cover"
                  />
                  <img
                    src={imageSrc.fallback}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-ocean-950 via-transparent to-transparent"
                  />
                  <div
                    className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                    style={{
                      backgroundColor: phylumColor + "D9",
                      color: "white",
                    }}
                  >
                    {species.phylumCn}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h2 className="text-2xl font-bold text-ocean-50 mb-1">
                      {species.commonName}
                    </h2>
                    <p className="text-sm text-ocean-300 italic mb-1">
                      {species.scientificName}
                    </p>
                    <p className="text-xs text-ocean-400">
                      {species.classCn} · {species.familyCn}
                    </p>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {species.funFacts.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveFactIndex(idx)}
                          className={cn(
                            "w-2 h-2 rounded-full transition-all",
                            activeFactIndex === idx
                              ? "bg-reef-400 w-6"
                              : "bg-ocean-600 hover:bg-ocean-500"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <InfoSection
                    icon={<Leaf className="w-4 h-4 text-emerald-400" />}
                    title="生态习性"
                    content={species.ecologicalHabit}
                  />

                  <InfoSection
                    icon={<Fish className="w-4 h-4 text-sky-400" />}
                    title="食性"
                    content={species.diet}
                  />

                  <InfoSection
                    icon={<Shield className="w-4 h-4 text-amber-400" />}
                    title="保护等级"
                    content={species.conservationStatus}
                  />

                  <div className="card-glass bg-ocean-800/50 border-ocean-600/30 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-yellow-400" />
                      <span className="font-semibold text-ocean-100 text-sm">
                        趣味冷知识
                      </span>
                      <span className="text-xs text-ocean-500 ml-auto">
                        {activeFactIndex + 1} / {species.funFacts.length}
                      </span>
                    </div>
                    <p className="text-sm text-ocean-200 leading-relaxed">
                      {species.funFacts[activeFactIndex]}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mt-5 gap-2">
            <button
              onClick={prev}
              className="flex-1 sm:hidden btn-ghost py-3 px-4"
            >
              <ChevronLeft className="w-5 h-5" />
              上一个
            </button>
            <button
              onClick={random}
              className="flex-1 btn-secondary py-3 px-4 sm:hidden"
            >
              <Shuffle className="w-5 h-5" />
              随机
            </button>
            <button
              onClick={next}
              className="flex-1 sm:hidden btn-ghost py-3 px-4"
            >
              下一个
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-ocean-200 mb-3 flex items-center gap-2">
              <Waves className="w-4 h-4 text-ocean-400" />
              全部物种
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {speciesList.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => {
                    const dir = idx > currentIndex ? "left" : "right";
                    goTo(idx, dir);
                  }}
                  className={cn(
                    "card-glass p-2 text-xs text-center transition-all",
                    idx === currentIndex
                      ? "ring-2 ring-reef-400/60 bg-reef-500/10"
                      : "hover:bg-ocean-800/50"
                  )}
                >
                  <div
                    className="aspect-square rounded-lg overflow-hidden mb-1.5"
                    style={{
                      backgroundColor: getPhylumColor(s.phylum) + "20",
                    }}
                  >
                    <div
                      className="w-full h-full flex items-center justify-center text-lg font-bold"
                      style={{ color: getPhylumColor(s.phylum) }}
                    >
                      {s.commonName.slice(0, 1)}
                    </div>
                  </div>
                  <div className="text-ocean-200 text-[10px] truncate">
                    {s.commonName}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoSection({
  icon,
  title,
  content,
}: {
  icon: React.ReactNode;
  title: string;
  content: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <span className="font-semibold text-ocean-100 text-sm">{title}</span>
      </div>
      <p className="text-sm text-ocean-300 leading-relaxed">{content}</p>
    </div>
  );
}
