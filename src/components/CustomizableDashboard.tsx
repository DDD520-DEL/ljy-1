import { useState, useEffect, useCallback, useRef } from "react";
import {
  GripVertical,
  X,
  Plus,
  Settings,
  TrendingUp,
  BarChart3,
  FileText,
  Trophy,
  Gauge,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import type { SurveyRecord } from "@/types";
import {
  type DashboardCard,
  type DashboardCardType,
  CARD_META,
  DEFAULT_CARDS,
  loadDashboardLayout,
  saveDashboardLayout,
} from "@/lib/dashboard";
import {
  SurveyTrendCard,
  TideSpeciesBarCard,
  RecentSurveyCard,
  SpeciesAbundanceCard,
  EnvGaugeCard,
} from "@/components/DashboardCards";
import { cn } from "@/lib/utils";

const CARD_ICON: Record<DashboardCardType, React.ComponentType<{ className?: string }>> = {
  surveyTrend: TrendingUp,
  tideSpeciesBar: BarChart3,
  recentSurvey: FileText,
  speciesAbundance: Trophy,
  envGauge: Gauge,
};

function renderCardContent(type: DashboardCardType, surveys: SurveyRecord[]) {
  switch (type) {
    case "surveyTrend":
      return <SurveyTrendCard surveys={surveys} />;
    case "tideSpeciesBar":
      return <TideSpeciesBarCard surveys={surveys} />;
    case "recentSurvey":
      return <RecentSurveyCard surveys={surveys} />;
    case "speciesAbundance":
      return <SpeciesAbundanceCard surveys={surveys} />;
    case "envGauge":
      return <EnvGaugeCard surveys={surveys} />;
  }
}

interface DraggableCardProps {
  card: DashboardCard;
  surveys: SurveyRecord[];
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onRemove: (id: string) => void;
  onEditModeToggle: () => void;
  editMode: boolean;
}

function DraggableCard({
  card,
  surveys,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onRemove,
  editMode,
}: DraggableCardProps) {
  const meta = CARD_META[card.type];
  const Icon = CARD_ICON[card.type];

  return (
    <div
      draggable={editMode}
      onDragStart={(e) => onDragStart(e, card.id)}
      onDragOver={(e) => onDragOver(e, card.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, card.id)}
      onDragEnd={onDragEnd}
      className={cn(
        "card-glass p-5 transition-all duration-200 relative group",
        isDragging && "opacity-40 scale-95",
        isDragOver && "ring-2 ring-reef-400 ring-offset-2 ring-offset-transparent scale-[1.02]",
        editMode && "cursor-grab active:cursor-grabbing"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {editMode && (
            <GripVertical className="w-5 h-5 text-ocean-400 cursor-grab hover:text-ocean-200" />
          )}
          <Icon className="w-5 h-5 text-reef-400" />
          <h3 className="font-bold text-ocean-100">{meta.label}</h3>
        </div>
        {editMode && (
          <button
            onClick={() => onRemove(card.id)}
            className="p-1.5 rounded-lg text-ocean-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="移除卡片"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div>{renderCardContent(card.type, surveys)}</div>
    </div>
  );
}

interface AddCardMenuProps {
  onAdd: (type: DashboardCardType) => void;
  existingTypes: DashboardCardType[];
}

function AddCardMenu({ onAdd, existingTypes }: AddCardMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const availableTypes = (Object.keys(CARD_META) as DashboardCardType[]).filter(
    (t) => !existingTypes.includes(t)
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={availableTypes.length === 0}
        className={cn(
          "btn-primary py-2.5 px-4 text-sm min-h-[40px]",
          availableTypes.length === 0 && "opacity-50 cursor-not-allowed"
        )}
      >
        <Plus className="w-4 h-4" />
        添加卡片
        <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && availableTypes.length > 0 && (
        <div className="absolute right-0 mt-2 w-72 card-glass p-2 z-50 shadow-2xl">
          {availableTypes.map((type) => {
            const meta = CARD_META[type];
            const Icon = CARD_ICON[type];
            return (
              <button
                key={type}
                onClick={() => {
                  onAdd(type);
                  setOpen(false);
                }}
                className="w-full text-left p-3 rounded-xl hover:bg-ocean-700/40 transition-all flex items-start gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-reef-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-reef-400" />
                </div>
                <div>
                  <div className="font-medium text-ocean-100 text-sm">{meta.label}</div>
                  <div className="text-xs text-ocean-400 mt-0.5">{meta.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface CustomizableDashboardProps {
  surveys: SurveyRecord[];
}

export default function CustomizableDashboard({ surveys }: CustomizableDashboardProps) {
  const [cards, setCards] = useState<DashboardCard[]>(() => loadDashboardLayout());
  const [editMode, setEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    saveDashboardLayout(cards);
  }, [cards]);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverId !== id) {
      setDragOverId(id);
    }
  }, [dragOverId]);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const sourceId = draggedId || e.dataTransfer.getData("text/plain");
      if (!sourceId || sourceId === targetId) {
        setDraggedId(null);
        setDragOverId(null);
        return;
      }

      setCards((prev) => {
        const newCards = [...prev];
        const sourceIndex = newCards.findIndex((c) => c.id === sourceId);
        const targetIndex = newCards.findIndex((c) => c.id === targetId);
        if (sourceIndex === -1 || targetIndex === -1) return prev;
        const [moved] = newCards.splice(sourceIndex, 1);
        newCards.splice(targetIndex, 0, moved);
        return newCards;
      });

      setDraggedId(null);
      setDragOverId(null);
    },
    [draggedId]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
  }, []);

  const handleAddCard = useCallback((type: DashboardCardType) => {
    setCards((prev) => [
      ...prev,
      { id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type },
    ]);
  }, []);

  const handleRemoveCard = useCallback((id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleResetLayout = useCallback(() => {
    setCards(DEFAULT_CARDS);
  }, []);

  const existingTypes = cards.map((c) => c.type);

  if (cards.length === 0) {
    return (
      <div className="card-glass p-10 text-center">
        <Gauge className="w-14 h-14 mx-auto mb-4 text-ocean-400 opacity-40" />
        <h3 className="text-lg font-semibold text-ocean-100 mb-2">数据看板</h3>
        <p className="text-ocean-400 mb-5">暂无卡片，点击下方按钮添加卡片</p>
        <div className="flex items-center justify-center gap-2">
          <AddCardMenu onAdd={handleAddCard} existingTypes={[]} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-6 h-6 text-reef-400" />
          <h2 className="text-lg font-bold text-ocean-100">数据看板</h2>
          {editMode && (
            <span className="chip bg-reef-500/20 text-reef-300 border-reef-500/30">
              编辑模式
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setEditMode(!editMode)}
            className={cn(
              "px-4 py-2 rounded-xl font-medium transition-all min-h-[40px] flex items-center gap-2 text-sm",
              editMode
                ? "bg-reef-500 text-white shadow-lg"
                : "bg-ocean-800/50 text-ocean-200 hover:text-white hover:bg-ocean-700/50 border border-ocean-600/40"
            )}
          >
            <Settings className="w-4 h-4" />
            {editMode ? "完成编辑" : "自定义布局"}
          </button>
          {editMode && (
            <button
              onClick={handleResetLayout}
              className="px-4 py-2 rounded-xl font-medium transition-all min-h-[40px] flex items-center gap-2 text-sm bg-ocean-800/50 text-ocean-200 hover:text-white hover:bg-ocean-700/50 border border-ocean-600/40"
            >
              <RotateCcw className="w-4 h-4" />
              恢复默认
            </button>
          )}
          <AddCardMenu onAdd={handleAddCard} existingTypes={existingTypes} />
        </div>
      </div>

      {editMode && (
        <div className="card-glass p-3 bg-reef-500/10 border-reef-500/30">
          <p className="text-sm text-reef-200">
            💡 提示：拖拽卡片左侧的 <GripVertical className="w-4 h-4 inline align-middle mx-0.5" /> 图标可调整卡片顺序，点击右上角
            <X className="w-4 h-4 inline align-middle mx-0.5" />可移除卡片。
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((card) => (
          <DraggableCard
            key={card.id}
            card={card}
            surveys={surveys}
            isDragging={draggedId === card.id}
            isDragOver={dragOverId === card.id && draggedId !== card.id}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onRemove={handleRemoveCard}
            onEditModeToggle={() => setEditMode(!editMode)}
            editMode={editMode}
          />
        ))}
      </div>
    </div>
  );
}
