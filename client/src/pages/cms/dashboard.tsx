import * as React from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  Building2,
  CalendarDays,
  GalleryHorizontalEnd,
  GraduationCap,
  Images,
  Layers,
  Newspaper,
  Plus,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useResource } from "@/hooks/use-resource";
import { formatDate, toPlainText, truncate } from "@/lib/utils";

interface Summary {
  schoolCount: number;
  departmentCount: number;
  programCount: number;
  programTypeCount: number;
  staffCount: number;
  galleryCount: number;
  heroCount: number;
  eventCount: number;
  newsCount: number;
  aiCount: number;
}

interface NewsItem {
  _id: string;
  title: string;
  content: string;
  newsTag?: string;
  isActive?: boolean;
  createdAt?: string;
  images?: { url: string }[];
}

interface EventItem {
  _id: string;
  title: string;
  date?: string;
  location?: string;
}

const STAT_CARDS: {
  key: keyof Summary;
  label: string;
  icon: LucideIcon;
  href: string;
  tint: string;
}[] = [
  { key: "newsCount", label: "News", icon: Newspaper, href: "/news", tint: "text-sky-500 bg-sky-500/10" },
  { key: "eventCount", label: "Events", icon: CalendarDays, href: "/events", tint: "text-violet-500 bg-violet-500/10" },
  { key: "galleryCount", label: "Gallery", icon: GalleryHorizontalEnd, href: "/gallery", tint: "text-emerald-500 bg-emerald-500/10" },
  { key: "heroCount", label: "Hero Images", icon: Images, href: "/hero-images", tint: "text-amber-500 bg-amber-500/10" },
  { key: "schoolCount", label: "Faculties", icon: Building2, href: "/faculties", tint: "text-rose-500 bg-rose-500/10" },
  { key: "departmentCount", label: "Departments", icon: Layers, href: "/departments", tint: "text-indigo-500 bg-indigo-500/10" },
  { key: "programCount", label: "Programs", icon: GraduationCap, href: "/programs", tint: "text-fuchsia-500 bg-fuchsia-500/10" },
  { key: "aiCount", label: "AI Entries", icon: Bot, href: "/ai", tint: "text-teal-500 bg-teal-500/10" },
];

const CHART_COLORS = [
  "#0ea5e9",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#6366f1",
  "#d946ef",
  "#14b8a6",
];

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  tint,
  loading,
}: {
  label: string;
  value?: number;
  icon: LucideIcon;
  href: string;
  tint: string;
  loading: boolean;
}) {
  return (
    <Link to={href} className="group">
      <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-5">
          <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tint}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="mt-1 h-7 w-12" />
            ) : (
              <p className="text-2xl font-semibold tabular-nums">{value ?? 0}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const summary = useResource<Summary>(
    "/api/dashboard-summary",
    (p) => p.data as Summary,
  );

  const recentNews = useResource<NewsItem[]>(
    "/api/v1/admin/news?page=1&limit=5",
    (p) => (p.data ?? []) as NewsItem[],
  );

  const upcomingEvents = useResource<EventItem[]>(
    "/api/events?page=1&limit=5",
    (p) => (p.events ?? []) as EventItem[],
  );

  const chartData = React.useMemo(() => {
    if (!summary.data) return [];
    return STAT_CARDS.map((c) => ({
      name: c.label,
      value: summary.data![c.key] ?? 0,
    }));
  }, [summary.data]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="An overview of everything published through the CMS."
        actions={
          <Button asChild>
            <Link to="/news/new">
              <Plus />
              New article
            </Link>
          </Button>
        }
      />

      {summary.error ? (
        <Card>
          <ErrorState message={summary.error} onRetry={summary.reload} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAT_CARDS.map((card) => (
            <StatCard
              key={card.key}
              label={card.label}
              value={summary.data?.[card.key]}
              icon={card.icon}
              href={card.href}
              tint={card.tint}
              loading={summary.loading}
            />
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Content distribution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Content distribution</CardTitle>
            <CardDescription>
              How records are spread across the CMS.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            {summary.loading ? (
              <Skeleton className="mx-6 h-[280px]" />
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={32}
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <ReTooltip
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        fontSize: 12,
                        color: "hsl(var(--popover-foreground))",
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming events */}
        <Card>
          <CardHeader>
            <CardTitle>Latest events</CardTitle>
            <CardDescription>Most recent entries.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingEvents.loading ? (
              <div className="space-y-3 px-6 pb-6">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : upcomingEvents.error ? (
              <ErrorState
                message={upcomingEvents.error}
                onRetry={upcomingEvents.reload}
              />
            ) : !upcomingEvents.data?.length ? (
              <EmptyState
                icon={CalendarDays}
                title="No events yet"
                description="Events you create will show up here."
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link to="/events">Add an event</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y">
                {upcomingEvents.data.map((ev) => (
                  <li key={ev._id} className="px-6 py-3">
                    <p className="truncate text-sm font-medium">{ev.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(ev.date)}
                      {ev.location ? ` · ${ev.location}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent news */}
      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Recent news</CardTitle>
            <CardDescription>The five most recently created articles.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/news">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentNews.loading ? (
            <div className="space-y-3 px-6 pb-6">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : recentNews.error ? (
            <ErrorState message={recentNews.error} onRetry={recentNews.reload} />
          ) : !recentNews.data?.length ? (
            <EmptyState
              icon={Newspaper}
              title="No news yet"
              description="Publish your first article to see it here."
              action={
                <Button asChild size="sm">
                  <Link to="/news/new">
                    <Plus />
                    New article
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y">
              {recentNews.data.map((item) => (
                <li key={item._id}>
                  <Link
                    to={`/news/${item._id}/edit`}
                    className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/50"
                  >
                    {item.images?.[0]?.url ? (
                      <img
                        src={item.images[0].url}
                        alt=""
                        className="h-12 w-16 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Newspaper className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {truncate(toPlainText(item.content), 90)}
                      </p>
                    </div>

                    <div className="hidden shrink-0 items-center gap-3 sm:flex">
                      <Badge variant={item.isActive ? "success" : "secondary"}>
                        {item.isActive ? "Active" : "Draft"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
