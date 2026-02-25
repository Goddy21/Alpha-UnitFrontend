import api from "@/lib/api";

/* =========================
   Types
========================= */

export interface Incident {
  id: string;
  incident_code: string;
  title: string;
  description?: string;
  siteId: string;
  siteName?: string;
  siteCode?: string;
  reportedBy?: string;
  reportedById?: string;
  timestamp: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved" | "closed";
  category?: string;
  location?: string;
  gpsCoords?: string | null;
  hasAttachments?: boolean;
  attachmentCount?: number;
  assignedTo?: string | null;
  resolvedAt?: string | null;
  responseTime?: string | null;
  notes?: string | null;
}

export interface IncidentsResponse {
  incidents: Incident[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface IncidentStats {
  total: number;
  open: number;
  investigating: number;
  resolved: number;
  closed: number;
  critical: number;
  high: number;
  last30Days: number;
  avgResponseTime: string;
}

/* =========================
   Service
========================= */

export const incidentsService = {
  /* =========================
     Get All (with filters)
  ========================= */
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    severity?: "low" | "medium" | "high" | "critical" | "all";
    status?: "open" | "investigating" | "resolved" | "closed" | "all";
    siteId?: string;
    sortBy?: "timestamp" | "created_at" | "severity" | "status" | "title";
    sortOrder?: "ASC" | "DESC";
  }): Promise<IncidentsResponse> {
    const response = await api.get("/incidents", { params });

    if (!response.data.success) {
      throw new Error("Failed to fetch incidents");
    }

    return response.data.data;
  },

  /* =========================
     Get By ID
  ========================= */
  async getById(id: string): Promise<Incident> {
    const response = await api.get(`/incidents/${id}`);

    if (!response.data.success) {
      throw new Error("Failed to fetch incident");
    }

    return response.data.data;
  },

  /* =========================
     Create Incident
  ========================= */
  async create(payload: {
    title: string;
    description?: string;
    siteId: string;
    reportedById?: string;
    severity: "low" | "medium" | "high" | "critical";
    category: string;
    location?: string;
    gpsCoords?: string;
    assignedTo?: string;
  }): Promise<Incident> {
    const response = await api.post("/incidents", payload);

    if (!response.data.success) {
      throw new Error("Failed to create incident");
    }

    return response.data.data;
  },

  /* =========================
     Update Incident
  ========================= */
  async update(
    id: string,
    payload: Partial<Omit<Incident, "id" | "incident_code" | "timestamp">>
  ): Promise<Incident> {
    const response = await api.put(`/incidents/${id}`, payload);

    if (!response.data.success) {
      throw new Error("Failed to update incident");
    }

    return response.data.data;
  },

  /* =========================
     Delete Incident
  ========================= */
  async delete(id: string): Promise<void> {
    const response = await api.delete(`/incidents/${id}`);

    if (!response.data.success) {
      throw new Error("Failed to delete incident");
    }
  },

  /* =========================
     Get Statistics
  ========================= */
  async getStats(): Promise<IncidentStats> {
    const response = await api.get("/incidents/stats");

    if (!response.data.success) {
      throw new Error("Failed to fetch incident statistics");
    }

    return response.data.data;
  },
};