import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Tag,
  MapPin,
  Snowflake,
  ThermometerSun,
  Droplets,
  Leaf,
  FileSpreadsheet,
  Printer,
  Download,
} from "lucide-react";
import {
  useSpecimenStore,
  buildSpecimenNo,
} from "@/store/specimenStore";
import type { Specimen, PreservationMethod } from "@/types";
import { PRESERVATION_LABEL } from "@/types";
import { cn } from "@/lib/utils";

const PRESERVATION_OPTIONS: PreservationMethod[] = [
  "alcohol",
  "formalin",
  "frozen",
  "dried",
];

const PRESERVATION_ICONS: Record<PreservationMethod, React.ReactNode> = {
  alcohol: <Droplets className="w-4 h-4" />,
  formalin: <Droplets className="w-4 h-4" />,
  frozen: <Snowflake className="w-4 h-4" />,
  dried: <Leaf className="w-4 h-4" />,
};

const PRESERVATION_COLORS: Record<PreservationMethod, string> = {
  alcohol: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  formalin: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  frozen: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  dried: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob(["\ufeff" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface SpecimenFormProps {
  specimen?: Specimen | null;
  onClose: () => void;
}

function SpecimenForm({ specimen, onClose }: SpecimenFormProps) {
  const addSpecimen = useSpecimenStore((s) => s.addSpecimen);
  const updateSpecimen = useSpecimenStore((s) => s.updateSpecimen);
  const getNextSequenceNo = useSpecimenStore((s) => s.getNextSequenceNo);

  const [stationAbbr, setStationAbbr] = useState(specimen?.stationAbbr ?? "");
  const [date, setDate] = useState(specimen?.date ?? todayStr());
  const [preservation, setPreservation] = useState<PreservationMethod>(
    specimen?.preservation ?? "alcohol"
  );
  const [location, setLocation] = useState(specimen?.location ?? "");
  const [speciesName, setSpeciesName] = useState(specimen?.speciesName ?? "");
  const [notes, setNotes] = useState(specimen?.notes ?? "");
  const [sequenceNo, setSequenceNo] = useState<number | "">(
    specimen?.sequenceNo ?? ""
  );

  const previewNo = useMemo(() => {
    if (!stationAbbr || !date) return "";
    const seq =
      typeof sequenceNo === "number"
        ? sequenceNo
        : getNextSequenceNo(stationAbbr, date);
    return buildSpecimenNo(stationAbbr, date, seq);
  }, [stationAbbr, date, sequenceNo, getNextSequenceNo]);

  const isValid = stationAbbr.trim().length > 0 && location.trim().length > 0;

  const handleSubmit = () => {
    if (!isValid) return;
    if (specimen) {
      updateSpecimen(specimen.id, {
        stationAbbr: stationAbbr.trim().toUpperCase(),
        date,
        preservation,
        location: location.trim(),
        speciesName: speciesName.trim() || undefined,
        notes: notes.trim() || undefined,
        sequenceNo: typeof sequenceNo === "number" ? sequenceNo : undefined,
      });
    } else {
      addSpecimen({
        stationAbbr: stationAbbr.trim().toUpperCase(),
        date,
        preservation,
        location: location.trim(),
        speciesName: speciesName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card-glass w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-ocean-700/40 sticky top-0 bg-ocean-900/80 backdrop-blur-xl z-10">
          <h3 className="text-lg font-semibold text-ocean-100">
            {specimen ? "编辑标本" : "新增标本"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ocean-400 hover:bg-ocean-700/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {previewNo && (
            <div className="bg-reef-500/10 border border-reef-500/30 rounded-xl p-3 flex items-center gap-3">
              <Tag className="w-5 h-5 text-reef-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-reef-300">标本编号</div>
                <div className="font-mono font-bold text-reef-100 text-lg truncate">
                  {previewNo}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text">站位缩写 *</label>
              <input
                type="text"
                value={stationAbbr}
                onChange={(e) =>
                  setStationAbbr(e.target.value.toUpperCase())
                }
                placeholder="例如：QD01"
                className="input-field uppercase"
                maxLength={10}
              />
            </div>
            <div>
              <label className="label-text">采集日期 *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {specimen && (
            <div>
              <label className="label-text">
                序号（留空自动递增）
              </label>
              <input
                type="number"
                value={sequenceNo}
                onChange={(e) =>
                  setSequenceNo(
                    e.target.value === "" ? "" : parseInt(e.target.value, 10)
                  )
                }
                placeholder="自动"
                min={1}
                className="input-field"
              />
            </div>
          )}

          <div>
            <label className="label-text">保存方式 *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESERVATION_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPreservation(m)}
                  className={cn(
                    "px-3 py-3 rounded-xl font-medium text-sm transition-all flex flex-col items-center gap-1.5 min-h-[60px]",
                    preservation === m
                      ? PRESERVATION_COLORS[m] + " border ring-2 ring-offset-2 ring-offset-ocean-900/50"
                      : "bg-ocean-800/50 text-ocean-300 hover:text-white border border-ocean-700/40"
                  )}
                >
                  {PRESERVATION_ICONS[m]}
                  {PRESERVATION_LABEL[m]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label-text">存放位置 *</label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ocean-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例如：标本柜A-第3层"
                className="input-field pl-10"
              />
            </div>
          </div>

          <div>
            <label className="label-text">物种名称（可选）</label>
            <input
              type="text"
              value={speciesName}
              onChange={(e) => setSpeciesName(e.target.value)}
              placeholder="例如：牡蛎"
              className="input-field"
            />
          </div>

          <div>
            <label className="label-text">备注（可选）</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="其他相关信息..."
              rows={3}
              className="input-field resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="btn-ghost text-sm">
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {specimen ? "保存修改" : "生成编号"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface LabelPrintPreviewProps {
  specimens: Specimen[];
  onClose: () => void;
}

function LabelPrintPreview({ specimens, onClose }: LabelPrintPreviewProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const rows = [
      ["标本编号", "站位缩写", "日期", "保存方式", "存放位置", "物种名称"],
      ...specimens.map((s) => [
        s.specimenNo,
        s.stationAbbr,
        s.date,
        PRESERVATION_LABEL[s.preservation],
        s.location,
        s.speciesName ?? "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    downloadFile(csv, `specimen-labels-${Date.now()}.csv`, "text/csv;charset=utf-8");
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card-glass w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col print:bg-white print:static print:inset-auto print:overflow-visible print:max-w-none print:max-h-none">
        <div className="flex items-center justify-between p-4 border-b border-ocean-700/40 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-reef-400" />
            <h3 className="text-lg font-semibold text-ocean-100">
              标签打印预览（{specimens.length} 个）
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportCSV} className="btn-ghost text-sm">
              <FileSpreadsheet className="w-4 h-4" />
              导出 CSV
            </button>
            <button onClick={handlePrint} className="btn-primary text-sm">
              <Printer className="w-4 h-4" />
              打印
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ocean-400 hover:bg-ocean-700/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 print:p-8 print:bg-white">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-3 print:gap-6">
            {specimens.map((s) => (
              <div
                key={s.id}
                className="print:bg-white print:border print:border-gray-300 print:rounded-lg bg-ocean-800/50 border border-ocean-700/40 rounded-xl p-4 flex flex-col gap-2"
              >
                <div className="text-xs text-ocean-400 print:text-gray-500">
                  标本编号
                </div>
                <div className="font-mono font-bold text-xl text-reef-300 print:text-teal-700 break-all">
                  {s.specimenNo}
                </div>
                <div className="border-t border-ocean-700/40 print:border-gray-200 my-1" />
                <div className="flex items-center gap-1.5 text-sm print:text-gray-700">
                  <MapPin className="w-3.5 h-3.5 text-ocean-400 print:text-gray-400 flex-shrink-0" />
                  <span className="truncate">{s.location}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm print:text-gray-700">
                  <span className="inline-flex items-center gap-1">
                    {PRESERVATION_ICONS[s.preservation]}
                  </span>
                  <span>{PRESERVATION_LABEL[s.preservation]}</span>
                  <span className="text-ocean-400 print:text-gray-400 ml-auto">
                    {s.date}
                  </span>
                </div>
                {s.speciesName && (
                  <div className="text-xs text-ocean-300 print:text-gray-600 truncate">
                    {s.speciesName}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SpecimenManager() {
  const specimens = useSpecimenStore((s) => s.specimens);
  const search = useSpecimenStore((s) => s.search);
  const deleteSpecimen = useSpecimenStore((s) => s.deleteSpecimen);

  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Specimen | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showLabels, setShowLabels] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Specimen | null>(null);

  const filtered = useMemo(() => search(query), [search, query]);

  const selectedSpecimens = useMemo(
    () => filtered.filter((s) => selectedIds.has(s.id)),
    [filtered, selectedIds]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)));
    }
  };

  const handleOpenNew = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleEdit = (s: Specimen) => {
    setEditing(s);
    setShowForm(true);
  };

  const handleDelete = (s: Specimen) => {
    setConfirmDelete(s);
  };

  const confirmDeleteSpecimen = () => {
    if (confirmDelete) {
      deleteSpecimen(confirmDelete.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(confirmDelete.id);
        return next;
      });
      setConfirmDelete(null);
    }
  };

  const handlePrintSelected = () => {
    const toPrint =
      selectedSpecimens.length > 0 ? selectedSpecimens : filtered;
    if (toPrint.length === 0) return;
    setShowLabels(true);
  };

  const printSpecimens =
    selectedSpecimens.length > 0 ? selectedSpecimens : filtered;

  return (
    <div className="space-y-4">
      <div className="card-glass p-4">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-6 h-6 text-reef-400" />
          <h3 className="section-title mb-0">标本编号管理</h3>
        </div>
        <p className="text-sm text-ocean-300 mb-4">
          为采集的实物样本生成唯一编号（站位缩写-日期-序号），记录保存方式与存放位置，支持按编号或站名检索，可导出标签列表用于打印。
        </p>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ocean-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索编号、站名、存放位置、物种..."
              className="input-field pl-10"
            />
          </div>
          <button onClick={handleOpenNew} className="btn-primary">
            <Plus className="w-5 h-5" />
            新增标本
          </button>
          <button
            onClick={handlePrintSelected}
            disabled={filtered.length === 0}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-5 h-5" />
            {selectedSpecimens.length > 0
              ? `打印选中 (${selectedSpecimens.length})`
              : "打印标签"}
          </button>
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="card-glass p-3 flex items-center justify-between gap-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selectedIds.size === filtered.length && filtered.length > 0}
              onChange={selectAll}
              className="w-4 h-4 rounded accent-reef-500"
            />
            <span className="text-sm text-ocean-200">
              全选
            </span>
          </label>
          <div className="text-sm text-ocean-300">
            共 <span className="font-semibold text-reef-300">{filtered.length}</span> 条
            {selectedSpecimens.length > 0 && (
              <span className="ml-2">
                已选 <span className="font-semibold text-reef-300">{selectedSpecimens.length}</span> 条
              </span>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="card-glass p-10 text-center">
            <Tag className="w-12 h-12 text-ocean-600 mx-auto mb-3" />
            <p className="text-ocean-300">
              {query ? "未找到匹配的标本记录" : "暂无标本记录"}
            </p>
            <p className="text-xs text-ocean-400 mt-1">
              {query ? "尝试修改搜索条件" : "点击「新增标本」开始创建"}
            </p>
          </div>
        ) : (
          filtered.map((s) => (
            <div
              key={s.id}
              className={cn(
                "card-glass p-4 flex items-start gap-3 transition-all",
                selectedIds.has(s.id) && "ring-2 ring-reef-500/60"
              )}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(s.id)}
                onChange={() => toggleSelect(s.id)}
                className="mt-1.5 w-4 h-4 rounded accent-reef-500 flex-shrink-0"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="font-mono font-bold text-reef-300 text-lg">
                    {s.specimenNo}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border",
                      PRESERVATION_COLORS[s.preservation]
                    )}
                  >
                    {PRESERVATION_ICONS[s.preservation]}
                    {PRESERVATION_LABEL[s.preservation]}
                  </span>
                  <span className="text-xs text-ocean-400 ml-auto">
                    {s.date}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <div className="flex items-center gap-1.5 text-ocean-200">
                    <MapPin className="w-3.5 h-3.5 text-ocean-400 flex-shrink-0" />
                    <span>{s.location}</span>
                  </div>
                  {s.speciesName && (
                    <div className="text-ocean-300">
                      物种：<span className="text-ocean-100">{s.speciesName}</span>
                    </div>
                  )}
                  <div className="text-ocean-400">
                    站位：{s.stationAbbr}
                  </div>
                </div>

                {s.notes && (
                  <p className="text-xs text-ocean-400 mt-2 line-clamp-1">
                    备注：{s.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleEdit(s)}
                  className="p-2 rounded-lg text-ocean-400 hover:bg-ocean-700/40 hover:text-white transition-colors"
                  title="编辑"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  className="p-2 rounded-lg text-ocean-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <SpecimenForm specimen={editing} onClose={() => setShowForm(false)} />
      )}

      {showLabels && (
        <LabelPrintPreview
          specimens={printSpecimens}
          onClose={() => setShowLabels(false)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-glass w-full max-w-md p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-ocean-100 text-lg">确认删除</h3>
                <p className="text-sm text-ocean-300 mt-1">
                  确定要删除标本{" "}
                  <span className="font-mono font-bold text-reef-300">
                    {confirmDelete.specimenNo}
                  </span>{" "}
                  吗？此操作无法撤销。
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-ghost text-sm"
              >
                取消
              </button>
              <button onClick={confirmDeleteSpecimen} className="btn-danger text-sm">
                <Trash2 className="w-4 h-4" />
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
