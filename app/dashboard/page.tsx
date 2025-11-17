import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
    getConversationStats,
    getAllMonthlyReports,
    getUserConversations,
    getLearningReminders,
} from "@/lib/actions/companion.actions";
import Link from "next/link";
import PerformanceCharts from "@/components/PerformanceCharts";
import LearningInsights from "@/components/LearningInsights";
import SubjectBreakdown from "@/components/SubjectBreakdown";
import DailyReminders from "@/components/DailyReminders";

const PerformanceDashboard = async () => {
    const user = await currentUser();
    if (!user) redirect("/sign-in");

    // Check if user is Pro
    const { has } = await auth();
    const isProUser = has({ plan: 'pro' });

    if (!isProUser) {
        return (
            <main className="min-lg:w-3/4">
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
                    <div className="rounded-full bg-cta-gold p-6">
                        <svg
                            className="w-16 h-16"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold mb-4">Pro Feature</h1>
                        <p className="text-muted-foreground max-w-md mb-6">
                            The Performance Dashboard is an exclusive feature for Pro members.
                            Upgrade to unlock advanced analytics, insights, and personalized learning metrics.
                        </p>
                        <div className="flex flex-col gap-3 items-center">
                            <Link href="/subscription" className="btn-primary px-8">
                                Upgrade to Pro
                            </Link>
                            <Link href="/companions/my-journey" className="text-sm text-muted-foreground hover:underline">
                                Return to My Journey
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    // Get all data for Pro users
    const stats = await getConversationStats();
    const monthlyReports = await getAllMonthlyReports();
    const recentConversations = await getUserConversations(10, 1, 'desc');
    const reminderSettings = await getLearningReminders();

    console.log('📊 Dashboard data:', {
        statsLoaded: !!stats,
        reportsCount: monthlyReports.length,
        conversationsCount: recentConversations.length,
        reminderSettings,
    });

    // Calculate additional metrics
    const totalHours = Math.round(stats.totalDuration / 3600 * 10) / 10;
    const averageSessionMinutes = Math.round(stats.averageDuration / 60);

    // Get learning streak
    const learningStreak = calculateLearningStreak(recentConversations);

    // Get subject performance
    const subjectPerformance = calculateSubjectPerformance(monthlyReports);

    return (
        <main className="min-lg:w-3/4">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Performance Dashboard</h1>
                    <p className="text-muted-foreground">Track your learning progress and insights</p>
                </div>
                <div className="cta-badge">Pro</div>
            </div>

            {/* Key Metrics */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="rounded-border p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <p className="text-sm text-blue-700 mb-1">Total Sessions</p>
                    <p className="text-4xl font-bold text-blue-900">{stats.totalConversations}</p>
                </div>
                <div className="rounded-border p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <p className="text-sm text-green-700 mb-1">Learning Hours</p>
                    <p className="text-4xl font-bold text-green-900">{totalHours}h</p>
                </div>
                <div className="rounded-border p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <p className="text-sm text-purple-700 mb-1">Avg Session</p>
                    <p className="text-4xl font-bold text-purple-900">{averageSessionMinutes}m</p>
                </div>
                <div className="rounded-border p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <p className="text-sm text-orange-700 mb-1">Learning Streak</p>
                    <p className="text-4xl font-bold text-orange-900">{learningStreak} days</p>
                </div>
            </section>

            {/* Charts */}
            <PerformanceCharts monthlyReports={monthlyReports} conversations={recentConversations} />

            {/* Subject Breakdown */}
            <SubjectBreakdown subjectPerformance={subjectPerformance} />

            {/* Daily Reminders - Full Width Section */}
            <section className="mb-8">
                <DailyReminders initialSettings={reminderSettings ? {
                    enabled: reminderSettings.enabled,
                    time: reminderSettings.reminder_time,
                    frequency: reminderSettings.frequency,
                    customDays: reminderSettings.custom_days,
                } : undefined} />
            </section>

            {/* Learning Insights */}
            <LearningInsights
                stats={stats}
                monthlyReports={monthlyReports}
                recentConversations={recentConversations}
            />
        </main>
    );
};

// Helper functions
function calculateLearningStreak(conversations: any[]): number {
    if (conversations.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let currentDate = new Date(today);

    for (let i = 0; i < 30; i++) { // Check last 30 days
        const hasSession = conversations.some(conv => {
            const convDate = new Date(conv.created_at);
            convDate.setHours(0, 0, 0, 0);
            return convDate.getTime() === currentDate.getTime();
        });

        if (hasSession) {
            streak++;
        } else if (streak > 0) {
            break; // Streak broken
        }

        currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
}

function calculateSubjectPerformance(monthlyReports: any[]) {
    const subjects: Record<string, { sessions: number; duration: number; completion: number }> = {};

    monthlyReports.forEach(report => {
        if (report.report_data?.subjectsStudied) {
            Object.entries(report.report_data.subjectsStudied).forEach(([subject, data]: [string, any]) => {
                if (!subjects[subject]) {
                    subjects[subject] = { sessions: 0, duration: 0, completion: 0 };
                }
                subjects[subject].sessions += data.sessions || 0;
                subjects[subject].duration += data.totalDuration || 0;
                subjects[subject].completion += data.completionPercentage || 0;
            });
        }
    });

    // Calculate averages
    Object.keys(subjects).forEach(subject => {
        const reportCount = monthlyReports.filter(r =>
            r.report_data?.subjectsStudied?.[subject]
        ).length;
        if (reportCount > 0) {
            subjects[subject].completion = Math.round(subjects[subject].completion / reportCount);
        }
    });

    return subjects;
}

export default PerformanceDashboard;