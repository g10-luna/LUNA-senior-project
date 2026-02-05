import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Thermometer, 
  Gauge,
  WifiOff,
  Wifi
} from "lucide-react";

export interface HealthMetrics {
  systemUptime: number; // hours
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
  temperature: number; // celsius
  navigationAccuracy: number; // percentage
  sensorStatus: {
    lidar: boolean;
    ultrasonic: boolean;
    camera: boolean;
  };
  lastMaintenance: Date;
  nextScheduledMaintenance: Date;
}

interface RobotHealthMetricsProps {
  metrics: HealthMetrics;
}

export const RobotHealthMetrics = ({ metrics }: RobotHealthMetricsProps) => {
  const getHealthStatus = () => {
    const issues = [
      metrics.cpuUsage > 80,
      metrics.memoryUsage > 80,
      metrics.temperature > 70,
      !metrics.sensorStatus.lidar || !metrics.sensorStatus.ultrasonic,
    ].filter(Boolean).length;

    if (issues === 0) return { label: "Excellent", color: "text-success" };
    if (issues <= 1) return { label: "Good", color: "text-primary" };
    if (issues <= 2) return { label: "Fair", color: "text-warning" };
    return { label: "Poor", color: "text-destructive" };
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-card shadow-card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-card-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            System Health
          </h3>
          <Badge className={`${healthStatus.color} bg-transparent border`}>
            {healthStatus.label}
          </Badge>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-card-foreground">CPU Usage</span>
              </div>
              <span className="text-sm font-bold text-card-foreground">{metrics.cpuUsage}%</span>
            </div>
            <Progress value={metrics.cpuUsage} className="h-2" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-card-foreground">Memory Usage</span>
              </div>
              <span className="text-sm font-bold text-card-foreground">{metrics.memoryUsage}%</span>
            </div>
            <Progress value={metrics.memoryUsage} className="h-2" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-card-foreground">Temperature</span>
              </div>
              <span className="text-sm font-bold text-card-foreground">{metrics.temperature}°C</span>
            </div>
            <Progress value={(metrics.temperature / 100) * 100} className="h-2" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-card-foreground">Navigation Accuracy</span>
              </div>
              <span className="text-sm font-bold text-card-foreground">{metrics.navigationAccuracy}%</span>
            </div>
            <Progress value={metrics.navigationAccuracy} className="h-2" />
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-card shadow-card">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">Sensor Status</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
            <span className="text-sm font-medium text-card-foreground">LiDAR Sensor</span>
            {metrics.sensorStatus.lidar ? (
              <Badge className="bg-success text-success-foreground">
                <Wifi className="w-3 h-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge className="bg-destructive text-destructive-foreground">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
            <span className="text-sm font-medium text-card-foreground">Ultrasonic Sensors</span>
            {metrics.sensorStatus.ultrasonic ? (
              <Badge className="bg-success text-success-foreground">
                <Wifi className="w-3 h-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge className="bg-destructive text-destructive-foreground">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
            <span className="text-sm font-medium text-card-foreground">Camera</span>
            {metrics.sensorStatus.camera ? (
              <Badge className="bg-success text-success-foreground">
                <Wifi className="w-3 h-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge className="bg-destructive text-destructive-foreground">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-card shadow-card">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">Maintenance Schedule</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">System Uptime</span>
            <span className="text-sm font-semibold text-card-foreground">{metrics.systemUptime}h</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Last Maintenance</span>
            <span className="text-sm font-semibold text-card-foreground">
              {metrics.lastMaintenance.toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Next Scheduled</span>
            <span className="text-sm font-semibold text-primary">
              {metrics.nextScheduledMaintenance.toLocaleDateString()}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
