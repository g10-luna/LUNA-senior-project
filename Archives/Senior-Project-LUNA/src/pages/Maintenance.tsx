import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MaintenanceLogViewer, MaintenanceLog } from "@/components/MaintenanceLogViewer";
import { RobotHealthMetrics, HealthMetrics } from "@/components/RobotHealthMetrics";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";

const Maintenance = () => {
  const [healthMetrics] = useState<HealthMetrics>({
    systemUptime: 342,
    cpuUsage: 45,
    memoryUsage: 62,
    temperature: 48,
    navigationAccuracy: 97,
    sensorStatus: {
      lidar: true,
      ultrasonic: true,
      camera: true,
    },
    lastMaintenance: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    nextScheduledMaintenance: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000), // 23 days from now
  });

  const [maintenanceLogs] = useState<MaintenanceLog[]>([
    {
      id: "1",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      type: "warning",
      component: "Battery Management",
      message: "Battery temperature elevated during charging",
      details: "Temperature reached 42°C during fast charge cycle. Reduced charging rate to prevent damage.",
    },
    {
      id: "2",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      type: "success",
      component: "Navigation System",
      message: "Path optimization completed successfully",
      details: "Updated library floor map with 99.2% accuracy. All waypoints verified.",
    },
    {
      id: "3",
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
      type: "info",
      component: "Sensor Calibration",
      message: "Routine sensor calibration performed",
      details: "LiDAR, ultrasonic, and camera sensors calibrated within normal parameters.",
    },
    {
      id: "4",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      type: "error",
      component: "Motor Controller",
      message: "Left wheel motor current spike detected",
      details: "Motor drew 3.2A (normal: 1.8A) for 200ms. Possible debris or misalignment. Monitoring for recurrence.",
    },
    {
      id: "5",
      timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000),
      type: "success",
      component: "Software Update",
      message: "Firmware updated to v2.4.1",
      details: "Navigation algorithms improved. Battery management optimization applied.",
    },
    {
      id: "6",
      timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
      type: "warning",
      component: "Obstacle Detection",
      message: "Temporary sensor occlusion detected",
      details: "Front ultrasonic sensor temporarily blocked. Cleared after 3 seconds. No collision risk.",
    },
    {
      id: "7",
      timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000),
      type: "info",
      component: "Task Scheduler",
      message: "Weekly maintenance check completed",
      details: "All systems operational. 156 books transported this week with 99.4% success rate.",
    },
  ]);

  const handleExportLogs = () => {
    toast.success("Maintenance logs exported", {
      description: "Downloaded as maintenance-logs.csv",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-foreground">Maintenance & Diagnostics</h1>
            </div>
            <Button onClick={handleExportLogs} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Logs
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <RobotHealthMetrics metrics={healthMetrics} />
          </div>
          <div className="lg:col-span-2">
            <MaintenanceLogViewer logs={maintenanceLogs} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Maintenance;
