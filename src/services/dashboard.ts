import api from "@/lib/api";

export interface DashboardStats {
  totalIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  activePersonnel: number;
  sites: number;
  cameras: number;
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const response = await api.get("/dashboard/stats");
    return response.data.data;
  },
};