import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface MaintenanceLog {
  id: string;
  timestamp: Date;
  type: "error" | "warning" | "info" | "success";
  component: string;
  message: string;
  details?: string;
}

interface MaintenanceLogViewerProps {
  logs: MaintenanceLog[];
}

export const MaintenanceLogViewer = ({ logs }: MaintenanceLogViewerProps) => {
  const getLogIcon = (type: MaintenanceLog["type"]) => {
    switch (type) {
      case "error":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "info":
        return <Info className="w-4 h-4 text-primary" />;
    }
  };

  const getLogBadge = (type: MaintenanceLog["type"]) => {
    const config = {
      error: "bg-destructive text-destructive-foreground",
      warning: "bg-warning text-warning-foreground",
      success: "bg-success text-success-foreground",
      info: "bg-primary text-primary-foreground",
    };
    return config[type];
  };

  return (
    <Card className="p-6 bg-gradient-card shadow-card">
      <h3 className="text-xl font-semibold text-card-foreground mb-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-primary" />
        Maintenance Logs
        <Badge variant="secondary" className="ml-auto">
          {logs.filter(l => l.type === "error").length} Errors
        </Badge>
      </h3>

      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No maintenance logs recorded</p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-lg border border-border bg-card hover:shadow-card transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2">
                    {getLogIcon(log.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getLogBadge(log.type)}>
                          {log.type.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {log.component}
                        </span>
                      </div>
                      <p className="font-medium text-card-foreground">{log.message}</p>
                      {log.details && (
                        <p className="text-sm text-muted-foreground mt-1">{log.details}</p>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                </p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
