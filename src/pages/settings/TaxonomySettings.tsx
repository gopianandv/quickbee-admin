import { useEffect, useMemo, useState } from "react";
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
import { useSearchParams } from "react-router-dom";

type TTab = "categories" | "skills" | "tags";
type ActiveFilter = "all" | "active" | "inactive";

const subTabBtn = (active: boolean) => ({
  padding: "7px 10px",
  borderRadius: 10,
  border: "1px solid #e5e5e5",
  background: active ? "#f2f2f2" : "#fff",
  cursor: "pointer",
  fontWeight: active ? 800 : 600,
});

function parseActiveFilter(v: string | null): ActiveFilter {
  if (v === "active" || v === "inactive") return v;
  return "all";
}

function toIsActiveParam(f: ActiveFilter): boolean | undefined {
  if (f === "active") return true;
  if (f === "inactive") return false;
  return undefined;
}

export default function TaxonomySettings() {
  const [sp, setSp] = useSearchParams();
  const ttab = (sp.get("ttab") as TTab) || "categories";

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>(parseActiveFilter(sp.get("active")));

  // data
  const [loading, setLoading] = useState(false);
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [skills, setSkills] = useState<AdminSkill[]>([]);
  const [tags, setTags] = useState<AdminTag[]>([]);

  // create forms
  const [newName, setNewName] = useState("");
  const [newOrder, setNewOrder] = useState("0");
  const [newIcon, setNewIcon] = useState(""); // category icon
  const [newEmoji, setNewEmoji] = useState(""); // tag emoji
  const [newSlug, setNewSlug] = useState(""); // tag slug
  const [newSkillCategoryId, setNewSkillCategoryId] = useState("");

  const catOptions = useMemo(
    () => cats.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [cats]
  );

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
      if (q.trim()) next.set("q", q.trim());
      else next.delete("q");

      if (activeFilter !== "all") next.set("active", activeFilter);
      else next.delete("active");

      // keep on taxonomy tab
      next.set("tab", "taxonomy");
      return next;
    });
  }

  async function load() {
    setLoading(true);
    try {
      const isActive = toIsActiveParam(activeFilter);
      const query = q.trim() || undefined;

      if (ttab === "categories") {
        const data = await adminListCategories({ page: 1, pageSize: 200, q: query, isActive });
        setCats(data.data);
      } else if (ttab === "skills") {
        // ensure categories for dropdown
        const [cdata, sdata] = await Promise.all([
          adminListCategories({ page: 1, pageSize: 500, q: undefined, isActive: true }),
          adminListSkills({ page: 1, pageSize: 500, q: query, isActive }),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttab, activeFilter, q]);

  async function createRow() {
    const name = newName.trim();
    const order = Number(newOrder) || 0;

    if (!name) {
      alert("Name is required");
      return;
    }

    if (ttab === "categories") {
      await adminCreateCategory({ name, order, icon: newIcon.trim() || null, isActive: true });
    } else if (ttab === "skills") {
      if (!newSkillCategoryId) {
        alert("Choose a category for the skill");
        return;
      }
      await adminCreateSkill({ name, categoryId: newSkillCategoryId, order, isActive: true });
    } else {
      await adminCreateTag({
        name,
        order,
        slug: newSlug.trim() || null,
        emoji: newEmoji.trim() || null,
        isActive: true,
      });
    }

    setNewName("");
    setNewOrder("0");
    setNewIcon("");
    setNewEmoji("");
    setNewSlug("");
    setNewSkillCategoryId("");
    await load();
  }

  return (
    <div style={{ padding: 0, fontFamily: "system-ui" }}>
      {/* sub tabs */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button style={subTabBtn(ttab === "categories")} onClick={() => setTtab("categories")}>
          Categories
        </button>
        <button style={subTabBtn(ttab === "skills")} onClick={() => setTtab("skills")}>
          Skills
        </button>
        <button style={subTabBtn(ttab === "tags")} onClick={() => setTtab("tags")}>
          Tags
        </button>
      </div>

      {/* Filters */}
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 220px 140px", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Search</div>
          <input value={q} onChange={(e) => setQ(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Status</div>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
            style={{ width: "100%", padding: 8 }}
          >
            <option value="all">All</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "end" }}>
          <button onClick={applyFiltersToUrl} style={{ width: "100%", padding: "9px 12px" }}>
            Apply
          </button>
        </div>
      </div>

      {/* Create */}
      <div style={{ marginTop: 12, border: "1px solid #e5e5e5", borderRadius: 10, padding: 12, background: "#fff" }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Create new {ttab.slice(0, -1)}</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 1fr 140px", gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Name</div>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} style={{ width: "100%", padding: 8 }} />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Order</div>
            <input value={newOrder} onChange={(e) => setNewOrder(e.target.value)} style={{ width: "100%", padding: 8 }} />
          </div>

          {ttab === "categories" ? (
            <div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Icon (Ionicon key)</div>
              <input value={newIcon} onChange={(e) => setNewIcon(e.target.value)} placeholder="e.g. hammer-outline" style={{ width: "100%", padding: 8 }} />
            </div>
          ) : ttab === "skills" ? (
            <div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Category</div>
              <select
                value={newSkillCategoryId}
                onChange={(e) => setNewSkillCategoryId(e.target.value)}
                style={{ width: "100%", padding: 8 }}
              >
                <option value="">Select category…</option>
                {catOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Emoji</div>
                <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} placeholder="e.g. 🧹" style={{ width: "100%", padding: 8 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Slug</div>
                <input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="e.g. cleaning" style={{ width: "100%", padding: 8 }} />
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "end" }}>
            <button onClick={createRow} style={{ width: "100%", padding: "9px 12px" }}>
              Create
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{ marginTop: 12, border: "1px solid #e5e5e5", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
        <div style={{ padding: "10px 12px", background: "#fafafa", fontWeight: 800 }}>
          {ttab === "categories" ? "Categories" : ttab === "skills" ? "Skills" : "Tags"}
          {loading ? <span style={{ marginLeft: 10, opacity: 0.7, fontWeight: 600 }}>Loading…</span> : null}
        </div>

        {ttab === "categories" ? (
          <CategoryTable rows={cats} onPatch={async (id, patch) => { await adminUpdateCategory(id, patch); await load(); }} />
        ) : ttab === "skills" ? (
          <SkillTable
            rows={skills}
            categories={cats}
            onPatch={async (id, patch) => { await adminUpdateSkill(id, patch); await load(); }}
          />
        ) : (
          <TagTable rows={tags} onPatch={async (id, patch) => { await adminUpdateTag(id, patch); await load(); }} />
        )}
      </div>
    </div>
  );
}

function cellInputStyle() {
  return { width: "100%", padding: 7, border: "1px solid #e5e5e5", borderRadius: 8 };
}

function CategoryTable(props: {
  rows: AdminCategory[];
  onPatch: (id: string, patch: Partial<AdminCategory>) => Promise<void>;
}) {
  const { rows, onPatch } = props;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 220px 120px 120px", padding: "10px 12px", fontWeight: 700, borderTop: "1px solid #eee" }}>
        <div>Name</div>
        <div>Icon</div>
        <div>Order</div>
        <div>Active</div>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 12, opacity: 0.7 }}>No results.</div>
      ) : (
        rows.map((r) => (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 220px 120px 120px", padding: "10px 12px", borderTop: "1px solid #eee", alignItems: "center" }}>
            <input
              defaultValue={r.name}
              style={cellInputStyle()}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== r.name) onPatch(r.id, { name: v });
              }}
            />
            <input
              defaultValue={r.icon ?? ""}
              style={cellInputStyle()}
              onBlur={(e) => {
                const v = e.target.value.trim();
                const next = v ? v : null;
                if (next !== (r.icon ?? null)) onPatch(r.id, { icon: next } as any);
              }}
            />
            <input
              defaultValue={String(r.order ?? 0)}
              style={cellInputStyle()}
              onBlur={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n !== r.order) onPatch(r.id, { order: n } as any);
              }}
            />
            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={r.isActive}
                onChange={(e) => onPatch(r.id, { isActive: e.target.checked } as any)}
              />
              {r.isActive ? "Active" : "Inactive"}
            </label>
          </div>
        ))
      )}
    </div>
  );
}

function SkillTable(props: {
  rows: AdminSkill[];
  categories: AdminCategory[];
  onPatch: (id: string, patch: Partial<AdminSkill>) => Promise<void>;
}) {
  const { rows, categories, onPatch } = props;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px 120px 120px", padding: "10px 12px", fontWeight: 700, borderTop: "1px solid #eee" }}>
        <div>Name</div>
        <div>Category</div>
        <div>Order</div>
        <div>Active</div>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 12, opacity: 0.7 }}>No results.</div>
      ) : (
        rows.map((r) => (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 260px 120px 120px", padding: "10px 12px", borderTop: "1px solid #eee", alignItems: "center" }}>
            <input
              defaultValue={r.name}
              style={cellInputStyle()}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== r.name) onPatch(r.id, { name: v } as any);
              }}
            />

            <select
              value={r.categoryId}
              onChange={(e) => onPatch(r.id, { categoryId: e.target.value } as any)}
              style={{ width: "100%", padding: 7, border: "1px solid #e5e5e5", borderRadius: 8 }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <input
              defaultValue={String(r.order ?? 0)}
              style={cellInputStyle()}
              onBlur={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n !== r.order) onPatch(r.id, { order: n } as any);
              }}
            />

            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={r.isActive}
                onChange={(e) => onPatch(r.id, { isActive: e.target.checked } as any)}
              />
              {r.isActive ? "Active" : "Inactive"}
            </label>
          </div>
        ))
      )}
    </div>
  );
}

function TagTable(props: {
  rows: AdminTag[];
  onPatch: (id: string, patch: Partial<AdminTag>) => Promise<void>;
}) {
  const { rows, onPatch } = props;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 220px 220px 120px 120px", padding: "10px 12px", fontWeight: 700, borderTop: "1px solid #eee" }}>
        <div>Name</div>
        <div>Emoji</div>
        <div>Slug</div>
        <div>Order</div>
        <div>Active</div>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 12, opacity: 0.7 }}>No results.</div>
      ) : (
        rows.map((r) => (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 220px 220px 120px 120px", padding: "10px 12px", borderTop: "1px solid #eee", alignItems: "center" }}>
            <input
              defaultValue={r.name}
              style={cellInputStyle()}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== r.name) onPatch(r.id, { name: v } as any);
              }}
            />
            <input
              defaultValue={r.emoji ?? ""}
              style={cellInputStyle()}
              onBlur={(e) => {
                const v = e.target.value.trim();
                const next = v ? v : null;
                if (next !== (r.emoji ?? null)) onPatch(r.id, { emoji: next } as any);
              }}
            />
            <input
              defaultValue={r.slug ?? ""}
              style={cellInputStyle()}
              onBlur={(e) => {
                const v = e.target.value.trim();
                const next = v ? v : null;
                if (next !== (r.slug ?? null)) onPatch(r.id, { slug: next } as any);
              }}
            />
            <input
              defaultValue={String(r.order ?? 0)}
              style={cellInputStyle()}
              onBlur={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n !== r.order) onPatch(r.id, { order: n } as any);
              }}
            />
            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={r.isActive}
                onChange={(e) => onPatch(r.id, { isActive: e.target.checked } as any)}
              />
              {r.isActive ? "Active" : "Inactive"}
            </label>
          </div>
        ))
      )}
    </div>
  );
}
