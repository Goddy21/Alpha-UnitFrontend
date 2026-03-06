import api from "@/lib/api";

export interface Personnel {
  id: string;
  name: string;
  role: string;
  status: "on-duty" | "off-duty" | "break" | "alert";
  current_location?: string;
  last_check_in?: string;
}

export const personnelService = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const response = await api.get("/personnel", { params });
    return response.data.data; // { personnel, pagination }
  },

  async getById(id: string) {
    const response = await api.get(`/personnel/${id}`);
    return response.data.data;
  },
};