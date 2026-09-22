"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { AreaChart } from "@/components/charts/AreaChart";
import { RangeFilter } from "@/components/charts/RangeFilter";
import { BarList } from "@/components/charts/BarList";
import { StackedBar } from "@/components/charts/StackedBar";
import { useAdminDisplayName } from "@/lib/auth/adminSession";
import { getOverview, type AdminOverview } from "@/lib/api/overview";
import { ApiError } from "@/lib/api/http";
import {
  buildActivityRanges,
  buildResourcesByType,
  buildStudentsByExam,
  buildStudentsByLevel,
  formatAvgStudyTime,
  DEFAULT_ACTIVITY_RANGE,
  type ActivityRangeKey,
} from "@/lib/dashboard/analytics";
import {
  StatStudentsIcon,
  StatActivityIcon,
  StatLibraryIcon,
  StatStudyTimeIcon,
} from "@/assets/icons";

export default function DashboardPage() {
  const displayName = useAdminDisplayName();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<ActivityRangeKey>(DEFAULT_ACTIVITY_RANGE);

  useEffect(() => {
    // Aborted on unmount so a slow response can't call setState after the
    // page has navigated away.
    const controller = new AbortController();

    getOverview()
      .then((data) => {
        if (!controller.signal.aborted) setOverview(data);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        // A 401 is already handled upstream by the request wrapper, which
        // refreshes or signs the admin out — nothing useful to show here.
        if (err instanceof ApiError && err.status === 401) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load the dashboard. Check your connection and try again.",
        );
      });

    return () => controller.abort();
  }, []);

  const isLoading = overview === null;

  // Counted from the same response throughout, so a figure here always
  // matches the chart beside it and the page its card links to.
  const stats = [
    {
      label: "Total Students",
      value: overview ? overview.students.total.toLocaleString() : "—",
      caption: "All time",
      icon: <StatStudentsIcon className="h-6 w-6" />,
      href: "/users",
    },
    {
      label: "Active Today",
      value: overview ? overview.students.activeToday.toLocaleString() : "—",
      caption: "Opened the app today",
      icon: <StatActivityIcon className="h-6 w-6" />,
    },
    {
      label: "Resources Published",
      value: overview ? overview.library.total.toLocaleString() : "—",
      caption: "Live in the library",
      icon: <StatLibraryIcon className="h-6 w-6" />,
      href: "/resources",
    },
    {
      label: "Avg. Study Time",
      value: overview ? formatAvgStudyTime(overview.students.avgWeekdayHours) : "—",
      caption: "Daily target per active student",
      icon: <StatStudyTimeIcon className="h-6 w-6" />,
    },
  ];

  const ranges = overview ? buildActivityRanges(overview) : null;
  const activeRange = ranges?.[range] ?? null;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* The admin's name is read from storage, so on a refresh it only exists
          after hydration. Holding a placeholder until then stops the heading
          flashing a fallback name and re-writing itself. */}
      <PageHeader
        title={
          isLoading ? (
            <span className="flex h-8 items-center lg:h-9">
              <Skeleton className="h-7 w-56 rounded-lg sm:w-72" />
            </span>
          ) : (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="block"
            >
              Welcome back, {displayName}
            </motion.span>
          )
        }
        subtitle="Here's what's happening across prepex today."
      />

      {error && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {error}
        </motion.p>
      )}

      {/* The cards themselves are always on screen — only the figures inside
          them swap between placeholder and value, so nothing reflows when the
          data lands. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} loading={isLoading} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Engagement over time is the dashboard's lead question, so it gets
            the widest card and its own time range. */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Daily Active Students"
            subtitle={activeRange?.caption ?? "Students who opened a session"}
            action={<RangeFilter value={range} onChange={setRange} />}
          />
          {!activeRange ? (
            <ChartSkeleton height="h-[220px]" />
          ) : (
            // Keyed on the range so switching it re-runs the grow-in, which
            // reads as the bars re-drawing rather than jumping to new heights.
            <Fade key={range}>
              <AreaChart
                points={activeRange.points}
                seriesLabel="Active students"
                ariaLabel={`Active students, ${activeRange.label}`}
              />
            </Fade>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Students by Target Exam"
            subtitle="Share of the student body"
          />
          {!overview ? (
            <ChartSkeleton height="h-[180px]" />
          ) : (
            <Fade>
              <StackedBar
                segments={buildStudentsByExam(overview)}
                ariaLabel="Students by target exam"
              />
            </Fade>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Library by Content Type"
            subtitle="Published items across all subjects"
          />
          {!overview ? (
            <ChartSkeleton height="h-[180px]" />
          ) : (
            <Fade>
              <BarList
                items={buildResourcesByType(overview)}
                ariaLabel="Library by content type"
              />
            </Fade>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Students by Class"
            subtitle="Academic level given during onboarding"
          />
          {!overview ? (
            <ChartSkeleton height="h-[180px]" />
          ) : (
            <Fade>
              <BarList
                items={buildStudentsByLevel(overview)}
                ariaLabel="Students by class"
              />
            </Fade>
          )}
        </Card>
      </div>
    </div>
  );
}

function Fade({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/** Holds the chart's footprint so the card doesn't resize when data lands. */
function ChartSkeleton({ height }: { height: string }) {
  return <Skeleton className={`w-full rounded-xl ${height}`} />;
}
