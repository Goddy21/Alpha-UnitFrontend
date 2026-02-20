import { BarChart, BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ReportsPage = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <BarChart className="w-8 h-8 text-primary" />
              Reports & Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive insights and performance metrics
            </p>
          </div>
          <Button className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div>
              <p className="text-sm text-muted-foreground">Incidents This Month</p>
              <p className="text-3xl font-bold text-foreground mt-1">24</p>
              <p className="text-xs text-success mt-1">↓ 15% from last month</p>
            </div>
          </div>
          
          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div>
              <p className="text-sm text-muted-foreground">Avg Response Time</p>
              <p className="text-3xl font-bold text-foreground mt-1">12m</p>
              <p className="text-xs text-success mt-1">↓ 3min improvement</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div>
              <p className="text-sm text-muted-foreground">Guard Attendance</p>
              <p className="text-3xl font-bold text-foreground mt-1">98.5%</p>
              <p className="text-xs text-success mt-1">↑ 2% improvement</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-border/50">
            <div>
              <p className="text-sm text-muted-foreground">Client Satisfaction</p>
              <p className="text-3xl font-bold text-foreground mt-1">4.8/5</p>
              <p className="text-xs text-muted-foreground mt-1">Based on 42 reviews</p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-xl p-6 border border-border/50">
            <h3 className="font-semibold text-foreground mb-4">Incident Trends</h3>
            <div className="h-64 bg-secondary/30 rounded-lg flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Chart: Monthly Incident Trends</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6 border border-border/50">
            <h3 className="font-semibold text-foreground mb-4">Response Time Analysis</h3>
            <div className="h-64 bg-secondary/30 rounded-lg flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Chart: Average Response Times</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6 border border-border/50">
            <h3 className="font-semibold text-foreground mb-4">Guard Performance</h3>
            <div className="h-64 bg-secondary/30 rounded-lg flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Chart: Top Performing Guards</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6 border border-border/50">
            <h3 className="font-semibold text-foreground mb-4">Site Coverage</h3>
            <div className="h-64 bg-secondary/30 rounded-lg flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Chart: Sites by Activity</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;