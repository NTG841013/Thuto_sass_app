'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

interface PerformanceChartsProps {
    monthlyReports: any[];
    conversations: any[];
}

const PerformanceCharts = ({ monthlyReports, conversations }: PerformanceChartsProps) => {
    // Prepare monthly progress data
    const monthlyData = monthlyReports.slice(0, 6).reverse().map(report => ({
        month: `${getMonthName(report.month)}`,
        sessions: report.total_sessions,
        hours: Math.round(report.total_duration / 3600 * 10) / 10,
    }));

    // Prepare weekly activity data
    const weeklyData = prepareWeeklyData(conversations);

    // Prepare subject distribution
    const subjectData = prepareSubjectData(monthlyReports);

    const chartConfig = {
        sessions: {
            label: "Sessions",
            color: "hsl(var(--chart-1))",
        },
        hours: {
            label: "Hours",
            color: "hsl(var(--chart-2))",
        },
    };

    return (
        <div className="grid gap-6 mb-8">
            {/* Monthly Progress - Full Width */}
            <Card>
                <CardHeader>
                    <CardTitle>Monthly Progress</CardTitle>
                    <CardDescription>Your learning journey over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                    {monthlyData.length > 0 ? (
                        <ChartContainer config={chartConfig} className="h-[300px]">
                            <AreaChart data={monthlyData}>
                                <defs>
                                    <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                                    </linearGradient>
                                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="month" className="text-xs" />
                                <YAxis className="text-xs" />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Area
                                    type="monotone"
                                    dataKey="sessions"
                                    stroke="hsl(var(--chart-1))"
                                    fill="url(#colorSessions)"
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="hours"
                                    stroke="hsl(var(--chart-2))"
                                    fill="url(#colorHours)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ChartContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                            No data available yet. Complete some sessions to see your progress!
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Weekly Activity & Subject Distribution */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Weekly Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle>Weekly Activity</CardTitle>
                        <CardDescription>Sessions this week</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {weeklyData.length > 0 ? (
                            <ChartContainer config={chartConfig} className="h-[250px]">
                                <BarChart data={weeklyData}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="day" className="text-xs" />
                                    <YAxis className="text-xs" />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar
                                        dataKey="sessions"
                                        fill="hsl(var(--chart-3))"
                                        radius={[8, 8, 0, 0]}
                                    />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                                No activity this week yet
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Subject Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Subject Focus</CardTitle>
                        <CardDescription>Time spent per subject</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {subjectData.length > 0 ? (
                            <ChartContainer config={chartConfig} className="h-[250px]">
                                <BarChart data={subjectData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis type="number" className="text-xs" />
                                    <YAxis
                                        dataKey="subject"
                                        type="category"
                                        className="text-xs capitalize"
                                        width={80}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar
                                        dataKey="minutes"
                                        fill="hsl(var(--chart-4))"
                                        radius={[0, 8, 8, 0]}
                                    />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                                No subject data yet
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

function getMonthName(month: number): string {
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return names[month - 1];
}

function prepareWeeklyData(conversations: any[]) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const weekData = days.map((day, index) => ({
        day,
        sessions: 0,
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - index)),
    }));

    conversations.forEach(conv => {
        const convDate = new Date(conv.created_at);
        const daysDiff = Math.floor((today.getTime() - convDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff >= 0 && daysDiff < 7) {
            const dayIndex = convDate.getDay();
            weekData[dayIndex].sessions++;
        }
    });

    return weekData.map(({ day, sessions }) => ({ day, sessions }));
}

function prepareSubjectData(monthlyReports: any[]) {
    const subjects: Record<string, number> = {};

    monthlyReports.forEach(report => {
        if (report.report_data?.subjectsStudied) {
            Object.entries(report.report_data.subjectsStudied).forEach(([subject, data]: [string, any]) => {
                subjects[subject] = (subjects[subject] || 0) + (data.totalDuration || 0);
            });
        }
    });

    return Object.entries(subjects)
        .map(([subject, duration]) => ({
            subject,
            minutes: Math.round(duration / 60),
        }))
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 5); // Top 5 subjects
}

export default PerformanceCharts;