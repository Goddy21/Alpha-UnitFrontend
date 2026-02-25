import api from "@/lib/api";

export interface BackendSite {
  id: string;
  name: string;
  activeGuards: number;
  openIncidents: number;
  cameraCount: number;
}

export const sitesService = {
  async getAll() {
    const response = await api.get("/sites");
    return response.data.data; // { sites }
  },
};