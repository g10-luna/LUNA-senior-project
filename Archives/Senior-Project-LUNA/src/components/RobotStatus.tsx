import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Battery, MapPin, Activity, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface RobotStatusProps {
  batteryLevel: number;
  currentTask: string;
  location: string;
  status: "idle" | "active" | "charging" | "error";
}

export const RobotStatus = ({ batteryLevel, currentTask, location, status }: RobotStatusProps) => {
  const statusConfig = {
    idle: { color: "bg-muted text-muted-foreground", label: "Idle" },
    active: { color: "bg-success text-success-foreground", label: "Active" },
    charging: { color: "bg-warning text-warning-foreground", label: "Charging" },
    error: { color: "bg-destructive text-destructive-foreground", label: "Error" },
  };

  const getBatteryColor = (level: number) => {
    if (level > 60) return "text-success";
    if (level > 30) return "text-warning";
    return "text-destructive";
  };

  return (
    <Card className="p-6 bg-gradient-card shadow-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-card-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Robot Status
        </h3>
        <Badge className={statusConfig[status].color}>
          {status === "active" && <Zap className="w-3 h-3 mr-1 animate-pulse" />}
          {statusConfig[status].label}
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Battery className={`w-5 h-5 ${getBatteryColor(batteryLevel)}`} />
            <span className="text-sm font-medium text-card-foreground">Battery Level</span>
          </div>
          <span className={`text-sm font-bold ${getBatteryColor(batteryLevel)}`}>
            {batteryLevel}%
          </span>
        </div>
        <Progress value={batteryLevel} className="h-2" />

        <div className="pt-4 space-y-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-5 h-5 text-secondary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-card-foreground">Current Location</p>
              <p className="text-sm text-muted-foreground">{location}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Activity className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-card-foreground">Current Task</p>
              <p className="text-sm text-muted-foreground">{currentTask}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
