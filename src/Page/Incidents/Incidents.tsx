import { useEffect, useRef, useState } from "react";
import IncidentCard from "@/components/dashboard/IncidentCard";
import { incidentsService, type Incident } from "@/services/incidents";

// Confirmation Modal Component
function ConfirmModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white shadow-xl p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-gray-900">Remove Incident</h2>
        <p className="text-sm text-gray-600">
          Are you sure you want to remove this incident? This action cannot be undone.
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// Wrapper that intercepts clicks on any "remove" button inside IncidentCard
function IncidentCardWrapper({
  children,
  onRemoveRequest,
}: {
  children: React.ReactNode;
  onRemoveRequest: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const button = target.closest("button");
    if (
      button &&
      ref.current?.contains(button) &&
      /remove/i.test(button.textContent ?? "")
    ) {
      e.stopPropagation();
      onRemoveRequest();
    }
  };

  return (
    <div ref={ref} onClick={handleClick}>
      {children}
    </div>
  );
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  useEffect(() => {
    const loadIncidents = async () => {
      try {
        const data = await incidentsService.getAll({
          page: 1,
          limit: 20,
        });
        setIncidents(data.incidents);
      } catch (error) {
        console.error("Failed to load incidents:", error);
      } finally {
        setLoading(false);
      }
    };

    loadIncidents();
  }, []);

  const handleConfirmRemove = () => {
    if (pendingRemoveId !== null) {
      setIncidents((prev) =>
        prev.filter((incident) => incident.incident_code !== pendingRemoveId)
      );
      setPendingRemoveId(null);
    }
  };

  if (loading) {
    return <div className="p-4">Loading incidents...</div>;
  }

  return (
    <>
      <div className="grid gap-4 w-full px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {incidents.map((incident) => (
          <IncidentCardWrapper
            key={incident.id}
            onRemoveRequest={() => setPendingRemoveId(incident.incident_code)}
          >
            <IncidentCard
              id={incident.incident_code}
              title={incident.title}
              location={incident.location ?? "—"}
              time={new Date(incident.timestamp).toLocaleString()}
              severity={incident.severity}
              status={incident.status === "closed" ? "resolved" : incident.status}
            />
          </IncidentCardWrapper>
        ))}
      </div>

      <ConfirmModal
        open={pendingRemoveId !== null}
        onConfirm={handleConfirmRemove}
        onCancel={() => setPendingRemoveId(null)}
      />
    </>
  );
}