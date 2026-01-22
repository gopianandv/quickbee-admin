import { useQuery } from "@tanstack/react-query";
import { fetchSystemConfigs } from "@/api/config.api";
import { useState } from "react";
import ConfigEditModal from "./ConfigEditModal";

export default function ConfigListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-config"],
    queryFn: fetchSystemConfigs,
  });

  const [selected, setSelected] = useState<any | null>(null);

  if (isLoading) return <div>Loading system config…</div>;

  return (
    <div>
      <h2>System Configuration</h2>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
            <th>Description</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((row: any) => (
            <tr
              key={row.id}
              onClick={() => setSelected(row)}
              style={{ cursor: "pointer" }}
            >
              <td><code>{row.key}</code></td>
              <td>{JSON.stringify(row.value)}</td>
              <td>{row.description}</td>
              <td>{new Date(row.updatedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <ConfigEditModal
          row={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
