"use client";

import { useAnalytics } from "@/hooks/use-analytics";
import { useSSE } from "@/hooks/use-sse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Radio,
  CheckCircle,
  AlertTriangle,
  Zap,
  XCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Activity,
  ShieldAlert,
  Bot,
  Link2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useMemo } from "react";

const PLATFORM_COLORS: Record<string, string> = {
  X: "#1DA1F2",
  INSTAGRAM: "#E1306C",
  FACEBOOK: "#1877F2",
  TIKTOK: "#00F2EA",
};

function generateTrendData(rate: number) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day, i) => ({
    day,
    rate: Math.max(
      0,
      Math.min(100, rate + Math.sin(i * 1.2) * 8 + i * 1.5 - 4),
    ),
  }));
}

export default function DashboardPage() {
  const { data: analytics, isLoading } = useAnalytics();
  useSSE();

  const trendData = useMemo(
    () => generateTrendData(analytics?.automationRate ?? 65),
    [analytics?.automationRate],
  );

  const platformData = useMemo(() => {
    if (!analytics?.signalsByPlatform) return [];
    return Object.entries(analytics.signalsByPlatform).map(
      ([platform, count]) => ({
        platform,
        count: count as number,
        fill: PLATFORM_COLORS[platform] || "#8884d8",
      }),
    );
  }, [analytics?.signalsByPlatform]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: "Total Signals",
      value: analytics?.totalSignals ?? 0,
      icon: Radio,
      color: "text-blue-500",
    },
    {
      label: "Auto-Approved",
      value: analytics?.autoApprovedCount ?? 0,
      icon: CheckCircle,
      color: "text-green-500",
    },
    {
      label: "Automation Rate",
      value: `${(analytics?.automationRate ?? 0).toFixed(1)}%`,
      icon: Zap,
      color: "text-yellow-500",
    },
    {
      label: "Escalated",
      value: analytics?.escalatedCount ?? 0,
      icon: AlertTriangle,
      color: "text-orange-500",
    },
    {
      label: "Failed Deliveries",
      value: analytics?.failedDeliveries ?? 0,
      icon: XCircle,
      color: "text-red-500",
    },
    {
      label: "Avg Response Time",
      value: `${((analytics?.avgResponseTimeMs ?? 0) / 1000).toFixed(1)}s`,
      icon: Clock,
      color: "text-purple-500",
    },
    {
      label: "Open Risk Events",
      value: analytics?.riskEventsOpen ?? 0,
      icon: ShieldAlert,
      color: "text-red-500",
    },
    {
      label: "AI Success Rate",
      value: `${(analytics?.agentSuccessRate ?? 0).toFixed(1)}%`,
      icon: Bot,
      color: "text-indigo-500",
    },
    {
      label: "Shortlink Clicks",
      value: analytics?.shortlinkClicks ?? 0,
      icon: Link2,
      color: "text-cyan-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4 text-green-500 animate-pulse" />
          Pipeline Active
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Automation Rate Trend */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Automation Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis domain={[0, 100]} className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Signals by Platform */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Signals by Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={platformData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="platform" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {platformData.map((entry) => (
                    <Cell key={entry.platform} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Extra KPI row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolution Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analytics?.resolutionRate ?? 0).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Posting Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analytics?.postingRate ?? 0).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Messages Ingested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.messagesIngested ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.pendingApprovals ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
