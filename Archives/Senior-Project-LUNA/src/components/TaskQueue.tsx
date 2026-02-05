import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface Task {
  id: string;
  type: "pickup" | "delivery" | "transport";
  description: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  timestamp: string;
}

interface TaskQueueProps {
  tasks: Task[];
}

export const TaskQueue = ({ tasks }: TaskQueueProps) => {
  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "in-progress":
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4" />;
      case "failed":
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: Task["status"]) => {
    const config = {
      pending: "bg-muted text-muted-foreground",
      "in-progress": "bg-primary text-primary-foreground",
      completed: "bg-success text-success-foreground",
      failed: "bg-destructive text-destructive-foreground",
    };
    return config[status];
  };

  const getTaskTypeIcon = (type: Task["type"]) => {
    const icons = {
      pickup: "📥",
      delivery: "📦",
      transport: "🚚",
    };
    return icons[type];
  };

  return (
    <Card className="p-6 bg-gradient-card shadow-card">
      <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary" />
        Task Queue
        <Badge variant="secondary" className="ml-auto">
          {tasks.filter(t => t.status !== "completed").length} Active
        </Badge>
      </h3>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No tasks in queue</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-lg border border-border bg-card hover:shadow-card transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getTaskTypeIcon(task.type)}</span>
                    <div>
                      <p className="font-medium text-card-foreground">{task.description}</p>
                      <p className="text-xs text-muted-foreground">{task.timestamp}</p>
                    </div>
                  </div>
                  <Badge className={getStatusBadge(task.status)}>
                    {getStatusIcon(task.status)}
                    <span className="ml-1 capitalize">{task.status}</span>
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
