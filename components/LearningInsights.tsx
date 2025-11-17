'use client';

interface LearningInsightsProps {
    stats: {
        totalConversations: number;
        totalDuration: number;
        averageDuration: number;
        uniqueCompanions: number;
    };
    monthlyReports: any[];
    recentConversations: any[];
}

const LearningInsights = ({ stats, monthlyReports, recentConversations }: LearningInsightsProps) => {
    const insights = generateInsights(stats, monthlyReports, recentConversations);

    return (
        <section className="rounded-border p-6 bg-white">
            <h3 className="font-bold text-xl mb-4">AI-Powered Insights</h3>
            <div className="grid md:grid-cols-2 gap-4">
                {insights.positive.length > 0 && (
                    <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">🎉</span>
                            <h4 className="font-semibold text-green-800">Achievements</h4>
                        </div>
                        <ul className="space-y-2">
                            {insights.positive.map((insight, idx) => (
                                <li key={idx} className="text-sm text-green-700 flex items-start gap-2">
                                    <span className="mt-0.5">•</span>
                                    <span>{insight}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {insights.recommendations.length > 0 && (
                    <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">💡</span>
                            <h4 className="font-semibold text-blue-800">Recommendations</h4>
                        </div>
                        <ul className="space-y-2">
                            {insights.recommendations.map((insight, idx) => (
                                <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                                    <span className="mt-0.5">•</span>
                                    <span>{insight}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Learning Patterns */}
            {insights.patterns.length > 0 && (
                <div className="mt-4 border border-purple-200 bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">📊</span>
                        <h4 className="font-semibold text-purple-800">Learning Patterns</h4>
                    </div>
                    <ul className="space-y-2">
                        {insights.patterns.map((pattern, idx) => (
                            <li key={idx} className="text-sm text-purple-700 flex items-start gap-2">
                                <span className="mt-0.5">•</span>
                                <span>{pattern}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
};

function generateInsights(stats: any, monthlyReports: any[], recentConversations: any[]) {
    const positive: string[] = [];
    const recommendations: string[] = [];
    const patterns: string[] = [];

    // Achievements
    if (stats.totalConversations >= 50) {
        positive.push(`Amazing! You've completed ${stats.totalConversations} learning sessions.`);
    } else if (stats.totalConversations >= 20) {
        positive.push(`Great progress! ${stats.totalConversations} sessions completed.`);
    }

    const totalHours = stats.totalDuration / 3600;
    if (totalHours >= 10) {
        positive.push(`You've invested ${Math.round(totalHours)} hours in learning!`);
    }

    if (stats.uniqueCompanions >= 5) {
        positive.push(`Exploring diverse topics with ${stats.uniqueCompanions} different companions.`);
    }

    // Recommendations
    if (stats.averageDuration < 300) { // Less than 5 minutes
        recommendations.push('Try extending your sessions to 10-15 minutes for better retention.');
    }

    if (recentConversations.length < 3) {
        recommendations.push('Stay consistent! Aim for at least 3 sessions per week.');
    }

    const lastMonthReport = monthlyReports[0];
    if (lastMonthReport?.report_data?.subjectsStudied) {
        const subjects = Object.keys(lastMonthReport.report_data.subjectsStudied);
        if (subjects.length === 1) {
            recommendations.push('Diversify your learning by exploring other subjects.');
        }
    }

    if (stats.totalConversations > 0 && stats.uniqueCompanions < 3) {
        recommendations.push('Try different companions to discover new learning styles.');
    }

    // Patterns
    if (recentConversations.length >= 7) {
        const daysWithSessions = new Set(
            recentConversations.map(c => new Date(c.created_at).toDateString())
        );
        if (daysWithSessions.size >= 5) {
            patterns.push('You\'re building a strong daily learning habit!');
        }
    }

    if (monthlyReports.length >= 2) {
        const current = monthlyReports[0]?.total_sessions || 0;
        const previous = monthlyReports[1]?.total_sessions || 0;
        if (current > previous) {
            const growth = Math.round(((current - previous) / previous) * 100);
            patterns.push(`Your session count increased by ${growth}% this month!`);
        }
    }

    return { positive, recommendations, patterns };
}

export default LearningInsights;