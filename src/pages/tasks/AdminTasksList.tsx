import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminListTasks, type TaskListItem } from "@/api/adminTasks";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  adminListCategories,
  adminListSkills,
  type AdminCategory,
  type AdminSkill,
} from "@/api/adminTaxonomyApi";
import { adminExportTasks } from "@/api/adminTasks";

type StatusOption = { label: string; value: string };

function moneyRs(paise?: number | null) {
  const n = Number(paise ?? 0);
  return (n / 100).toFixed(2);
}

export default function AdminTasksList() {
  const pageSize = 20;
  const [sp, setSp] = useSearchParams();

  // ✅ URL is source of truth (applied filters)
  const appliedOpen = sp.get("open") === "1";
  const appliedStatus = sp.get("status") ?? "";
  const appliedSearch = sp.get("search") ?? "";
  const appliedCategoryId = sp.get("categoryId") ?? "";
  const appliedSkillId = sp.get("skillId") ?? "";
  const appliedPaymentMode = sp.get("paymentMode") ?? "";
  const appliedPostedByQuery = sp.get("postedByQuery") ?? "";
  const appliedAssignedToQuery = sp.get("assignedToQuery") ?? "";


  const page = Math.max(1, Number(sp.get("page") ?? "1"));

  // ✅ local draft inputs (what user is typing)
  const [status, setStatus] = useState<string>(appliedStatus);
  const [search, setSearch] = useState(appliedSearch);

  // taxonomy dropdown data
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [skills, setSkills] = useState<AdminSkill[]>([]);
  const [taxoLoading, setTaxoLoading] = useState(false);

  // tasks data
  const [items, setItems] = useState<TaskListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [paymentMode, setPaymentMode] = useState<string>(appliedPaymentMode);
  const [postedByQuery, setPostedByQuery] = useState<string>(appliedPostedByQuery);
  const [assignedToQuery, setAssignedToQuery] = useState<string>(appliedAssignedToQuery);



  // keep local inputs synced when URL changes (back/forward or drilldown clicks)
  useEffect(() => {
    setStatus(appliedStatus);
    setSearch(appliedSearch);
    setPaymentMode(appliedPaymentMode);
    setPostedByQuery(appliedPostedByQuery);
    setAssignedToQuery(appliedAssignedToQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedStatus, appliedSearch, appliedPaymentMode, appliedPostedByQuery, appliedAssignedToQuery]);


  // ✅ Canonical statuses
  const STATUS_OPTIONS: StatusOption[] = useMemo(
    () => [
      { label: "All statuses", value: "" },
      { label: "New", value: "NEW" },
      { label: "Accepted", value: "ACCEPTED" },
      { label: "In Progress", value: "IN_PROGRESS" },
      { label: "Pending Consumer Confirm", value: "PENDING_CONSUMER_CONFIRM" },
      { label: "Completed", value: "COMPLETED" },
      { label: "Cancelled", value: "CANCELLED" },
      { label: "Expired", value: "EXPIRED" },
    ],
    []
  );

  // ---------- Load taxonomy lists ----------
  async function loadTaxonomy() {
    setTaxoLoading(true);
    try {
      const [cdata, sdata] = await Promise.all([
        adminListCategories({ page: 1, pageSize: 500, q: undefined, isActive: true }),
        adminListSkills({
          page: 1,
          pageSize: 1000,
          q: undefined,
          isActive: true,
          categoryId: appliedCategoryId || undefined,
        }),
      ]);
      setCats(cdata.data || []);
      setSkills(sdata.data || []);
    } catch {
      // don't block tasks list if taxonomy fails
      setCats([]);
      setSkills([]);
    } finally {
      setTaxoLoading(false);
    }
  }

  async function onExportExcel() {
    try {
      const res = await adminExportTasks({
        status: appliedStatus || undefined,
        search: appliedSearch.trim() || undefined,
        categoryId: appliedCategoryId || undefined,
        skillId: appliedSkillId || undefined,
        postedById: appliedPostedByQuery || undefined,
        assignedToId: appliedAssignedToQuery || undefined,
        paymentMode: (appliedPaymentMode as any) || undefined,
        open: appliedOpen ? "1" : undefined,
        fromDate: sp.get("fromDate") ?? undefined,
        toDate: sp.get("toDate") ?? undefined,
      });

      // filename from header if provided
      const cd = res.headers?.["content-disposition"] || res.headers?.["Content-Disposition"];
      const match = typeof cd === "string" ? cd.match(/filename="?([^"]+)"?/i) : null;
      const filename = match?.[1] || `tasks_export_${new Date().toISOString().slice(0, 10)}.xlsx`;

      const blobUrl = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || "Export failed");
    }
  }


  // reload taxonomy when category filter changes (because skills should be filtered by category)
  useEffect(() => {
    loadTaxonomy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedCategoryId]);

  // ---------- Load tasks ----------
  async function loadFromUrl() {
    setLoading(true);
    setErr(null);
    try {
      const data = await adminListTasks({
        status: appliedStatus || undefined,
        search: appliedSearch.trim() || undefined,
        page,
        pageSize,

        categoryId: appliedCategoryId || undefined,
        skillId: appliedSkillId || undefined,
        open: appliedOpen ? "1" : undefined, // backend expects "1"

        paymentMode: (appliedPaymentMode as any) || undefined,
        postedByQuery: appliedPostedByQuery || undefined,
        assignedToQuery: appliedAssignedToQuery || undefined,
      } as any);

      setItems(data.items || []);
      setTotal(data.total || 0);
      setHasMore(!!data.hasMore);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  // reload whenever URL changes (filters/paging)
  useEffect(() => {
    loadFromUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  // ---------- URL helpers ----------
  function setUrlParam(key: string, value?: string | null) {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", "1");
      if (value && value.trim()) next.set(key, value.trim());
      else next.delete(key);
      return next;
    });
  }

  function applyFiltersToUrl(nextPage = 1) {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(nextPage));

      const sTrim = search.trim();
      if (sTrim) next.set("search", sTrim);
      else next.delete("search");

      if (status) next.set("status", status);
      else next.delete("status");

      const pm = paymentMode.trim();
      if (pm) next.set("paymentMode", pm);
      else next.delete("paymentMode");

      const u1 = postedByQuery.trim();
      if (u1) next.set("postedByQuery", u1);
      else next.delete("postedByQuery");

      const u2 = assignedToQuery.trim();
      if (u2) next.set("assignedToQuery", u2);
      else next.delete("assignedToQuery");



      // keep category/skill/open as-is (already in URL)
      return next;
    });
  }

  function toggleOpenOnly(nextOpen: boolean) {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", "1");

      if (nextOpen) {
        next.set("open", "1");
        next.delete("status"); // open overrides status
        setStatus("");
      } else {
        next.delete("open");
      }

      return next;
    });
  }

  function clearFilters() {
    setStatus("");
    setSearch("");
    setPaymentMode("");
    setPostedByQuery("");
    setAssignedToQuery("");


    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", "1");
      next.delete("status");
      next.delete("search");
      next.delete("categoryId");
      next.delete("skillId");
      next.delete("open");
      next.delete("paymentMode");
      next.delete("postedByQuery");
      next.delete("assignedToQuery");


      return next;
    });
  }

  function goToPage(p: number) {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(Math.max(1, p)));
      return next;
    });
  }

  const isFiltered = Boolean(appliedCategoryId || appliedSkillId || appliedOpen || appliedStatus || appliedSearch);

  const filteredSkills = useMemo(() => {
    // skills list already loaded by categoryId, so just sort nicely
    return skills.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [skills]);

  const sortedCats = useMemo(() => cats.slice().sort((a, b) => a.name.localeCompare(b.name)), [cats]);

  return (
    <div style={{ maxWidth: 1200, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ margin: 0 }}>Tasks</h2>
        {isFiltered ? <div style={{ fontSize: 12, opacity: 0.75 }}>Filters applied</div> : null}
      </div>

      {/* Filters row */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, marginBottom: 12, flexWrap: "wrap", rowGap: 10, }}>
        {/* Status */}
        <select
          value={status}
          onChange={(e) => {
            const v = e.target.value;
            setStatus(v);

            setSp((prev) => {
              const next = new URLSearchParams(prev);
              next.set("page", "1");
              if (v) next.set("status", v);
              else next.delete("status");

              // if user picks explicit status, clear open
              next.delete("open");
              return next;
            });
          }}
          style={{ padding: 8 }}
          disabled={appliedOpen}
          title={appliedOpen ? "Open-only is enabled. Turn it off to use Status filter." : undefined}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || "ALL"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Open only */}
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, userSelect: "none" }}>
          <input type="checkbox" checked={appliedOpen} onChange={(e) => toggleOpenOnly(e.target.checked)} />
          Open only
        </label>

        {/* Category */}
        <select
          value={appliedCategoryId}
          onChange={(e) => {
            const nextCatId = e.target.value;

            setSp((prev) => {
              const next = new URLSearchParams(prev);
              next.set("page", "1");

              if (nextCatId) next.set("categoryId", nextCatId);
              else next.delete("categoryId");

              // ✅ category change invalidates skill
              next.delete("skillId");

              return next;
            });
          }}
          style={{ padding: 8, minWidth: 220 }}
          disabled={taxoLoading}
        >
          <option value="">All categories</option>
          {sortedCats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Skill */}
        <select
          value={appliedSkillId}
          onChange={(e) => setUrlParam("skillId", e.target.value || "")}
          style={{ padding: 8, minWidth: 240 }}
          disabled={taxoLoading || filteredSkills.length === 0}
          title={
            !appliedCategoryId
              ? "Pick a category first (recommended) or leave as All."
              : filteredSkills.length === 0
                ? "No skills found for this category."
                : undefined
          }
        >
          <option value="">All skills</option>
          {filteredSkills.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Payment Mode */}
        <select
          value={paymentMode}
          onChange={(e) => {
            setPaymentMode(e.target.value);
            // apply immediately to URL
            setSp((prev) => {
              const next = new URLSearchParams(prev);
              next.set("page", "1");
              if (e.target.value) next.set("paymentMode", e.target.value);
              else next.delete("paymentMode");
              return next;
            });
          }}
          style={{ padding: 8, minWidth: 140 }}
        >
          <option value="">All payments</option>
          <option value="APP">APP</option>
          <option value="CASH">CASH</option>
        </select>

        {/* Poster ID */}
        <input
          value={postedByQuery}
          onChange={(e) => setPostedByQuery(e.target.value)}
          placeholder="Poster email or name"
          style={{ width: 200, padding: 8 }}
        />

        <input
          value={assignedToQuery}
          onChange={(e) => setAssignedToQuery(e.target.value)}
          placeholder="Helper email or name"
          style={{ width: 200, padding: 8 }}
        />



        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title"
          style={{ flex: 1, padding: 8 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyFiltersToUrl(1);
          }}
        />

        <button onClick={() => applyFiltersToUrl(1)} style={{ padding: "8px 12px" }} disabled={loading}>
          Search
        </button>

        <button onClick={clearFilters} style={{ padding: "8px 12px" }} disabled={loading}>
          Clear
        </button>

        <button
          onClick={onExportExcel}
          style={{ padding: "8px 12px" }}
          disabled={loading}
        >
          Export Excel
        </button>

      </div>

      {err && <div style={{ color: "crimson", marginBottom: 10 }}>{err}</div>}
      {loading ? <div>Loading…</div> : null}

      <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "210px 1.2fr 170px 110px 230px 200px 110px",
            padding: 10,
            background: "#f5f5f5",
            fontWeight: 700,
          }}
        >
          <div>Created</div>
          <div>Title</div>
          <div>Status</div>
          <div>Payment</div>
          <div>Escrow</div>
          <div>Poster</div>
          <div>Action</div>
        </div>

        {items.map((t) => {
          const payment = String((t as any).paymentMode || "-").toUpperCase();
          const escrowStatus = (t as any).escrow?.status ? String((t as any).escrow.status) : null;
          const escrowAmount = (t as any).escrow?.amountPaise ?? null;

          return (
            <div
              key={t.id}
              style={{
                display: "grid",
                gridTemplateColumns: "210px 1.2fr 170px 110px 230px 200px 110px",
                padding: 10,
                borderTop: "1px solid #eee",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 13 }}>{new Date((t as any).createdAt).toLocaleString()}</div>

              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {(t as any).title}
              </div>

              <div>
                <StatusBadge status={(t as any).status} />
              </div>

              <div>
                <StatusBadge status={payment} label={payment} />
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {escrowStatus ? <StatusBadge status={escrowStatus} /> : <span style={{ color: "#777" }}>-</span>}
                {escrowAmount != null ? (
                  <span style={{ fontSize: 13, color: "#333" }}>₹ {moneyRs(escrowAmount)}</span>
                ) : null}
              </div>

              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {(t as any).postedBy?.email || "-"}
              </div>

              <div>
                <Link to={`/admin/tasks/${t.id}`}>View</Link>
              </div>
            </div>
          );
        })}

        {!loading && items.length === 0 ? <div style={{ padding: 12, color: "#555" }}>No tasks found.</div> : null}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        <div>Total: {total}</div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button disabled={page <= 1 || loading} onClick={() => goToPage(page - 1)}>
            Prev
          </button>
          <div>Page {page}</div>
          <button disabled={!hasMore || loading} onClick={() => goToPage(page + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
