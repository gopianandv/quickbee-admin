import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { X, Lock, ChevronDown, ChevronUp, AlertTriangle, Loader2 } from "lucide-react";
import { updateSystemConfig } from "@/api/config.api";
import { getConfigDef } from "./config.defs";
import { adminListAuditLogs } from "@/api/adminAudit";
import { Button } from "@/components/ui/Button";

type Props = {
  row: {
    id: string;
    key: string;
    value: any;
    description?: string | null;
    updatedAt?: string;
    isSecret?: boolean;
  };
  onClose: () => void;
};

function safeJson(v: any) {
  try { return JSON.stringify(v ?? null, null, 2); } catch { return String(v ?? ""); }
}

function normalizeBool(v: any) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string")  return v.toLowerCase() === "true";
  return Boolean(v);
}

function normalizeNumber(v: any) {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return NaN;
}

function parseLoose(input: string) {
  try { return JSON.parse(input); } catch { return input; }
}

function fmtWhen(iso: string) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function pickAuditMessage(meta: any) {
  return meta?.message || meta?.reason || meta?.note || "—";
}

const monoInput = "w-full rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30";
const monoTextarea = "w-full rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30 resize-y";
const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400";

export default function ConfigEditModal({ row, onClose }: Props) {
  const qc  = useQueryClient();
  const def = useMemo(() => getConfigDef(row.key), [row.key]);

  const currentIsSecret = Boolean(row.isSecret);

  const [boolVal,  setBoolVal]  = useState(false);
  const [numVal,   setNumVal]   = useState<string>("");
  const [enumVal,  setEnumVal]  = useState<string>("");
  const [arrText,  setArrText]  = useState<string>("");
  const [jsonText, setJsonText] = useState<string>(() => safeJson(row.value));

  const [secretText,     setSecretText]     = useState<string>("");
  const [isSecretNext,   setIsSecretNext]   = useState<boolean>(currentIsSecret);
  const [secretGateText, setSecretGateText] = useState<string>("");
  const [resetText,      setResetText]      = useState<string>("");
  const [err,            setErr]            = useState<string | null>(null);
  const [showHistory,    setShowHistory]    = useState(false);

  const historyQ = useQuery({
    queryKey: ["config-history", row.key],
    enabled:  showHistory,
    queryFn:  async () => adminListAuditLogs({ entityType: "SYSTEM_CONFIG", entityId: row.key, page: 1, pageSize: 20 }),
  });

  useEffect(() => {
    setErr(null); setResetText(""); setSecretGateText("");
  }, [row.key]);

  useEffect(() => {
    setErr(null); setIsSecretNext(Boolean(row.isSecret)); setSecretText("");
    if (def?.type === "boolean")     { setBoolVal(normalizeBool(row.value)); return; }
    if (def?.type === "number")      { const n = normalizeNumber(row.value); setNumVal(Number.isFinite(n) ? String(n) : ""); return; }
    if (def?.type === "enum")        { setEnumVal(String(row.value ?? "")); return; }
    if (def?.type === "stringArray") { const arr = Array.isArray(row.value) ? row.value : []; setArrText(arr.map(String).join("\n")); return; }
    setJsonText(safeJson(row.value));
  }, [row.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const secretGateRequired = currentIsSecret !== isSecretNext;
  const secretGatePhrase   = `SECRET ${row.key}`;
  const secretGateOk       = !secretGateRequired || secretGateText.trim() === secretGatePhrase;
  const resetGatePhrase    = `RESET ${row.key}`;

  const built = useMemo(() => {
    if (isSecretNext) return { ok: true as const, value: undefined as any };
    if (!def) {
      try   { return { ok: true as const, value: JSON.parse(jsonText) }; }
      catch (e: any) { return { ok: false as const, error: e?.message || "Invalid JSON" }; }
    }
    if (def.type === "boolean") return { ok: true as const, value: Boolean(boolVal) };
    if (def.type === "number") {
      if (String(numVal ?? "").trim() === "") return { ok: false as const, error: "Value is required" };
      const n = Number(numVal);
      if (!Number.isFinite(n)) return { ok: false as const, error: "Enter a valid number" };
      if (typeof def.min === "number" && n < def.min) return { ok: false as const, error: `Min is ${def.min}` };
      if (typeof def.max === "number" && n > def.max) return { ok: false as const, error: `Max is ${def.max}` };
      return { ok: true as const, value: n };
    }
    if (def.type === "enum") {
      const v = String(enumVal || "");
      if (!v) return { ok: false as const, error: "Select a value" };
      if (def.enumValues?.length && !def.enumValues.includes(v)) return { ok: false as const, error: `Must be one of: ${def.enumValues.join(", ")}` };
      return { ok: true as const, value: v };
    }
    if (def.type === "stringArray") {
      const arr  = arrText.split("\n").map((s) => s.trim()).filter(Boolean);
      const norm = Array.from(new Set(arr.map((s) => s.toLowerCase())));
      return { ok: true as const, value: norm };
    }
    try   { return { ok: true as const, value: JSON.parse(jsonText) }; }
    catch (e: any) { return { ok: false as const, error: e?.message || "Invalid JSON" }; }
  }, [def, boolVal, numVal, enumVal, arrText, jsonText, isSecretNext]);

  const mut = useMutation({
    mutationFn: async () => {
      setErr(null);
      if (!secretGateOk) throw new Error(`To change secret status, type exactly: ${secretGatePhrase}`);
      if (isSecretNext) {
        const trimmed = secretText.trim();
        if (!trimmed) return updateSystemConfig(row.key, { isSecret: true });
        return updateSystemConfig(row.key, { value: parseLoose(trimmed), isSecret: true });
      }
      if (!built.ok) throw new Error(built.error);
      return updateSystemConfig(row.key, { value: built.value, isSecret: false });
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["admin-config"] }); onClose(); },
    onError:   (e: any) => setErr(e?.message || "Failed to update"),
  });

  const resetMut = useMutation({
    mutationFn: async () => {
      setErr(null);
      if (!def || typeof def.defaultValue === "undefined") throw new Error("No default is defined for this config.");
      if (resetText.trim() !== resetGatePhrase) throw new Error(`Type exactly: ${resetGatePhrase}`);
      return updateSystemConfig(row.key, { value: def.defaultValue, isSecret: isSecretNext });
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["admin-config"] }); onClose(); },
    onError:   (e: any) => setErr(e?.message || "Failed to reset"),
  });

  const canSave = !mut.isPending && !resetMut.isPending && built.ok && secretGateOk;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-100 bg-gray-50/80 backdrop-blur px-6 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Edit Config</p>
            <code className="mt-0.5 block font-mono text-sm font-bold text-gray-800">{row.key}</code>
            {def?.label && (
              <p className={`mt-0.5 text-xs font-semibold ${def.danger ? "text-red-600" : "text-gray-600"}`}>
                {def.label} {def.danger ? "⚠️" : ""} {isSecretNext ? "🔒" : ""}
              </p>
            )}
          </div>
          <button onClick={onClose} className="shrink-0 rounded-xl border border-gray-200 bg-white p-2 hover:bg-gray-50 transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Description */}
          {(row.description || def?.help) && (
            <div className="space-y-1">
              {row.description && <p className="text-sm text-gray-600">{row.description}</p>}
              {def?.help && <p className="text-xs text-gray-400">{def.help}</p>}
            </div>
          )}

          {/* Secret toggle */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSecretNext}
                onChange={(e) => { setIsSecretNext(e.target.checked); setErr(null); }}
                className="rounded border-gray-300 text-brand"
              />
              <Lock className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Mark as secret (mask value in UI + audit)</span>
            </label>

            {secretGateRequired && (
              <div>
                <p className="text-xs text-gray-500 mb-1.5">
                  To change secret status, type: <code className="font-mono bg-gray-200 rounded px-1">{secretGatePhrase}</code>
                </p>
                <input
                  value={secretGateText}
                  onChange={(e) => { setSecretGateText(e.target.value); setErr(null); }}
                  placeholder={`Type: ${secretGatePhrase}`}
                  className={`${monoInput} ${secretGateOk ? "border-gray-200" : "border-red-400"}`}
                />
              </div>
            )}
          </div>

          {/* Value editor */}
          {isSecretNext ? (
            <div>
              <label className={labelCls}>Secret value (optional)</label>
              <textarea
                value={secretText}
                onChange={(e) => { setSecretText(e.target.value); setErr(null); }}
                rows={6}
                placeholder='Leave blank to keep existing value. You can paste JSON (true, 10, "HELLO", ["a"]) or plain text.'
                className={`${monoTextarea} border-gray-200`}
              />
              <p className="mt-1.5 text-xs text-gray-400">
                Current value is hidden. Audit stores <code className="font-mono bg-gray-100 rounded px-1">[REDACTED]</code>.
              </p>
            </div>
          ) : (
            <>
              {def?.type === "boolean" ? (
                <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl border border-gray-200 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={boolVal}
                    onChange={(e) => { setBoolVal(e.target.checked); setErr(null); }}
                    className="rounded border-gray-300 text-brand h-5 w-5"
                  />
                  <span className={`text-sm font-semibold ${boolVal ? "text-green-600" : "text-gray-500"}`}>
                    {boolVal ? "✅ Enabled" : "❌ Disabled"}
                  </span>
                </label>
              ) : def?.type === "number" ? (
                <div>
                  <label className={labelCls}>Value</label>
                  <input
                    value={numVal}
                    onChange={(e) => { setNumVal(e.target.value); setErr(null); }}
                    inputMode="decimal"
                    placeholder="Enter number…"
                    className={`${monoInput} ${built.ok ? "border-gray-200" : "border-red-400"}`}
                  />
                  {(typeof def.min === "number" || typeof def.max === "number") && (
                    <p className="mt-1 text-xs text-gray-400">
                      {typeof def.min === "number" ? `min ${def.min}` : ""}
                      {typeof def.min === "number" && typeof def.max === "number" ? " · " : ""}
                      {typeof def.max === "number" ? `max ${def.max}` : ""}
                    </p>
                  )}
                </div>
              ) : def?.type === "enum" ? (
                <div>
                  <label className={labelCls}>Value</label>
                  <select
                    value={enumVal}
                    onChange={(e) => { setEnumVal(e.target.value); setErr(null); }}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 ${built.ok ? "border-gray-200" : "border-red-400"}`}
                  >
                    <option value="" disabled>Select…</option>
                    {(def.enumValues ?? []).map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              ) : def?.type === "stringArray" ? (
                <div>
                  <label className={labelCls}>Values (one per line)</label>
                  <textarea
                    value={arrText}
                    onChange={(e) => { setArrText(e.target.value); setErr(null); }}
                    rows={6}
                    className={`${monoTextarea} border-gray-200`}
                  />
                </div>
              ) : (
                <div>
                  <label className={labelCls}>Value (JSON)</label>
                  <textarea
                    value={jsonText}
                    onChange={(e) => { setJsonText(e.target.value); setErr(null); }}
                    rows={8}
                    className={`${monoTextarea} ${built.ok ? "border-gray-200" : "border-red-400"}`}
                  />
                </div>
              )}

              {!built.ok && !isSecretNext && (
                <p className="text-sm font-semibold text-red-600">{built.error}</p>
              )}
            </>
          )}

          {err && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {err}
            </div>
          )}

          {/* Audit history */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-gray-700">Recent Changes</p>
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
              >
                {showHistory ? <><ChevronUp className="h-3.5 w-3.5" /> Hide</> : <><ChevronDown className="h-3.5 w-3.5" /> Show</>}
              </button>
            </div>

            {showHistory && (
              <div className="mt-3">
                {historyQ.isLoading && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
                  </div>
                )}
                {historyQ.isError && (
                  <p className="text-sm text-red-600">Failed to load history: {(historyQ.error as any)?.message}</p>
                )}
                {!historyQ.isLoading && !historyQ.isError && (
                  <>
                    {(historyQ.data?.items ?? []).length === 0 ? (
                      <p className="text-sm text-gray-400">No audit entries found for this config.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-gray-200">
                        {(historyQ.data?.items ?? []).map((it) => {
                          const msg   = pickAuditMessage((it as any)?.meta);
                          const actor = (it as any)?.actor?.email || (it as any)?.actor?.name || it.actorUserId || "—";
                          return (
                            <div
                              key={it.id}
                              className="grid border-t border-gray-100 px-4 py-3 gap-3 text-sm first:border-t-0"
                              style={{ gridTemplateColumns: "160px 130px 1fr 180px", minWidth: 700 }}
                            >
                              <div className="font-semibold text-gray-800 whitespace-nowrap">{fmtWhen(it.createdAt)}</div>
                              <div className="font-bold text-gray-700">{it.action}</div>
                              <div className="text-gray-500 break-words">{msg}</div>
                              <div className="text-gray-400 truncate">{actor}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <p className="mt-2 text-xs text-gray-400">Latest 20 entries for <code className="font-mono bg-gray-100 rounded px-1">{row.key}</code></p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Reset to default */}
          {def && typeof def.defaultValue !== "undefined" && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-sm font-bold text-red-700">⚠️ Reset to Default (Danger)</p>
              <p className="text-xs text-gray-500">
                This will overwrite the current value with the defined default. To confirm, type:{" "}
                <code className="font-mono bg-gray-100 rounded px-1">{resetGatePhrase}</code>
              </p>
              <p className="text-xs text-gray-500">
                Default: <code className="font-mono bg-gray-100 rounded px-1">{safeJson(def.defaultValue)}</code>
              </p>
              <input
                value={resetText}
                onChange={(e) => { setResetText(e.target.value); setErr(null); }}
                placeholder={`Type: ${resetGatePhrase}`}
                className={monoInput + " border-gray-200"}
              />
              <div className="flex justify-end">
                <Button
                  variant="danger"
                  size="md"
                  onClick={() => resetMut.mutate()}
                  disabled={resetMut.isPending || mut.isPending || resetText.trim() !== resetGatePhrase}
                >
                  {resetMut.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Resetting…</> : "Reset to default"}
                </Button>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <Button variant="secondary" size="md" onClick={onClose} disabled={mut.isPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => mut.mutate()}
              disabled={!canSave}
            >
              {mut.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
