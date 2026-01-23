import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSystemConfig } from "@/api/config.api";
import { getConfigDef } from "./config.defs";

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
  try {
    return JSON.stringify(v ?? null, null, 2);
  } catch {
    return String(v ?? "");
  }
}

function normalizeBool(v: any) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toLowerCase() === "true";
  return Boolean(v);
}

function normalizeNumber(v: any) {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return NaN;
}

function parseLoose(input: string) {
  // allow JSON, else treat as string
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}

export default function ConfigEditModal({ row, onClose }: Props) {
  const qc = useQueryClient();
  const def = useMemo(() => getConfigDef(row.key), [row.key]);

  const currentIsSecret = Boolean(row.isSecret);

  // typed editors
  const [boolVal, setBoolVal] = useState(false);
  const [numVal, setNumVal] = useState<string>("");
  const [enumVal, setEnumVal] = useState<string>("");
  const [arrText, setArrText] = useState<string>("");
  const [jsonText, setJsonText] = useState<string>(() => safeJson(row.value));

  // secret editor: never prefill
  const [secretText, setSecretText] = useState<string>("");

  // secret toggle + gate
  const [isSecretNext, setIsSecretNext] = useState<boolean>(currentIsSecret);
  const [secretGateText, setSecretGateText] = useState<string>("");

  // reset gate
  const [resetText, setResetText] = useState<string>("");

  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setErr(null);
    setResetText("");
    setSecretGateText("");
  }, [row.key]);

  useEffect(() => {
    setErr(null);
    setIsSecretNext(Boolean(row.isSecret));
    setSecretText("");

    if (def?.type === "boolean") {
      setBoolVal(normalizeBool(row.value));
      return;
    }

    if (def?.type === "number") {
      const n = normalizeNumber(row.value);
      setNumVal(Number.isFinite(n) ? String(n) : "");
      return;
    }

    if (def?.type === "enum") {
      setEnumVal(String(row.value ?? ""));
      return;
    }

    if (def?.type === "stringArray") {
      const arr = Array.isArray(row.value) ? row.value : [];
      setArrText(arr.map(String).join("\n"));
      return;
    }

    setJsonText(safeJson(row.value));
  }, [row.key]); // keep stable

  const secretGateRequired = currentIsSecret !== isSecretNext;
  const secretGatePhrase = `SECRET ${row.key}`;
  const secretGateOk = !secretGateRequired || secretGateText.trim() === secretGatePhrase;

  // build non-secret value
  const built = useMemo(() => {
    if (isSecretNext) return { ok: true as const, value: undefined as any };

    if (!def) {
      try {
        return { ok: true as const, value: JSON.parse(jsonText) };
      } catch (e: any) {
        return { ok: false as const, error: e?.message || "Invalid JSON" };
      }
    }

    if (def.type === "boolean") return { ok: true as const, value: Boolean(boolVal) };

    if (def.type === "number") {
      const n = Number(numVal);
      if (!Number.isFinite(n)) return { ok: false as const, error: "Enter a valid number" };
      if (typeof def.min === "number" && n < def.min) return { ok: false as const, error: `Min is ${def.min}` };
      if (typeof def.max === "number" && n > def.max) return { ok: false as const, error: `Max is ${def.max}` };
      return { ok: true as const, value: n };
    }

    if (def.type === "enum") {
      const v = String(enumVal || "");
      if (!v) return { ok: false as const, error: "Select a value" };
      if (def.enumValues?.length && !def.enumValues.includes(v)) {
        return { ok: false as const, error: `Must be one of: ${def.enumValues.join(", ")}` };
      }
      return { ok: true as const, value: v };
    }

    if (def.type === "stringArray") {
      const arr = arrText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const norm = Array.from(new Set(arr.map((s) => s.toLowerCase())));
      return { ok: true as const, value: norm };
    }

    try {
      return { ok: true as const, value: JSON.parse(jsonText) };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || "Invalid JSON" };
    }
  }, [def, boolVal, numVal, enumVal, arrText, jsonText, isSecretNext]);

  const mut = useMutation({
    mutationFn: async () => {
      setErr(null);

      if (!secretGateOk) {
        throw new Error(`To change secret status, type exactly: ${secretGatePhrase}`);
      }

      // SECRET path: do not show existing value; allow blank to keep existing
      if (isSecretNext) {
        const trimmed = secretText.trim();
        if (!trimmed) {
          // only toggle secret flag
          return updateSystemConfig(row.key, { isSecret: true });
        }

        return updateSystemConfig(row.key, { value: parseLoose(trimmed), isSecret: true });
      }

      // NON-secret path
      if (!built.ok) throw new Error(built.error);
      return updateSystemConfig(row.key, { value: built.value, isSecret: false });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-config"] });
      onClose();
    },
    onError: (e: any) => setErr(e?.message || "Failed to update"),
  });

  const resetMut = useMutation({
    mutationFn: async () => {
      setErr(null);
      if (!def || typeof def.defaultValue === "undefined") {
        throw new Error("No default is defined for this config.");
      }

      const gatePhrase = `RESET ${row.key}`;
      if (resetText.trim() !== gatePhrase) {
        throw new Error(`Type exactly: ${gatePhrase}`);
      }

      return updateSystemConfig(row.key, { value: def.defaultValue, isSecret: isSecretNext });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-config"] });
      onClose();
    },
    onError: (e: any) => setErr(e?.message || "Failed to reset"),
  });

  const canSave = !mut.isPending && !resetMut.isPending && built.ok && secretGateOk;

  const resetGatePhrase = `RESET ${row.key}`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 720,
          maxWidth: "100%",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e5e5e5",
          overflow: "hidden",
          fontFamily: "system-ui",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: 14,
            borderBottom: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900 }}>Edit Config</div>
            <div style={{ color: "#666", marginTop: 4 }}>
              <code>{row.key}</code>
            </div>

            {def?.label ? (
              <div style={{ marginTop: 6, fontWeight: 800, color: def.danger ? "#991B1B" : "#111" }}>
                {def.label} {def.danger ? "⚠️" : ""} {isSecretNext ? "🔒" : ""}
              </div>
            ) : isSecretNext ? (
              <div style={{ marginTop: 6, fontWeight: 800 }}>🔒 Secret config</div>
            ) : null}
          </div>

          <button
            onClick={onClose}
            style={{
              border: "1px solid #ddd",
              background: "#fff",
              borderRadius: 10,
              padding: "8px 10px",
              cursor: "pointer",
              fontWeight: 800,
              height: 38,
            }}
          >
            Close
          </button>
        </div>

        <div style={{ padding: 14 }}>
          {(row.description || def?.help) ? (
            <div style={{ marginBottom: 10, color: "#444" }}>
              {row.description ? <div>{row.description}</div> : null}
              {def?.help ? <div style={{ marginTop: 6, color: "#6B7280", fontSize: 12 }}>{def.help}</div> : null}
            </div>
          ) : null}

          {/* isSecret toggle + gate */}
          <div style={{ marginBottom: 12, padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 900 }}>
              <input
                type="checkbox"
                checked={isSecretNext}
                onChange={(e) => {
                  setIsSecretNext(e.target.checked);
                  setErr(null);
                }}
              />
              Mark as secret (mask value in UI + audit)
            </label>

            {secretGateRequired ? (
              <div style={{ marginTop: 10 }}>
                <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 900 }}>
                  To change secret status, type: <code>{secretGatePhrase}</code>
                </div>
                <input
                  value={secretGateText}
                  onChange={(e) => {
                    setSecretGateText(e.target.value);
                    setErr(null);
                  }}
                  placeholder={`Type: ${secretGatePhrase}`}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: `1px solid ${secretGateOk ? "#ddd" : "crimson"}`,
                    fontWeight: 900,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  }}
                />
              </div>
            ) : null}
          </div>

          {/* value editor */}
          {isSecretNext ? (
            <div>
              <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 900, marginBottom: 6 }}>
                Secret value (optional)
              </div>

              <textarea
                value={secretText}
                onChange={(e) => {
                  setSecretText(e.target.value);
                  setErr(null);
                }}
                rows={8}
                placeholder="Leave blank to keep existing secret value. You can paste JSON (true, 10, &quot;HELLO&quot;, [&quot;a&quot;]) or plain text."
                style={{
                  width: "100%",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #e5e5e5",
                  background: "#fff",
                  resize: "vertical",
                }}
              />

              <div style={{ marginTop: 8, color: "#6B7280", fontSize: 12, fontWeight: 800 }}>
                Current value is hidden. Audit should store <code>[REDACTED]</code>.
              </div>
            </div>
          ) : (
            <>
              {def?.type === "boolean" ? (
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800 }}>
                  <input
                    type="checkbox"
                    checked={boolVal}
                    onChange={(e) => {
                      setBoolVal(e.target.checked);
                      setErr(null);
                    }}
                  />
                  {boolVal ? "Enabled" : "Disabled"}
                </label>
              ) : def?.type === "number" ? (
                <div>
                  <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 800, marginBottom: 6 }}>Value</div>
                  <input
                    value={numVal}
                    onChange={(e) => {
                      setNumVal(e.target.value);
                      setErr(null);
                    }}
                    inputMode="decimal"
                    placeholder="Enter number…"
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 12,
                      border: `1px solid ${built.ok ? "#e5e5e5" : "crimson"}`,
                      background: "#fff",
                      fontWeight: 800,
                    }}
                  />
                  <div style={{ marginTop: 8, color: "#6B7280", fontSize: 12 }}>
                    {typeof def.min === "number" ? `min ${def.min}` : null}
                    {typeof def.min === "number" && typeof def.max === "number" ? " • " : null}
                    {typeof def.max === "number" ? `max ${def.max}` : null}
                  </div>
                </div>
              ) : def?.type === "enum" ? (
                <div>
                  <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 800, marginBottom: 6 }}>Value</div>
                  <select
                    value={enumVal}
                    onChange={(e) => {
                      setEnumVal(e.target.value);
                      setErr(null);
                    }}
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 12,
                      border: `1px solid ${built.ok ? "#e5e5e5" : "crimson"}`,
                      background: "#fff",
                      fontWeight: 900,
                    }}
                  >
                    <option value="" disabled>
                      Select…
                    </option>
                    {(def.enumValues ?? []).map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              ) : def?.type === "stringArray" ? (
                <div>
                  <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
                    Values (one per line)
                  </div>
                  <textarea
                    value={arrText}
                    onChange={(e) => {
                      setArrText(e.target.value);
                      setErr(null);
                    }}
                    rows={6}
                    style={{
                      width: "100%",
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #e5e5e5",
                      background: "#fff",
                      resize: "vertical",
                    }}
                  />
                </div>
              ) : (
                <div>
                  <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 800, marginBottom: 6 }}>Value (JSON)</div>
                  <textarea
                    value={jsonText}
                    onChange={(e) => {
                      setJsonText(e.target.value);
                      setErr(null);
                    }}
                    rows={10}
                    style={{
                      width: "100%",
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      padding: 12,
                      borderRadius: 12,
                      border: `1px solid ${built.ok ? "#e5e5e5" : "crimson"}`,
                      background: "#fff",
                      resize: "vertical",
                    }}
                  />
                </div>
              )}
            </>
          )}

          {!built.ok && !isSecretNext ? (
            <div style={{ color: "crimson", marginTop: 10, fontWeight: 800 }}>{built.error}</div>
          ) : null}

          {err ? <div style={{ color: "crimson", marginTop: 10, fontWeight: 800 }}>{err}</div> : null}

          {/* reset gate */}
          {def && typeof def.defaultValue !== "undefined" ? (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #eee" }}>
              <div style={{ fontWeight: 900, color: "#991B1B" }}>Reset to default (Danger)</div>

              <div style={{ marginTop: 6, color: "#6B7280", fontSize: 12, fontWeight: 800 }}>
                This will overwrite the current value with the default defined in the admin UI. To confirm, type:{" "}
                <code>{resetGatePhrase}</code>
              </div>

              <div style={{ marginTop: 8, color: "#444", fontSize: 12 }}>
                Default: <code>{safeJson(def.defaultValue)}</code>
              </div>

              <input
                value={resetText}
                onChange={(e) => {
                  setResetText(e.target.value);
                  setErr(null);
                }}
                placeholder={`Type: ${resetGatePhrase}`}
                style={{
                  marginTop: 10,
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  fontWeight: 900,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                }}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button
                  onClick={() => resetMut.mutate()}
                  disabled={resetMut.isPending || mut.isPending || resetText.trim() !== resetGatePhrase}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #991B1B",
                    background: resetText.trim() === resetGatePhrase ? "#991B1B" : "#f2f2f2",
                    color: resetText.trim() === resetGatePhrase ? "#fff" : "#666",
                    cursor: resetText.trim() === resetGatePhrase ? "pointer" : "not-allowed",
                    fontWeight: 900,
                  }}
                >
                  {resetMut.isPending ? "Resetting…" : "Reset to default"}
                </button>
              </div>
            </div>
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
            <button
              onClick={onClose}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Cancel
            </button>

            <button
              onClick={() => mut.mutate()}
              disabled={!canSave}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #111",
                background: canSave ? "#111" : "#f2f2f2",
                color: canSave ? "#fff" : "#666",
                cursor: canSave ? "pointer" : "not-allowed",
                fontWeight: 900,
              }}
            >
              {mut.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
