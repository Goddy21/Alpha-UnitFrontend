import api from "@/lib/api";

export const quickActionsService = {
  // 1️⃣ Report Incident
  async reportIncident(payload: {
    title: string;
    description: string;
    severity: string;
    location?: string;
  }) {
    const response = await api.post("/incidents", payload);
    return response.data.data;
  },

  // 2️⃣ Create Deployment (Shift)
  async createDeployment(payload: {
    personnelId: string;
    siteId: string;
    startTime: string;
    endTime?: string;
  }) {
    const response = await api.post("/shifts", payload);
    return response.data.data;
  },

  // 3️⃣ Add Personnel
  async addPersonnel(payload: {
    first_name: string;
    last_name: string;
    role: string;
    status?: string;
  }) {
    const response = await api.post("/personnel", payload);
    return response.data.data;
  },

  // 4️⃣ Generate Report
  async generateReport(payload: {
    type: string;
    from: string;
    to: string;
  }) {
    const response = await api.post("/reports", payload);
    return response.data.data;
  },

  // 5️⃣ Broadcast Alert
  async broadcastAlert(payload: {
    message: string;
    severity: string;
  }) {
    const response = await api.post("/notifications/broadcast", payload);
    return response.data.data;
  },

  // 6️⃣ Fetch Live Feeds
  async getLiveFeeds() {
    const response = await api.get("/cctv/live");
    return response.data.data;
  },
};