import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Plus } from "lucide-react";
import {
  adminCreateCategory,
  adminCreateSkill,
  adminCreateTag,
  adminListCategories,
  adminListSkills,
  adminListTags,
  adminUpdateCategory,
  adminUpdateSkill,
  adminUpdateTag,
  type AdminCategory,
  type AdminSkill,
  type AdminTag,
} from "@/api/adminTaxonomyApi";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

type TTab = "categories" | "skills" | "tags";
type ActiveFilter = "all" | "active" | "inactive";
type SkillsView = "flat" | "grouped";

const selectCls =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30";
const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30";
const cellInput =
  "w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30";

function parseActiveFilter(v: string | null): ActiveFilter {
  if (v === "active" || v === "inactive") return v;
  return "all";
}

function toIsActiveParam(f: ActiveFilter): boolean | undefined {
  if (f === "active")   return true;
  if (f === "inactive") return false;
  return undefined;
}

export default function TaxonomySettings() {
  const [sp, setSp] = useSearchParams();
  const ttab = (sp.get("ttab") as TTab) || "categories";

  const [skillCategoryId, setSkillCategoryId] = useState(sp.get("catId") ?? "");
  const [skillsView,      setSkillsView]      = useState<SkillsView>((sp.get("view") as SkillsView) || "flat");
  const [q,               setQ]               = useState(sp.get("q")      ?? "");
  const [activeFilter,    setActiveFilter]    = useState<ActiveFilter>(parseActiveFilter(sp.get("active")));

  const [loading, setLoading] = useState(false);
  const [cats,    setCats]    = useState<AdminCategory[]>([]);
  const [skills,  setSkills]  = useState<AdminSkill[]>([]);
  const [tags,    setTags]    = useState<AdminTag[]>([]);

  // Create form
  const [newName,            setNewName]            = useState("");
  const [newOrder,           setNewOrder]           = useState("0");
  const [newIcon,            setNewIcon]            = useState("");
  const [newEmoji,           setNewEmoji]           = useState("");
  const [newSlug,            setNewSlug]            = useState("");
  const [newSkillCategoryId, setNewSkillCategoryId] = useState("");

  const catOptions = useMemo(() => cats.slice().sort((a, b) => a.name.localeCompare(b.name)), [cats]);

  function setTtab(nextTab: TTab) {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("ttab", nextTab);
      return next;
    });
  }

  function applyFiltersToUrl() {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      if (q.trim()) next.set("q", q.trim()); else next.delete("q");
      if (activeFilter !== "all") next.set("active", activeFilter); else next.delete("active");
      next.set("tab", "taxonomy");
      if (ttab === "skills") {
        if (skillCategoryId) next.set("catId", skillCategoryId); else next.delete("catId");
        if (skillsView !== "flat") next.set("view", skillsView); else next.delete("view");
      } else {
        next.delete("catId"); next.delete("view");
      }
      return next;
    });
  }

  async function load() {
    setLoading(true);
    try {
      const isActive = toIsActiveParam(activeFilter);
      const query    = q.trim() || undefined;

      if (ttab === "categories") {
        const data = await adminListCategories({ page: 1, pageSize: 200, q: query, isActive });
        setCats(data.data);
      } else if (ttab === "skills") {
        const [cdata, sdata] = await Promise.all([
          adminListCategories({ page: 1, pageSize: 500, q: undefined, isActive: true }),
          adminListSkills({ page: 1, pageSize: 500, q: query, isActive, categoryId: skillCategoryId || undefined }),
        ]);
        setCats(cdata.data);
        setSkills(sdata.data);
      } else {
        const data = await adminListTags({ page: 1, pageSize: 500, q: query, isActive });
        setTags(data.data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setQ(sp.get("q") ?? "");
    setActiveFilter(parseActiveFilter(sp.get("active")));
    setSkillCategoryId(sp.get("catId") ?? "");
    setSkillsView(((sp.get("view") as SkillsView) || "flat"));
  }, [sp.toString()]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [ttab, activeFilter, q, skillCategoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function createRow() {
    const name  = newName.trim();
    const order = Number(newOrder) || 0;
    if (!name) { alert("Name is required"); return; }

    if (ttab === "categories") {
      await adminCreateCategory({ name, order, icon: newIcon.trim() || null, isActive: true });
    } else if (ttab === "skills") {
      if (!newSkillCategoryId) { alert("Choose a category for the skill"); return; }
      await adminCreateSkill({ name, categoryId: newSkillCategoryId, order, isActive: true });
    } else {
      await adminCreateTag({ name, order, slug: newSlug.trim() || null, emoji: newEmoji.trim() || null, isActive: true });
    }
    setNewName(""); setNewOrder("0"); setNewIcon(""); setNewEmoji(""); setNewSlug(""); setNewSkillCategoryId("");
    await load();
  }

  const tabCount = ttab === "categories" ? cats.length : ttab === "skills" ? skills.length : tags.length;

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm w-fit">
        {(["categories", "skills", "tags"] as TTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTtab(t)}
            className={[
              "rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition-colors",
              ttab === t ? "bg-surface text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFiltersToUrl()}
              placeholder={`Search ${ttab}…`}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Status</label>
          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)} className={selectCls}>
            <option value="all">All</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>

        {ttab === "skills" && (
          <>
            <div className="flex flex-col gap-1 min-w-[180px]">
              <label className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Category</label>
              <select value={skillCategoryId} onChange={(e) => setSkillCategoryId(e.target.value)} className={selectCls}>
                <option value="">All categories</option>
                {catOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1 min-w-[140px]">
              <label className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">View</label>
              <select value={skillsView} onChange={(e) => setSkillsView(e.target.value as SkillsView)} className={selectCls}>
                <option value="flat">Flat list</option>
                <option value="grouped">Grouped by category</option>
              </select>
            </div>
          </>
        )}

        <div className="flex items-center gap-2 pb-0.5">
          <Button variant="primary" size="md" onClick={applyFiltersToUrl} disabled={loading}>
            <Search className="h-3.5 w-3.5" /> Apply
          </Button>
        </div>

        <div className="ml-auto">
          <Badge variant="default" className="text-sm px-3 py-1">
            {loading ? "Loading…" : `${tabCount} ${ttab}`}
          </Badge>
        </div>
      </div>

      {/* Create */}
      <Card>
        <CardHeader>
          <Plus className="h-4 w-4 text-gray-400" />
          Create new {ttab.slice(0, -1)}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
              <label className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Name *</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Enter name…" className={inputCls} />
            </div>

            <div className="flex flex-col gap-1 w-[100px]">
              <label className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Order</label>
              <input value={newOrder} onChange={(e) => setNewOrder(e.target.value)} className={inputCls} />
            </div>

            {ttab === "categories" && (
              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <label className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Icon (Ionicon key)</label>
                <input value={newIcon} onChange={(e) => setNewIcon(e.target.value)} placeholder="e.g. hammer-outline" className={inputCls} />
              </div>
            )}

            {ttab === "skills" && (
              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <label className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Category *</label>
                <select value={newSkillCategoryId} onChange={(e) => setNewSkillCategoryId(e.target.value)} className={selectCls}>
                  <option value="">Select category…</option>
                  {catOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {ttab === "tags" && (
              <>
                <div className="flex flex-col gap-1 w-[100px]">
                  <label className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Emoji</label>
                  <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} placeholder="🧹" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                  <label className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Slug</label>
                  <input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="e.g. cleaning" className={inputCls} />
                </div>
              </>
            )}

            <Button variant="primary" size="md" onClick={createRow} className="mb-0.5">
              <Plus className="h-3.5 w-3.5" /> Create
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-5 py-3">
          <span className="text-sm font-semibold text-gray-700 capitalize">{ttab}</span>
          {loading && <span className="text-xs text-gray-400">Loading…</span>}
        </div>

        {ttab === "categories" && (
          <CategoryTable
            rows={cats}
            onPatch={async (id, patch) => { await adminUpdateCategory(id, patch); await load(); }}
            cellInput={cellInput}
          />
        )}

        {ttab === "skills" && skillsView === "grouped" && (
          <SkillsGroupedByCategory
            rows={skills}
            categories={cats}
            onPatch={async (id, patch) => { await adminUpdateSkill(id, patch); await load(); }}
            cellInput={cellInput}
          />
        )}

        {ttab === "skills" && skillsView === "flat" && (
          <SkillTable
            rows={skills}
            categories={cats}
            onPatch={async (id, patch) => { await adminUpdateSkill(id, patch); await load(); }}
            cellInput={cellInput}
          />
        )}

        {ttab === "tags" && (
          <TagTable
            rows={tags}
            onPatch={async (id, patch) => { await adminUpdateTag(id, patch); await load(); }}
            cellInput={cellInput}
          />
        )}
      </div>
    </div>
  );
}

/* ─── CategoryTable ─────────────────────────────────────────────── */
function CategoryTable({ rows, onPatch, cellInput }: {
  rows: AdminCategory[];
  onPatch: (id: string, patch: Partial<AdminCategory>) => Promise<void>;
  cellInput: string;
}) {
  if (rows.length === 0) return <p className="px-5 py-4 text-sm text-gray-400">No results.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/40 text-xs uppercase tracking-wide text-gray-400">
            <th className="px-4 py-2.5 text-left font-semibold">Name</th>
            <th className="px-4 py-2.5 text-left font-semibold w-[120px]">Skills</th>
            <th className="px-4 py-2.5 text-left font-semibold w-[200px]">Icon</th>
            <th className="px-4 py-2.5 text-left font-semibold w-[100px]">Order</th>
            <th className="px-4 py-2.5 text-left font-semibold w-[120px]">Active</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50">
              <td className="px-4 py-2">
                <input
                  defaultValue={r.name}
                  className={cellInput}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== r.name) onPatch(r.id, { name: v }); }}
                />
              </td>
              <td className="px-4 py-2 font-bold text-gray-700">
                {typeof r.skillsCount === "number" ? r.skillsCount : "—"}
                {typeof r.activeSkillsCount === "number" && (
                  <span className="ml-1.5 text-xs text-gray-400 font-normal">(active {r.activeSkillsCount})</span>
                )}
              </td>
              <td className="px-4 py-2">
                <input
                  defaultValue={r.icon ?? ""}
                  className={cellInput}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    const next = v ? v : null;
                    if (next !== (r.icon ?? null)) onPatch(r.id, { icon: next } as any);
                  }}
                />
              </td>
              <td className="px-4 py-2">
                <input
                  defaultValue={String(r.order ?? 0)}
                  className={cellInput}
                  onBlur={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n !== r.order) onPatch(r.id, { order: n } as any);
                  }}
                />
              </td>
              <td className="px-4 py-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={r.isActive}
                    onChange={(e) => {
                      const next = e.target.checked;
                      if (!next) {
                        const count = r.skillsCount ?? 0;
                        if (count > 0) {
                          const ok = confirm(`This category still has ${count} skill(s).\n\nIf you disable it, those skills will remain but the category may be hidden.\n\nDisable anyway?`);
                          if (!ok) return;
                        }
                      }
                      onPatch(r.id, { isActive: next } as any);
                    }}
                    className="rounded border-gray-300 text-brand"
                  />
                  <span className={r.isActive ? "text-green-600 font-semibold" : "text-gray-400"}>
                    {r.isActive ? "Active" : "Inactive"}
                  </span>
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── SkillTable ─────────────────────────────────────────────────── */
function SkillTable({ rows, categories, onPatch, cellInput }: {
  rows: AdminSkill[];
  categories: AdminCategory[];
  onPatch: (id: string, patch: Partial<AdminSkill>) => Promise<void>;
  cellInput: string;
}) {
  if (rows.length === 0) return <p className="px-5 py-4 text-sm text-gray-400">No results.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/40 text-xs uppercase tracking-wide text-gray-400">
            <th className="px-4 py-2.5 text-left font-semibold">Name</th>
            <th className="px-4 py-2.5 text-left font-semibold w-[120px]">Tasks</th>
            <th className="px-4 py-2.5 text-left font-semibold w-[220px]">Category</th>
            <th className="px-4 py-2.5 text-left font-semibold w-[100px]">Order</th>
            <th className="px-4 py-2.5 text-left font-semibold w-[120px]">Active</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50">
              <td className="px-4 py-2">
                <input
                  defaultValue={r.name}
                  className={cellInput}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== r.name) onPatch(r.id, { name: v } as any); }}
                />
              </td>
              <td className="px-4 py-2 font-bold text-gray-700">
                {typeof (r as any).tasksCount === "number" ? (r as any).tasksCount : "—"}
                {typeof (r as any).openTasksCount === "number" && (
                  <span className="ml-1.5 text-xs text-gray-400 font-normal">(open {(r as any).openTasksCount})</span>
                )}
                {(r as any).openTasksCount > 0 && (
                  <div className="mt-1">
                    <Link to={`/admin/tasks?open=1&skillId=${r.id}`} className="text-xs text-blue-600 hover:underline">
                      View open tasks
                    </Link>
                  </div>
                )}
              </td>
              <td className="px-4 py-2">
                <select
                  value={r.categoryId}
                  onChange={(e) => onPatch(r.id, { categoryId: e.target.value } as any)}
                  className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
                >
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </td>
              <td className="px-4 py-2">
                <input
                  defaultValue={String(r.order ?? 0)}
                  className={cellInput}
                  onBlur={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n !== r.order) onPatch(r.id, { order: n } as any);
                  }}
                />
              </td>
              <td className="px-4 py-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={r.isActive}
                    onChange={(e) => {
                      const next = e.target.checked;
                      if (!next) {
                        const open = (r as any).openTasksCount ?? 0;
                        if (open > 0) {
                          const ok = confirm(`This skill is used by ${open} open task(s).\n\nDisabling may hide it in selection screens. Disable anyway?`);
                          if (!ok) return;
                        }
                      }
                      onPatch(r.id, { isActive: next } as any);
                    }}
                    className="rounded border-gray-300 text-brand"
                  />
                  <span className={r.isActive ? "text-green-600 font-semibold" : "text-gray-400"}>
                    {r.isActive ? "Active" : "Inactive"}
                  </span>
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── SkillsGroupedByCategory ────────────────────────────────────── */
function SkillsGroupedByCategory({ rows, categories, onPatch, cellInput }: {
  rows: AdminSkill[];
  categories: AdminCategory[];
  onPatch: (id: string, patch: Partial<AdminSkill>) => Promise<void>;
  cellInput: string;
}) {
  const catMap  = new Map(categories.map((c) => [c.id, c]));
  const grouped = new Map<string, AdminSkill[]>();
  for (const s of rows) {
    const k = s.categoryId || "__none__";
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(s);
  }

  const orderedCatIds = Array.from(grouped.keys()).sort((a, b) => {
    if (a === "__none__") return 1;
    if (b === "__none__") return -1;
    const an = catMap.get(a)?.name ?? "";
    const bn = catMap.get(b)?.name ?? "";
    return an.localeCompare(bn);
  });

  return (
    <div>
      {orderedCatIds.map((catId) => {
        const title = catId === "__none__" ? "Unassigned" : (catMap.get(catId)?.name ?? "Unknown Category");
        const list  = grouped.get(catId) ?? [];
        return (
          <div key={catId} className="border-t border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50/60 px-5 py-2.5">
              <span className="text-sm font-bold text-gray-700">{title}</span>
              <span className="text-xs text-gray-400">({list.length})</span>
            </div>
            <SkillTable rows={list} categories={categories} onPatch={onPatch} cellInput={cellInput} />
          </div>
        );
      })}
    </div>
  );
}

/* ─── TagTable ───────────────────────────────────────────────────── */
function TagTable({ rows, onPatch, cellInput }: {
  rows: AdminTag[];
  onPatch: (id: string, patch: Partial<AdminTag>) => Promise<void>;
  cellInput: string;
}) {
  if (rows.length === 0) return <p className="px-5 py-4 text-sm text-gray-400">No results.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/40 text-xs uppercase tracking-wide text-gray-400">
            <th className="px-4 py-2.5 text-left font-semibold">Name</th>
            <th className="px-4 py-2.5 text-left font-semibold w-[120px]">Emoji</th>
            <th className="px-4 py-2.5 text-left font-semibold w-[180px]">Slug</th>
            <th className="px-4 py-2.5 text-left font-semibold w-[100px]">Order</th>
            <th className="px-4 py-2.5 text-left font-semibold w-[120px]">Active</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50">
              <td className="px-4 py-2">
                <input
                  defaultValue={r.name}
                  className={cellInput}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== r.name) onPatch(r.id, { name: v } as any); }}
                />
              </td>
              <td className="px-4 py-2">
                <input
                  defaultValue={r.emoji ?? ""}
                  className={cellInput}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    const next = v ? v : null;
                    if (next !== (r.emoji ?? null)) onPatch(r.id, { emoji: next } as any);
                  }}
                />
              </td>
              <td className="px-4 py-2">
                <input
                  defaultValue={r.slug ?? ""}
                  className={cellInput}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    const next = v ? v : null;
                    if (next !== (r.slug ?? null)) onPatch(r.id, { slug: next } as any);
                  }}
                />
              </td>
              <td className="px-4 py-2">
                <input
                  defaultValue={String(r.order ?? 0)}
                  className={cellInput}
                  onBlur={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n !== r.order) onPatch(r.id, { order: n } as any);
                  }}
                />
              </td>
              <td className="px-4 py-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={r.isActive}
                    onChange={(e) => onPatch(r.id, { isActive: e.target.checked } as any)}
                    className="rounded border-gray-300 text-brand"
                  />
                  <span className={r.isActive ? "text-green-600 font-semibold" : "text-gray-400"}>
                    {r.isActive ? "Active" : "Inactive"}
                  </span>
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
