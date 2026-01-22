import { useState } from "react";
import { updateSystemConfig } from "@/api/config.api";

export default function ConfigEditModal({
  row,
  onClose,
}: {
  row: any;
  onClose: () => void;
}) {
  const [value, setValue] = useState(
    JSON.stringify(row.value, null, 2)
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await updateSystemConfig(row.key, JSON.parse(value));
    setSaving(false);
    onClose();
  }

  return (
    <div className="modal">
      <h3>Edit Config</h3>

      <div>
        <strong>{row.key}</strong>
      </div>

      <textarea
        rows={6}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ width: "100%" }}
      />

      <div style={{ marginTop: 12 }}>
        <button onClick={onClose}>Cancel</button>
        <button onClick={save} disabled={saving}>
          Save
        </button>
      </div>
    </div>
  );
}
