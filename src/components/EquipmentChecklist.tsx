import { useState, useMemo } from "react";
import {
  Backpack,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Package,
  ClipboardCheck,
  MoreHorizontal,
  ChevronRight,
  RotateCcw,
  FolderPlus,
  Save,
  Layers,
} from "lucide-react";
import { useEquipmentStore } from "@/store/equipmentStore";
import type { EquipmentTemplate, EquipmentItem } from "@/types";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER = [
  "采样工具",
  "测量工具",
  "记录用品",
  "标本容器",
  "个人装备",
  "其他",
];

interface ItemRowProps {
  templateId: string;
  item: EquipmentItem;
  onDelete: (id: string) => void;
}

function ItemRow({ templateId, item, onDelete }: ItemRowProps) {
  const togglePrepared = useEquipmentStore((s) => s.togglePrepared);
  const togglePacked = useEquipmentStore((s) => s.togglePacked);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editQty, setEditQty] = useState(String(item.quantity ?? ""));
  const updateItem = useEquipmentStore((s) => s.updateItem);

  const handleSave = () => {
    const name = editName.trim();
    if (!name) {
      setEditName(item.name);
      setEditing(false);
      return;
    }
    const quantity = editQty.trim() === "" ? undefined : parseInt(editQty, 10);
    updateItem(templateId, item.id, {
      name,
      quantity: isNaN(quantity as number) ? undefined : quantity,
    });
    setEditing(false);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2.5 rounded-xl border transition-all group",
        item.prepared && item.packed
          ? "bg-emerald-500/10 border-emerald-500/30"
          : "bg-ocean-800/30 border-ocean-700/40 hover:bg-ocean-700/40"
      )}
    >
      <button
        onClick={() => togglePrepared(templateId, item.id)}
        className={cn(
          "w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all",
          item.prepared
            ? "bg-emerald-500 border-emerald-500 text-white"
            : "border-ocean-500 hover:border-emerald-400"
        )}
        title="已准备"
      >
        {item.prepared && <Check className="w-4 h-4" />}
      </button>

      <button
        onClick={() => togglePacked(templateId, item.id)}
        className={cn(
          "w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all",
          item.packed
            ? "bg-sky-500 border-sky-500 text-white"
            : "border-ocean-500 hover:border-sky-400"
        )}
        title="已装箱"
      >
        {item.packed && <Package className="w-3.5 h-3.5" />}
      </button>

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 px-2 py-1 rounded-lg bg-ocean-900 border border-ocean-600 text-ocean-100 text-sm focus:outline-none focus:border-reef-400 min-w-0"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") {
                  setEditName(item.name);
                  setEditing(false);
                }
              }}
            />
            <input
              type="number"
              value={editQty}
              onChange={(e) => setEditQty(e.target.value)}
              placeholder="数量"
              className="w-16 px-2 py-1 rounded-lg bg-ocean-900 border border-ocean-600 text-ocean-100 text-sm focus:outline-none focus:border-reef-400 text-center"
              min="0"
            />
            <button
              onClick={handleSave}
              className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setEditName(item.name);
                setEditQty(String(item.quantity ?? ""));
                setEditing(false);
              }}
              className="p-1.5 rounded-lg bg-ocean-700/50 text-ocean-300 hover:bg-ocean-600/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setEditing(true)}
          >
            <span
              className={cn(
                "text-sm truncate",
                item.prepared && item.packed
                  ? "text-ocean-400 line-through"
                  : "text-ocean-100"
              )}
            >
              {item.name}
            </span>
            {item.quantity !== undefined && item.quantity > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-ocean-700/60 text-ocean-300 flex-shrink-0">
                ×{item.quantity}
              </span>
            )}
            {item.category && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-reef-500/15 text-reef-300 flex-shrink-0">
                {item.category}
              </span>
            )}
          </div>
        )}
      </div>

      {!editing && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-ocean-400 hover:text-ocean-100 hover:bg-ocean-700/50"
            title="编辑"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 rounded-lg text-ocean-400 hover:text-red-400 hover:bg-red-500/10"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

interface AddItemFormProps {
  templateId: string;
  onAdded: () => void;
}

function AddItemForm({ templateId, onAdded }: AddItemFormProps) {
  const addItem = useEquipmentStore((s) => s.addItem);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const qty = quantity.trim() === "" ? undefined : parseInt(quantity, 10);
    addItem(
      templateId,
      trimmed,
      category || undefined,
      isNaN(qty as number) ? undefined : qty
    );
    setName("");
    setCategory("");
    setQuantity("");
    setExpanded(false);
    onAdded();
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-ocean-600/50 text-ocean-400 hover:border-reef-400 hover:text-reef-300 hover:bg-reef-500/10 transition-all min-h-[44px]"
      >
        <Plus className="w-5 h-5" />
        <span>添加装备条目</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 rounded-xl bg-ocean-800/40 border border-ocean-600/50 space-y-2"
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="装备名称（如：样方框）"
          className="flex-1 px-3 py-2 rounded-lg bg-ocean-900 border border-ocean-600 text-ocean-100 text-sm focus:outline-none focus:border-reef-400 min-h-[40px]"
          autoFocus
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 rounded-lg bg-ocean-900 border border-ocean-600 text-ocean-100 text-sm focus:outline-none focus:border-reef-400 min-h-[40px]"
        >
          <option value="">分类</option>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="数量"
          className="w-20 px-3 py-2 rounded-lg bg-ocean-900 border border-ocean-600 text-ocean-100 text-sm focus:outline-none focus:border-reef-400 text-center min-h-[40px]"
          min="0"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="px-4 py-2 rounded-lg bg-ocean-700/50 text-ocean-200 hover:bg-ocean-600/50 text-sm min-h-[36px]"
        >
          取消
        </button>
        <button
          type="submit"
          className="btn-primary py-2 px-4 text-sm min-h-[36px]"
          disabled={!name.trim()}
        >
          <Plus className="w-4 h-4" />
          添加
        </button>
      </div>
    </form>
  );
}

interface TemplatePanelProps {
  template: EquipmentTemplate;
  isActive: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

function TemplatePanel({
  template,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: TemplatePanelProps) {
  const getIncompleteCount = useEquipmentStore((s) => s.getIncompleteCount);
  const togglePrepared = useEquipmentStore((s) => s.togglePrepared);
  const togglePacked = useEquipmentStore((s) => s.togglePacked);
  const removeItem = useEquipmentStore((s) => s.removeItem);
  const resetAllStatus = useEquipmentStore((s) => s.resetAllStatus);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(template.name);
  const [showMenu, setShowMenu] = useState(false);

  const counts = useMemo(
    () => getIncompleteCount(template.id),
    [getIncompleteCount, template.id, template.items]
  );

  const groupedItems = useMemo(() => {
    const groups: Record<string, EquipmentItem[]> = {};
    for (const item of template.items) {
      const cat = item.category || "其他";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    const sortedKeys = Object.keys(groups).sort(
      (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)
    );
    return { groups, sortedKeys };
  }, [template.items]);

  const progress =
    counts.total > 0
      ? Math.round(
          ((counts.total - Math.max(counts.notPrepared, counts.notPacked)) /
            counts.total) *
            100
        )
      : 0;

  const handleRenameSubmit = () => {
    const name = renameValue.trim();
    if (name && name !== template.name) {
      onRename(name);
    } else {
      setRenameValue(template.name);
    }
    setRenaming(false);
    setShowMenu(false);
  };

  return (
    <div
      className={cn(
        "card-glass overflow-hidden transition-all",
        isActive ? "ring-2 ring-reef-400 ring-offset-2 ring-offset-transparent" : ""
      )}
    >
      <div
        className={cn(
          "p-4 cursor-pointer transition-all",
          isActive ? "bg-reef-500/10" : "hover:bg-ocean-800/30"
        )}
        onClick={() => !isActive && onSelect()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-reef-500 to-sand-500 flex items-center justify-center flex-shrink-0">
              <Backpack className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              {renaming ? (
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full px-2 py-1 rounded-lg bg-ocean-900 border border-reef-400 text-ocean-100 font-semibold focus:outline-none"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSubmit();
                    if (e.key === "Escape") {
                      setRenameValue(template.name);
                      setRenaming(false);
                    }
                  }}
                />
              ) : (
                <h3 className="font-semibold text-ocean-100 truncate">
                  {template.name}
                </h3>
              )}
              {template.description && (
                <p className="text-xs text-ocean-400 truncate">
                  {template.description}
                </p>
              )}
            </div>
          </div>

          <div className="relative flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {!renaming && (
              <>
                <span
                  className={cn(
                    "text-sm font-bold px-2 py-0.5 rounded-lg",
                    counts.notPrepared === 0 && counts.notPacked === 0
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-reef-500/20 text-reef-300"
                  )}
                >
                  {counts.total - Math.max(counts.notPrepared, counts.notPacked)}/{counts.total}
                </span>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1.5 rounded-lg text-ocean-400 hover:text-ocean-100 hover:bg-ocean-700/50"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </>
            )}

            {showMenu && !renaming && (
              <div className="absolute right-0 top-full mt-1 w-44 card-glass p-1.5 z-50 shadow-2xl">
                <button
                  onClick={() => {
                    setRenaming(true);
                    setRenameValue(template.name);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-ocean-200 hover:bg-ocean-700/50 flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  重命名
                </button>
                <button
                  onClick={() => {
                    resetAllStatus(template.id);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-ocean-200 hover:bg-ocean-700/50 flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  重置所有状态
                </button>
                <div className="my-1 border-t border-ocean-700/40" />
                <button
                  onClick={() => {
                    if (confirm(`确定要删除模板「${template.name}」吗？`)) {
                      onDelete();
                    }
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-300 hover:bg-red-500/10 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  删除模板
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="h-2 rounded-full bg-ocean-800/80 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progress === 100
                  ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                  : "bg-gradient-to-r from-reef-400 to-sand-400"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-ocean-400">
            <span className="flex items-center gap-1">
              <ClipboardCheck className="w-3.5 h-3.5" />
              未准备: <span className="text-reef-300 font-semibold">{counts.notPrepared}</span>
            </span>
            <span className="flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              未装箱: <span className="text-sky-300 font-semibold">{counts.notPacked}</span>
            </span>
          </div>
        </div>
      </div>

      {isActive && (
        <div className="p-4 pt-0 space-y-3 border-t border-ocean-700/30 mt-2">
          {template.items.length === 0 ? (
            <div className="py-8 text-center">
              <Backpack className="w-12 h-12 mx-auto mb-3 text-ocean-500 opacity-50" />
              <p className="text-ocean-400 text-sm">暂无装备条目，点击下方按钮添加</p>
            </div>
          ) : (
            groupedItems.sortedKeys.map((cat) => (
              <div key={cat} className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-1">
                  <Layers className="w-3.5 h-3.5 text-ocean-500" />
                  <span className="text-xs font-medium text-ocean-400">
                    {cat}
                  </span>
                  <span className="text-xs text-ocean-600">
                    ({groupedItems.groups[cat].length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {groupedItems.groups[cat].map((item) => (
                    <ItemRow
                      key={item.id}
                      templateId={template.id}
                      item={item}
                      onDelete={(id) => removeItem(template.id, id)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}

          <AddItemForm
            templateId={template.id}
            onAdded={() => {}}
          />

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3 text-xs text-ocean-400">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded border-2 border-emerald-500 bg-emerald-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </span>
                已准备
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded border-2 border-sky-500 bg-sky-500 flex items-center justify-center">
                  <Package className="w-2.5 h-2.5 text-white" />
                </span>
                已装箱
              </span>
            </div>
            <button
              onClick={() => togglePrepared(template.id, "")}
              className="hidden"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function EquipmentChecklist() {
  const templates = useEquipmentStore((s) => s.templates);
  const activeTemplateId = useEquipmentStore((s) => s.activeTemplateId);
  const setActiveTemplate = useEquipmentStore((s) => s.setActiveTemplate);
  const createTemplate = useEquipmentStore((s) => s.createTemplate);
  const renameTemplate = useEquipmentStore((s) => s.renameTemplate);
  const deleteTemplate = useEquipmentStore((s) => s.deleteTemplate);
  const getTotalIncompleteCount = useEquipmentStore((s) => s.getTotalIncompleteCount);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const totalIncomplete = getTotalIncompleteCount();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    createTemplate(name, newDesc.trim() || undefined);
    setNewName("");
    setNewDesc("");
    setShowNewForm(false);
  };

  const activeTemplate =
    templates.find((t) => t.id === activeTemplateId) || templates[0] || null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Backpack className="w-6 h-6 text-reef-400" />
          <h2 className="text-lg font-bold text-ocean-100">野外装备清单</h2>
          {totalIncomplete > 0 && (
            <span className="chip bg-reef-500/20 text-reef-300 border-reef-500/30">
              {totalIncomplete} 项待处理
            </span>
          )}
        </div>
        {!showNewForm && (
          <button
            onClick={() => setShowNewForm(true)}
            className="btn-primary py-2 px-4 text-sm min-h-[40px]"
          >
            <FolderPlus className="w-4 h-4" />
            新建模板
          </button>
        )}
      </div>

      {showNewForm && (
        <form
          onSubmit={handleCreate}
          className="card-glass p-4 space-y-3"
        >
          <h3 className="font-semibold text-ocean-100 flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-reef-400" />
            新建装备模板
          </h3>
          <div className="space-y-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="模板名称（如：岩礁套装）"
              className="w-full px-3 py-2.5 rounded-lg bg-ocean-900 border border-ocean-600 text-ocean-100 focus:outline-none focus:border-reef-400 min-h-[44px]"
              autoFocus
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="模板描述（可选）"
              className="w-full px-3 py-2.5 rounded-lg bg-ocean-900 border border-ocean-600 text-ocean-100 focus:outline-none focus:border-reef-400 min-h-[44px]"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowNewForm(false);
                setNewName("");
                setNewDesc("");
              }}
              className="px-4 py-2 rounded-lg bg-ocean-700/50 text-ocean-200 hover:bg-ocean-600/50 min-h-[40px]"
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary py-2 px-4 min-h-[40px]"
              disabled={!newName.trim()}
            >
              <Plus className="w-4 h-4" />
              创建模板
            </button>
          </div>
        </form>
      )}

      {templates.length === 0 ? (
        <div className="card-glass p-10 text-center">
          <Backpack className="w-16 h-16 mx-auto mb-4 text-ocean-500 opacity-50" />
          <h3 className="text-lg font-semibold text-ocean-100 mb-2">暂无装备模板</h3>
          <p className="text-ocean-400 mb-5">
            还没有装备清单模板，点击下方按钮创建你的第一套装备清单
          </p>
          <button
            onClick={() => setShowNewForm(true)}
            className="btn-primary py-2.5 px-5"
          >
            <FolderPlus className="w-5 h-5" />
            新建模板
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((t) => (
            <TemplatePanel
              key={t.id}
              template={t}
              isActive={activeTemplate?.id === t.id}
              onSelect={() => setActiveTemplate(t.id)}
              onRename={(name) => renameTemplate(t.id, name)}
              onDelete={() => deleteTemplate(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
