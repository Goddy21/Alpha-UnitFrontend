import { AlertTriangle, Plus, UserPlus, FileText, Radio, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

export const QuickActions = () => {
  const navigate  = useNavigate();
  const { toast } = useToast();

  // ── handlers ────────────────────────────────────────────────────────────────

  const reportIncident = async () => {
    // Navigate to incidents page with a "new" flag so the form auto-opens
    navigate("/incidents?action=new");
  };

  const newDeployment = async () => {
    navigate("/scheduling?action=new");
  };

  const addPersonnel = async () => {
    navigate("/personnel?action=new");
  };

  const generateReport = async () => {
    try {
      const res = await api.post("/reports", {
        type: "incident-summary",
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // last 30 days
        to:   new Date().toISOString(),
      });
      if (res.data.success) {
        toast({ title: "Report generated", description: "Your report is ready." });
        navigate("/reports");
      }
    } catch {
      // Fall back to just navigating to reports
      navigate("/reports");
    }
  };

  const broadcastAlert = async () => {
    try {
      await api.post("/notifications", {
        type:             "alert",
        title:            "Security Alert",
        message:          "Security alert broadcast from dashboard",
        priority:         "high",
        recipient_type:   "all",
        action_required:  true,
      });
      toast({ title: "Alert broadcast", description: "All personnel notified." });
    } catch (err: any) {
      toast({
        title: "Broadcast failed",
        description: err.response?.data?.message ?? err.message,
        variant: "destructive",
      });
    }
  };

  const viewLiveFeeds = () => {
    navigate("/cctv");
  };

  // ── action config ────────────────────────────────────────────────────────────

  const actions = [
    { icon: AlertTriangle, label: "Report Incident", variant: "destructive" as const, onClick: reportIncident },
    { icon: Plus,          label: "New Deployment",  variant: "default"     as const, onClick: newDeployment },
    { icon: UserPlus,      label: "Add Personnel",   variant: "outline"     as const, onClick: addPersonnel },
    { icon: FileText,      label: "Generate Report", variant: "outline"     as const, onClick: generateReport },
    { icon: Radio,         label: "Broadcast Alert", variant: "outline"     as const, onClick: broadcastAlert },
    { icon: Video,         label: "View Live Feeds", variant: "outline"     as const, onClick: viewLiveFeeds },
  ];

  return (
    <div className="glass-card rounded-xl border border-border/50 p-4 sm:p-5">
      <h3 className="font-semibold text-sm sm:text-base text-foreground mb-3 sm:mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant={action.variant}
              size="sm"
              className="h-auto py-2.5 sm:py-3 flex-col gap-1.5 sm:gap-2"
              onClick={action.onClick}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs leading-tight text-center">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};