import { useEffect, useState } from "react";
import IncidentCard from "@/components/dashboard/IncidentCard";
import { incidentsService, type Incident } from "@/services/incidents";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="p-4">Loading incidents...</div>;
  }

  return (
    <div className="grid gap-4">
      {incidents.map((incident) => (
        <IncidentCard
          key={incident.id}
          id={incident.incident_code}
          title={incident.title}
          location={incident.location ?? "—"}
          time={new Date(incident.timestamp).toLocaleString()}
          severity={incident.severity}
          status={
            incident.status === "closed"
              ? "resolved"
              : incident.status
          }
        />
      ))}
    </div>
  );
}