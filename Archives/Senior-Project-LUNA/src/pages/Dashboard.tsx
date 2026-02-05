import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RobotStatus } from "@/components/RobotStatus";
import { TaskQueue } from "@/components/TaskQueue";
import { NotificationCenter } from "@/components/NotificationCenter";
import { RefreshCw, Wrench, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useNotifications } from "@/contexts/NotificationContext";

interface Task {
  id: string;
  type: "pickup" | "delivery" | "transport";
  description: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  timestamp: string;
}

const Dashboard = () => {
  const { addNotification } = useNotifications();
  const [batteryLevel, setBatteryLevel] = useState(85);
  const [robotStatus, setRobotStatus] = useState<"idle" | "active" | "charging" | "error">("active");
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      type: "pickup",
      description: "Collect books from drop-off station",
      status: "in-progress",
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: "2",
      type: "delivery",
      description: "Deliver 'Pride and Prejudice' to front desk",
      status: "pending",
      timestamp: new Date(Date.now() - 300000).toLocaleTimeString(),
    },
    {
      id: "3",
      type: "transport",
      description: "Transport sorted books to Section A",
      status: "completed",
      timestamp: new Date(Date.now() - 600000).toLocaleTimeString(),
    },
  ]);

  const locations = [
    "Drop-off Station",
    "Sorting Area",
    "Section A, Aisle 2",
    "Front Desk",
    "Charging Station",
  ];

  const [currentLocation, setCurrentLocation] = useState(locations[0]);

  useEffect(() => {
    // Simulate battery drain
    const batteryInterval = setInterval(() => {
      setBatteryLevel((prev) => {
        const newLevel = prev <= 20 ? Math.min(prev + 5, 100) : Math.max(prev - 1, 15);
        
        if (prev > 20 && newLevel <= 20) {
          setRobotStatus("charging");
          addNotification({
            type: "battery-low",
            title: "Battery Low",
            message: "Robot battery is at 20%. Automatically returning to charging station.",
          });
          toast.warning("Robot battery low - returning to charge");
        }
        
        if (prev <= 20 && newLevel > 20) {
          setRobotStatus("active");
          addNotification({
            type: "robot-status",
            title: "Charging Complete",
            message: "Robot battery recharged to optimal level. Resuming tasks.",
          });
        }
        
        return newLevel;
      });
    }, 5000);

    // Simulate location changes
    const locationInterval = setInterval(() => {
      setCurrentLocation(locations[Math.floor(Math.random() * locations.length)]);
    }, 8000);

    // Simulate task updates
    const taskInterval = setInterval(() => {
      setTasks((prevTasks) => {
        const updatedTasks = [...prevTasks];
        const inProgressTask = updatedTasks.find((t) => t.status === "in-progress");
        
        if (inProgressTask) {
          inProgressTask.status = "completed";
          
          // Send notification for completed task
          addNotification({
            type: "task-complete",
            title: "Task Completed",
            message: `${inProgressTask.description} has been completed successfully.`,
          });
          
          toast.success("Task completed", {
            description: inProgressTask.description,
          });
          
          const nextPending = updatedTasks.find((t) => t.status === "pending");
          if (nextPending) {
            nextPending.status = "in-progress";
            addNotification({
              type: "robot-status",
              title: "New Task Started",
              message: `Robot started: ${nextPending.description}`,
            });
          } else {
            setRobotStatus("idle");
            addNotification({
              type: "robot-status",
              title: "All Tasks Complete",
              message: "Robot has completed all pending tasks and is now idle.",
            });
          }
        }
        
        return updatedTasks;
      });
    }, 10000);

    return () => {
      clearInterval(batteryInterval);
      clearInterval(locationInterval);
      clearInterval(taskInterval);
    };
  }, []);

  const handleRefresh = () => {
    toast.success("Dashboard refreshed");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-foreground">Librarian Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/catalog">
                <Button variant="outline" size="sm">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Book Catalog
                </Button>
              </Link>
              <Link to="/maintenance">
                <Button variant="outline" size="sm">
                  <Wrench className="w-4 h-4 mr-2" />
                  Maintenance
                </Button>
              </Link>
              <NotificationCenter />
              <Button onClick={handleRefresh} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <RobotStatus
            batteryLevel={batteryLevel}
            currentTask={tasks.find((t) => t.status === "in-progress")?.description || "No active task"}
            location={currentLocation}
            status={robotStatus}
          />
          <TaskQueue tasks={tasks} />
        </div>

        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <StatCard
            title="Tasks Completed Today"
            value="24"
            trend="+12%"
            trendUp={true}
          />
          <StatCard
            title="Books Transported"
            value="156"
            trend="+8%"
            trendUp={true}
          />
          <StatCard
            title="Average Response Time"
            value="2.4 min"
            trend="-15%"
            trendUp={true}
          />
        </div>
      </main>
    </div>
  );
};

const StatCard = ({
  title,
  value,
  trend,
  trendUp,
}: {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
}) => (
  <div className="p-6 rounded-xl bg-gradient-card shadow-card border border-border">
    <p className="text-sm text-muted-foreground mb-2">{title}</p>
    <div className="flex items-end justify-between">
      <p className="text-3xl font-bold text-foreground">{value}</p>
      <span className={`text-sm font-medium ${trendUp ? "text-success" : "text-destructive"}`}>
        {trend}
      </span>
    </div>
  </div>
);

export default Dashboard;
