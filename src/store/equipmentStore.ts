import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EquipmentItem, EquipmentTemplate } from "@/types";

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_TEMPLATES: EquipmentTemplate[] = [
  {
    id: generateId("eq-tpl"),
    name: "岩礁套装",
    description: "适用于岩礁潮间带采样",
    items: [
      { id: generateId("eq"), name: "样方框 (0.5m×0.5m)", category: "采样工具", quantity: 2, prepared: false, packed: false },
      { id: generateId("eq"), name: "铁锤", category: "采样工具", quantity: 1, prepared: false, packed: false },
      { id: generateId("eq"), name: "凿子", category: "采样工具", quantity: 2, prepared: false, packed: false },
      { id: generateId("eq"), name: "刮铲", category: "采样工具", quantity: 2, prepared: false, packed: false },
      { id: generateId("eq"), name: "卷尺", category: "测量工具", quantity: 2, prepared: false, packed: false },
      { id: generateId("eq"), name: "防水记录本", category: "记录用品", quantity: 2, prepared: false, packed: false },
      { id: generateId("eq"), name: "标本瓶 (50ml)", category: "标本容器", quantity: 20, prepared: false, packed: false },
      { id: generateId("eq"), name: "防滑水靴", category: "个人装备", quantity: 1, prepared: false, packed: false },
      { id: generateId("eq"), name: "手套", category: "个人装备", quantity: 3, prepared: false, packed: false },
      { id: generateId("eq"), name: "太阳镜", category: "个人装备", quantity: 1, prepared: false, packed: false },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: generateId("eq-tpl"),
    name: "泥滩套装",
    description: "适用于泥滩/沙滩潮间带采样",
    items: [
      { id: generateId("eq"), name: "样方框 (0.5m×0.5m)", category: "采样工具", quantity: 2, prepared: false, packed: false },
      { id: generateId("eq"), name: "取泥器", category: "采样工具", quantity: 2, prepared: false, packed: false },
      { id: generateId("eq"), name: "手筛 (1mm/0.5mm)", category: "采样工具", quantity: 2, prepared: false, packed: false },
      { id: generateId("eq"), name: "铁锹", category: "采样工具", quantity: 1, prepared: false, packed: false },
      { id: generateId("eq"), name: "卷尺", category: "测量工具", quantity: 2, prepared: false, packed: false },
      { id: generateId("eq"), name: "防水记录本", category: "记录用品", quantity: 2, prepared: false, packed: false },
      { id: generateId("eq"), name: "标本瓶 (50ml)", category: "标本容器", quantity: 20, prepared: false, packed: false },
      { id: generateId("eq"), name: "雨靴 (高筒)", category: "个人装备", quantity: 1, prepared: false, packed: false },
      { id: generateId("eq"), name: "手套", category: "个人装备", quantity: 3, prepared: false, packed: false },
      { id: generateId("eq"), name: "防晒帽", category: "个人装备", quantity: 1, prepared: false, packed: false },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

interface EquipmentState {
  templates: EquipmentTemplate[];
  activeTemplateId: string | null;
  createTemplate: (name: string, description?: string) => void;
  renameTemplate: (id: string, name: string) => void;
  deleteTemplate: (id: string) => void;
  setActiveTemplate: (id: string | null) => void;
  addItem: (templateId: string, name: string, category?: string, quantity?: number) => void;
  updateItem: (templateId: string, itemId: string, updates: Partial<EquipmentItem>) => void;
  removeItem: (templateId: string, itemId: string) => void;
  togglePrepared: (templateId: string, itemId: string) => void;
  togglePacked: (templateId: string, itemId: string) => void;
  resetAllStatus: (templateId: string) => void;
  getIncompleteCount: (templateId: string) => { notPrepared: number; notPacked: number; total: number };
  getTotalIncompleteCount: () => number;
}

export const useEquipmentStore = create<EquipmentState>()(
  persist(
    (set, get) => ({
      templates: DEFAULT_TEMPLATES,
      activeTemplateId: null,
      createTemplate: (name, description) =>
        set((state) => ({
          templates: [
            {
              id: generateId("eq-tpl"),
              name,
              description,
              items: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            ...state.templates,
          ],
        })),
      renameTemplate: (id, name) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, name, updatedAt: Date.now() } : t
          ),
        })),
      deleteTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
          activeTemplateId: state.activeTemplateId === id ? null : state.activeTemplateId,
        })),
      setActiveTemplate: (id) => set({ activeTemplateId: id }),
      addItem: (templateId, name, category, quantity) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === templateId
              ? {
                  ...t,
                  items: [
                    ...t.items,
                    {
                      id: generateId("eq"),
                      name,
                      category,
                      quantity,
                      prepared: false,
                      packed: false,
                    },
                  ],
                  updatedAt: Date.now(),
                }
              : t
          ),
        })),
      updateItem: (templateId, itemId, updates) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === templateId
              ? {
                  ...t,
                  items: t.items.map((item) =>
                    item.id === itemId ? { ...item, ...updates } : item
                  ),
                  updatedAt: Date.now(),
                }
              : t
          ),
        })),
      removeItem: (templateId, itemId) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === templateId
              ? { ...t, items: t.items.filter((i) => i.id !== itemId), updatedAt: Date.now() }
              : t
          ),
        })),
      togglePrepared: (templateId, itemId) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === templateId
              ? {
                  ...t,
                  items: t.items.map((item) =>
                    item.id === itemId ? { ...item, prepared: !item.prepared } : item
                  ),
                  updatedAt: Date.now(),
                }
              : t
          ),
        })),
      togglePacked: (templateId, itemId) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === templateId
              ? {
                  ...t,
                  items: t.items.map((item) =>
                    item.id === itemId ? { ...item, packed: !item.packed } : item
                  ),
                  updatedAt: Date.now(),
                }
              : t
          ),
        })),
      resetAllStatus: (templateId) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === templateId
              ? {
                  ...t,
                  items: t.items.map((item) => ({ ...item, prepared: false, packed: false })),
                  updatedAt: Date.now(),
                }
              : t
          ),
        })),
      getIncompleteCount: (templateId) => {
        const template = get().templates.find((t) => t.id === templateId);
        if (!template) return { notPrepared: 0, notPacked: 0, total: 0 };
        const notPrepared = template.items.filter((i) => !i.prepared).length;
        const notPacked = template.items.filter((i) => !i.packed).length;
        return { notPrepared, notPacked, total: template.items.length };
      },
      getTotalIncompleteCount: () => {
        const templates = get().templates;
        let count = 0;
        for (const t of templates) {
          count += t.items.filter((i) => !i.prepared || !i.packed).length;
        }
        return count;
      },
    }),
    {
      name: "intertidal-equipment-storage",
    }
  )
);
