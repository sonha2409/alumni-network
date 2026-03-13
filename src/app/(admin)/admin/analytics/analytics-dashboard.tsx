"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { useTranslations } from "next-intl";
import type { AnalyticsData } from "./actions";

const STATUS_COLORS: Record<string, string> = {
  verified: "hsl(142, 71%, 45%)",
  pending: "hsl(48, 96%, 53%)",
  unverified: "hsl(0, 0%, 63%)",
  rejected: "hsl(0, 84%, 60%)",
};

const STATUS_LABELS: Record<string, string> = {
  verified: "Verified",
  pending: "Pending",
  unverified: "Unverified",
  rejected: "Rejected",
};

const statusChartConfig: ChartConfig = {
  verified: { label: "Verified", color: STATUS_COLORS.verified },
  pending: { label: "Pending", color: STATUS_COLORS.pending },
  unverified: { label: "Unverified", color: STATUS_COLORS.unverified },
  rejected: { label: "Rejected", color: STATUS_COLORS.rejected },
};

const signupsChartConfig: ChartConfig = {
  count: { label: "Signups", color: "hsl(221, 83%, 53%)" },
};

const activityChartConfig: ChartConfig = {
  connections: { label: "Connections", color: "hsl(142, 71%, 45%)" },
  messages: { label: "Messages", color: "hsl(221, 83%, 53%)" },
};

const industryChartConfig: ChartConfig = {
  count: { label: "Users", color: "hsl(262, 83%, 58%)" },
};

const locationChartConfig: ChartConfig = {
  count: { label: "Users", color: "hsl(24, 95%, 53%)" },
};

interface AnalyticsDashboardProps {
  data: AnalyticsData;
}

export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  const t = useTranslations("admin.analytics");
  const statusTotal = data.userStatusBreakdown.reduce(
    (sum, s) => sum + s.count,
    0
  );

  // Merge connections + messages for the activity chart
  const activityData = data.connectionsOverTime.map((c, i) => ({
    month: c.month,
    connections: c.count,
    messages: data.messagesOverTime[i]?.count ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Stat Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("totalUsers")}
          value={data.totalUsers}
          description={t("allAccounts")}
        />
        {data.userStatusBreakdown
          .filter((s) => s.status !== "rejected")
          .map((s) => (
            <StatCard
              key={s.status}
              title={STATUS_LABELS[s.status] ?? s.status}
              value={s.count}
              description={
                statusTotal > 0
                  ? t("percentOfUsers", { percent: ((s.count / statusTotal) * 100).toFixed(1) })
                  : t("noUsersYet")
              }
            />
          ))}
      </div>

      {/* Active Users */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title={t("dailyActive")} value={data.activeUsers.dau} description={t("last24h")} />
        <StatCard title={t("weeklyActive")} value={data.activeUsers.wau} description={t("last7d")} />
        <StatCard title={t("monthlyActive")} value={data.activeUsers.mau} description={t("last30d")} />
      </div>

      {/* Signups + Status Breakdown */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("signupsOverTime")}</CardTitle>
            <CardDescription>{t("signupsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.signupsOverTime.every((d) => d.count === 0) ? (
              <EmptyChart message={t("noSignupsData")} />
            ) : (
              <ChartContainer config={signupsChartConfig} className="h-64 w-full">
                <AreaChart data={data.signupsOverTime} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    dataKey="count"
                    type="monotone"
                    fill="var(--color-count)"
                    fillOpacity={0.2}
                    stroke="var(--color-count)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("userStatus")}</CardTitle>
            <CardDescription>{t("userStatusDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {statusTotal === 0 ? (
              <EmptyChart message={t("noUsersYet")} />
            ) : (
              <ChartContainer config={statusChartConfig} className="mx-auto h-64 w-full">
                <PieChart accessibilityLayer>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={data.userStatusBreakdown}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={50}
                    strokeWidth={2}
                  >
                    {data.userStatusBreakdown.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status] ?? "hsl(0, 0%, 80%)"}
                      />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="status" />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Connections & Messages */}
      <Card>
        <CardHeader>
          <CardTitle>{t("activityOverTime")}</CardTitle>
          <CardDescription>{t("activityDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {activityData.every((d) => d.connections === 0 && d.messages === 0) ? (
            <EmptyChart message={t("noActivityData")} />
          ) : (
            <ChartContainer config={activityChartConfig} className="h-64 w-full">
              <LineChart data={activityData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  dataKey="connections"
                  type="monotone"
                  stroke="var(--color-connections)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  dataKey="messages"
                  type="monotone"
                  stroke="var(--color-messages)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Industries & Locations */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("topIndustries")}</CardTitle>
            <CardDescription>{t("topIndustriesDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topIndustries.length === 0 ? (
              <EmptyChart message={t("noIndustryData")} />
            ) : (
              <ChartContainer config={industryChartConfig} className="h-72 w-full">
                <BarChart
                  data={data.topIndustries}
                  layout="vertical"
                  accessibilityLayer
                  margin={{ left: 0 }}
                >
                  <CartesianGrid horizontal={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={80}
                    tickMargin={4}
                    tick={{ fontSize: 12 }}
                  />
                  <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("topLocations")}</CardTitle>
            <CardDescription>{t("topLocationsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topLocations.length === 0 ? (
              <EmptyChart message={t("noLocationData")} />
            ) : (
              <ChartContainer config={locationChartConfig} className="h-72 w-full">
                <BarChart
                  data={data.topLocations}
                  layout="vertical"
                  accessibilityLayer
                  margin={{ left: 0 }}
                >
                  <CartesianGrid horizontal={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={80}
                    tickMargin={4}
                    tick={{ fontSize: 12 }}
                  />
                  <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value.toLocaleString()}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
