import { useEffect, useState } from "react";
import {
  Database,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Server,
  Layers,
} from "lucide-react";
import type { PluginComponentProps } from "../../../shared/types";
import { useAppStore } from "../../store/useAppStore";
import { Button } from "../ui/button";

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
      const healthResult = await window.api.es.checkHealth(instanceId);
      if (!healthResult) {
        throw new Error("Failed to fetch cluster health");
      }
      setHealth(healthResult as ClusterHealthData);

      const indicesResult = await window.api.es.getIndices(instanceId);
      if (indicesResult && Array.isArray(indicesResult)) {
        setStats({
          totalIndices: indicesResult.length,
          totalDocuments: 0,
          totalSize: "N/A",
        });
      }
    } catch {
      // Errors ignored silenty as fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [instanceId]);

  if (loading && !health) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3.5">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-primary/10 border-t-primary animate-spin" />
          <Activity className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-xs text-muted-foreground font-semibold animate-pulse tracking-wider">
          {t("dashboard.loading") || "Analyzing cluster..."}
        </p>
      </div>
    );
  }

  const statusConfig = {
    green: {
      icon: CheckCircle,
      color: "text-emerald-500",
      shadow: "shadow-emerald-500/10",
      bg: "from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/20",
      indicatorBg: "bg-emerald-500",
      pulseClass: "pulse-ring-green",
      label: t("dashboard.healthHealthy"),
    },
    yellow: {
      icon: AlertTriangle,
      color: "text-amber-500",
      shadow: "shadow-amber-500/10",
      bg: "from-amber-500/10 via-yellow-500/5 to-transparent border-amber-500/20",
      indicatorBg: "bg-amber-500",
      pulseClass: "pulse-ring-yellow", // CSS keyframes reused
      label: t("dashboard.healthWarning"),
    },
    red: {
      icon: XCircle,
      color: "text-rose-500",
      shadow: "shadow-rose-500/10",
      bg: "from-rose-500/15 via-red-500/5 to-transparent border-rose-500/30",
      indicatorBg: "bg-rose-500",
      pulseClass: "pulse-ring-red", // CSS keyframes reused
      label: t("dashboard.healthCritical"),
    },
  };

  const currentStatus = statusConfig[health?.status || "red"];

  // Calculating total shards to show percentage
  const primaryShards = health?.active_primary_shards || 0;
  const activeShards = health?.active_shards || 0;
  const relocatingShards = health?.relocating_shards || 0;
  const initializingShards = health?.initializing_shards || 0;
  const unassignedShards = health?.unassigned_shards || 0;
  const totalShards = activeShards + relocatingShards + initializingShards + unassignedShards || 1;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
      {/* 标题控制条 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground tracking-tight">
              {t("dashboard.title")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("dashboard.description")}
            </p>
          </div>
        </div>
        
        <Button
          onClick={fetchDashboardData}
          disabled={loading}
          variant="outline"
          size="sm"
          className="h-9 px-4 rounded-xl font-semibold gap-2 border-border/80 hover:bg-muted active:scale-95 transition-all text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>{t("common.refresh")}</span>
        </Button>
      </div>

      {/* 核心集群健康磨砂卡片（双色流光，呼吸光晕） */}
      <div
        className={`bg-gradient-to-br ${currentStatus.bg} border rounded-2xl p-6 shadow-lg ${currentStatus.shadow} glass-panel relative overflow-hidden transition-all duration-300`}
      >
        {/* 流体通信点阵背景层 */}
        <div className="absolute inset-0 communication-dot-flow opacity-[0.1] pointer-events-none" />

        <div className="flex items-center gap-6 relative z-10">
          {/* 极客科技环形健康刻度盘 */}
          <div className="relative shrink-0 flex items-center justify-center">
            {/* 炫彩呼吸发光底盘 */}
            <div className={`absolute w-20 h-20 rounded-full ${currentStatus.indicatorBg} opacity-10 blur-md ${currentStatus.pulseClass}`} />

            <svg className="w-20 h-20 transform -rotate-90 select-none pointer-events-none relative z-10">
              {/* 背景圈 */}
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-muted-foreground/10 dark:text-slate-800/40"
                fill="transparent"
              />
              {/* 装饰性外刻度环 */}
              <circle
                cx="40"
                cy="40"
                r="37"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeDasharray="3, 3.5"
                className="text-muted-foreground/20 dark:text-slate-700/60"
                fill="transparent"
              />
              {/* 发光刻度能量条 */}
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeDasharray={2 * Math.PI * 34}
                strokeDashoffset={2 * Math.PI * 34 * (1 - (activeShards / totalShards))}
                className={`${currentStatus.color} transition-all duration-1000 ease-out`}
                strokeLinecap="round"
                fill="transparent"
                style={{ filter: "drop-shadow(0px 0px 4px currentColor)" }}
              />
            </svg>
            
            {/* 居中图标 */}
            <div className="w-12 h-12 rounded-xl bg-card/90 dark:bg-slate-900/90 border border-border/40 shadow-inner flex items-center justify-center absolute z-20">
              <currentStatus.icon className={`w-6 h-6 ${currentStatus.color}`} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest">
              {t("dashboard.clusterStatus")}
            </div>
            <div className={`text-2xl font-black ${currentStatus.color} tracking-tight`}>
              {currentStatus.label}
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
              <span>{health?.cluster_name}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span className="text-muted-foreground font-normal">
                {health?.number_of_nodes} {t("dashboard.nodes")}
              </span>
            </div>
          </div>
        </div>
        
        {/* 背景大呼吸灯波纹 */}
        <div className={`absolute -right-8 -bottom-8 w-44 h-44 ${currentStatus.color} opacity-[0.03] select-none pointer-events-none rotate-12`} />
      </div>

      {/* Stats 计数网络卡片 (带 3D 浮动及科技感彩色指示条) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: t("dashboard.indices"),
            value: stats?.totalIndices || 0,
            icon: Database,
            sub: t("dashboard.availableIndices"),
            color: "text-blue-500",
            bgGradient: "from-blue-500 to-indigo-500",
            percentage: Math.min(100, ((stats?.totalIndices || 0) / 100) * 100),
          },
          {
            label: t("dashboard.dataNodes"),
            value: health?.number_of_data_nodes || 0,
            icon: Server,
            sub: t("dashboard.activeNodes"),
            color: "text-purple-500",
            bgGradient: "from-purple-500 to-violet-500",
            percentage: Math.min(100, ((health?.number_of_data_nodes || 1) / (health?.number_of_nodes || 1)) * 100),
          },
          {
            label: t("dashboard.activeShards"),
            value: health?.active_shards || 0,
            icon: Layers,
            sub: t("dashboard.primary") + ": " + (health?.active_primary_shards || 0),
            color: "text-emerald-500",
            bgGradient: "from-emerald-500 to-teal-500",
            percentage: (activeShards / totalShards) * 100,
          },
          {
            label: t("dashboard.unassignedShards"),
            value: health?.unassigned_shards || 0,
            icon: AlertTriangle,
            sub: t("dashboard.shardStatus"),
            color: (health?.unassigned_shards || 0) > 0 ? "text-rose-500 animate-bounce" : "text-slate-400",
            bgGradient: (health?.unassigned_shards || 0) > 0 ? "from-rose-500 to-red-500" : "from-slate-400 to-slate-500",
            percentage: (unassignedShards / totalShards) * 100,
          },
        ].map((item, i) => (
          <div
            key={i}
            className="glass-panel border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-primary/25 active:scale-[0.99] transition-all duration-300 group flex flex-col justify-between overflow-hidden relative"
          >
            {/* 极其微弱流动的流体点阵，代表正在进行数据吞吐 */}
            <div className="absolute inset-0 communication-dot-flow opacity-[0.03] pointer-events-none" />

            <div className="flex justify-between items-start mb-3 relative z-10">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {item.label}
              </div>
              <div className="p-2 rounded-lg bg-primary/5 border border-primary/10 group-hover:scale-105 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all duration-200 shrink-0">
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
            </div>
            
            <div className="space-y-3 relative z-10">
              <div className="text-2xl font-black text-foreground tracking-tight">
                {item.value.toLocaleString()}
              </div>
              
              {/* 引入科技双色圆角占比条 */}
              <div className="space-y-1.5">
                <div className="h-1.5 w-full bg-muted dark:bg-slate-900/60 rounded-full overflow-hidden border border-border/10">
                  <div
                    className={`h-full bg-gradient-to-r ${item.bgGradient} rounded-full transition-all duration-500`}
                    style={{ width: `${item.percentage || 4}%` }}
                  />
                </div>
                <div className="text-[9px] text-muted-foreground font-semibold flex justify-between">
                  <span>{item.sub}</span>
                  {item.percentage > 0 && <span>{Math.round(item.percentage)}%</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Shard 拓扑细节指标 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            title: t("dashboard.relocating"),
            value: health?.relocating_shards || 0,
            barColor: "bg-blue-500",
            dotColor: "bg-blue-500",
            percent: health?.relocating_shards ? 35 : 0,
          },
          {
            title: t("dashboard.initializing"),
            value: health?.initializing_shards || 0,
            barColor: "bg-amber-500",
            dotColor: "bg-amber-500",
            percent: health?.initializing_shards ? 20 : 0,
          },
          {
            title: t("dashboard.taskTimeout"),
            value: health?.timed_out ? t("common.yes") : t("common.no"),
            barColor: health?.timed_out ? "bg-rose-500" : "bg-emerald-500",
            dotColor: health?.timed_out ? "bg-rose-500" : "bg-emerald-500",
            percent: health?.timed_out ? 100 : 0,
            isCustomText: true,
          },
        ].map((metric, i) => (
          <div key={i} className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
            <h3 className="text-xs font-bold text-foreground mb-4 flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${metric.dotColor} shadow-sm pulse-dot-green`} />
              <span>{metric.title}</span>
            </h3>
            
            <div className="space-y-2">
              <div className={`text-xl font-black ${metric.isCustomText && metric.value === t("common.yes") ? "text-rose-500" : "text-foreground"}`}>
                {metric.value}
              </div>
              
              {!metric.isCustomText ? (
                <div className="h-1 w-full bg-muted dark:bg-slate-900/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${metric.barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${metric.percent}%` }}
                  />
                </div>
              ) : (
                <div className="h-1 w-full bg-muted dark:bg-slate-900/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${metric.barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${metric.value === t("common.no") ? 0 : 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
