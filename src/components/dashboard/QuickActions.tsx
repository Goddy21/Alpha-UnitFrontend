import { 
  AlertTriangle, 
  Plus, 
  UserPlus, 
  FileText, 
  Radio, 
  Video 
} from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  { icon: AlertTriangle, label: "Report Incident", variant: "destructive" as const },
  { icon: Plus, label: "New Deployment", variant: "default" as const },
  { icon: UserPlus, label: "Add Personnel", variant: "outline" as const },
  { icon: FileText, label: "Generate Report", variant: "outline" as const },
  { icon: Radio, label: "Broadcast Alert", variant: "warning" as const },
  { icon: Video, label: "View Live Feeds", variant: "tactical" as const },
];

export const QuickActions = () => {
  return (
    <div className="glass-card rounded-xl border border-border/50 p-5">
      <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <Button 
              key={idx} 
              variant={action.variant} 
              className="h-auto py-3 flex-col gap-2"
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
