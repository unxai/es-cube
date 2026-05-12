import { useEffect, useState } from "react";
import {
  Database,
  RefreshCw,
  Heart,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Server,
  Layers,
} from "lucide-react";
import type { PluginComponentProps } from "../../../shared/types";
import { useAppStore } from "../../store/useAppStore";

interface ClusterHealthData {
  cluster_name: string;
  status: "green" | "yellow" | "red";
  timed_out: boolean;
  number_of_nodes: number;
  number_of_data_nodes: number;
  active_primary_shards: number;
  active_shards: number;
  relocating_shards: number;
  initializing_shards: number;
  unassigned_shards: number;
}

interface DashboardStats {
  totalIndices: number;
  totalDocuments: number;
  totalSize: string;
}

export function Dashboard({ instanceId }: PluginComponentProps) {
  const { t } = useAppStore();
  const [health, setHealth] = useState<ClusterHealthData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      // Fetch Health
      const healthResult = await window.api.es.checkHealth(instanceId);
      if (!healthResult) {
        throw new Error("Failed to fetch cluster health");
      }
      setHealth(healthResult as ClusterHealthData);

      // Fetch Indices for stats
      const indicesResult = await window.api.es.getIndices(instanceId);
      if (indicesResult && Array.isArray(indicesResult)) {
        // In a real app we'd fetch _stats for total docs/size
        // For now, keep it simple as before or enhance if possible
        setStats({
          totalIndices: indicesResult.length,
          totalDocuments: 0,
          totalSize: "N/A",
        });
      }
    } catch {
      // Errors are silently ignored - dashboard will show loading state if data fails to load
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [instanceId]);

  if (loading && !health) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t("dashboard.loading")}</p>
      </div>
    );
  }

  const statusConfig = {
    green: {
      icon: CheckCircle,
      color: "text-green-500",
      bg: "bg-green-500/10",
      label: t("dashboard.healthHealthy"),
    },
    yellow: {
      icon: AlertTriangle,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      label: t("dashboard.healthWarning"),
    },
    red: {
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-500/10",
      label: t("dashboard.healthCritical"),
    },
  };

  const currentStatus = statusConfig[health?.status || "red"];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            {t("dashboard.title")}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {t("dashboard.description")}
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {t("common.refresh")}
        </button>
      </div>

      {/* Cluster Health Status Card */}
      <div
        className={`${currentStatus.bg} border border-${health?.status}-500/20 rounded-2xl p-6 shadow-sm relative overflow-hidden`}
      >
        <div className="flex items-center gap-6 relative z-10">
          <div className={`p-4 rounded-2xl bg-background/50 backdrop-blur-sm border border-white/10 shadow-inner`}>
            <currentStatus.icon className={`w-12 h-12 ${currentStatus.color}`} />
          </div>
          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
              {t("dashboard.clusterStatus")}
            </div>
            <div className={`text-4xl font-black ${currentStatus.color} tracking-tight`}>
              {currentStatus.label}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-medium text-foreground/80">{health?.cluster_name}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span className="text-xs text-muted-foreground">
                {health?.number_of_nodes} {t("dashboard.nodes")}
              </span>
            </div>
          </div>
        </div>
        {/* Subtle background icon */}
        <Heart className={`absolute -right-8 -bottom-8 w-48 h-48 ${currentStatus.color} opacity-5 rotate-12`} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: t("dashboard.indices"),
            value: stats?.totalIndices || 0,
            icon: Database,
            sub: t("dashboard.availableIndices"),
            color: "text-blue-500",
          },
          {
            label: t("dashboard.dataNodes"),
            value: health?.number_of_data_nodes || 0,
            icon: Server,
            sub: t("dashboard.activeNodes"),
            color: "text-purple-500",
          },
          {
            label: t("dashboard.activeShards"),
            value: health?.active_shards || 0,
            icon: Layers,
            sub: t("dashboard.primary") + ": " + (health?.active_primary_shards || 0),
            color: "text-emerald-500",
          },
          {
            label: t("dashboard.unassignedShards"),
            value: health?.unassigned_shards || 0,
            icon: AlertTriangle,
            sub: t("dashboard.shardStatus"),
            color: (health?.unassigned_shards || 0) > 0 ? "text-red-500" : "text-slate-400",
          },
        ].map((item, i) => (
          <div key={i} className="bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-3">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{item.label}</div>
              <div className={`p-2 rounded-lg bg-muted group-hover:scale-110 transition-transform`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
            </div>
            <div className="text-3xl font-bold text-foreground tracking-tight">
              {item.value.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-2 font-medium">
              {item.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Shard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
             {t("dashboard.relocating")}
          </h3>
          <div className="text-2xl font-bold text-foreground">{health?.relocating_shards || 0}</div>
          <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: health?.relocating_shards ? '30%' : '0%' }} />
          </div>
        </div>
        <div className="bg-card border rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
             {t("dashboard.initializing")}
          </h3>
          <div className="text-2xl font-bold text-foreground">{health?.initializing_shards || 0}</div>
          <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-amber-500" style={{ width: health?.initializing_shards ? '20%' : '0%' }} />
          </div>
        </div>
        <div className="bg-card border rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
             {t("dashboard.taskTimeout")}
          </h3>
          <div className={`text-2xl font-bold ${health?.timed_out ? 'text-red-500' : 'text-green-500'}`}>
            {health?.timed_out ? t("common.yes") : t("common.no")}
          </div>
        </div>
      </div>
    </div>
  );
}
