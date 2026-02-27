import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  variant?: "default" | "primary" | "warning" | "destructive" | "success";
}

export const StatCard = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  variant = "default",
}: StatCardProps) => {
  const variantStyles = {
    default:     "border-border/50",
    primary:     "border-primary/30 bg-primary/5",
    warning:     "border-warning/30 bg-warning/5",
    destructive: "border-destructive/30 bg-destructive/5",
    success:     "border-success/30 bg-success/5",
  };

  const iconStyles = {
    default:     "text-muted-foreground bg-secondary",
    primary:     "text-primary bg-primary/10",
    warning:     "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10",
    success:     "text-success bg-success/10",
  };

  return (
    <div
      className={cn(
        "glass-card rounded-lg sm:rounded-xl p-3 sm:p-5 border transition-all duration-300 hover:border-primary/30 group",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between mb-2 sm:mb-4">
        <div
          className={cn(
            "w-9 h-9 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
            iconStyles[variant]
          )}
        >
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        {change && (
          <span
            className={cn(
              "text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full",
              changeType === "positive" && "text-success bg-success/10",
              changeType === "negative" && "text-destructive bg-destructive/10",
              changeType === "neutral"  && "text-muted-foreground bg-muted"
            )}
          >
            {change}
          </span>
        )}
      </div>
      <p className="text-muted-foreground text-xs sm:text-sm mb-0.5 sm:mb-1">{title}</p>
      <p className="text-2xl sm:text-3xl font-bold text-foreground font-mono">{value}</p>
    </div>
  );
};