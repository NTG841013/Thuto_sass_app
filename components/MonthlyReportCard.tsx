'use client';

interface MonthlyReportCardProps {
    report: {
        id: string;
        month: number;
        year: number;
        total_sessions: number;
        total_duration: number;
        subjects_studied: Record<string, number>;
        report_data: {
            totalSessions: number;
            totalDuration: number;
            averageDuration: number;
            mostStudiedSubject?: string;
            strengths?: string[];
            areasForImprovement?: string[];
            subjectsStudied: Record<string, {
                sessions: number;
                totalDuration: number;
                expectedDuration: number;
                completionPercentage: number;
                companions: string[];
            }>;
        };
    };
}

const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const MonthlyReportCard = ({ report }: MonthlyReportCardProps) => {
    const { month, year, total_sessions, total_duration, report_data } = report;
    const monthName = monthNames[month - 1];

    return (
        <article className="rounded-border p-6 bg-white">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-2xl font-bold">{monthName} {year}</h3>
                    <p className="text-sm text-muted-foreground">Monthly Progress Report</p>
                </div>
                <div className="cta-badge">Report</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Sessions</p>
                    <p className="text-2xl font-bold">{total_sessions}</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Total Time</p>
                    <p className="text-2xl font-bold">{Math.round(total_duration / 60)}m</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Avg Duration</p>
                    <p className="text-2xl font-bold">{report_data.averageDuration}s</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Top Subject</p>
                    <p className="text-lg font-bold capitalize">
                        {report_data.mostStudiedSubject || 'N/A'}
                    </p>
                </div>
            </div>

            {Object.keys(report_data.subjectsStudied).length > 0 && (
                <>
                    <div>
                        <h4 className="font-semibold mb-3">Subjects Studied</h4>
                        <div className="flex flex-col gap-3">
                            {Object.entries(report_data.subjectsStudied)
                                .sort((a, b) => b[1].sessions - a[1].sessions)
                                .map(([subject, data]) => {
                                    const completedSeconds = data.totalDuration;
                                    const expectedSeconds = data.expectedDuration;
                                    const remainingSeconds = Math.max(0, expectedSeconds - completedSeconds);

                                    // Format time to show minutes and seconds
                                    const formatTime = (seconds: number) => {
                                        const mins = Math.floor(seconds / 60);
                                        const secs = seconds % 60;
                                        if (mins === 0) return `${secs}s`;
                                        if (secs === 0) return `${mins}m`;
                                        return `${mins}m ${secs}s`;
                                    };

                                    return (
                                        <div
                                            key={subject}
                                            className="border border-gray-200 rounded-lg p-4"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-semibold capitalize text-lg">{subject}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {data.sessions} {data.sessions === 1 ? 'session' : 'sessions'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-primary">
                                                        {data.completionPercentage}%
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">Complete</p>
                                                </div>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                                <div
                                                    className="bg-primary h-2 rounded-full transition-all"
                                                    style={{ width: `${Math.min(data.completionPercentage, 100)}%` }}
                                                />
                                            </div>

                                            <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">
                                                <span className="font-medium text-foreground">{formatTime(completedSeconds)}</span> completed
                                            </span>
                                                {remainingSeconds > 0 && (
                                                    <span className="text-muted-foreground">
                                                    <span className="font-medium text-foreground">{formatTime(remainingSeconds)}</span> remaining
                                                </span>
                                                )}
                                            </div>

                                            {data.companions && data.companions.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-gray-100">
                                                    <p className="text-xs text-muted-foreground mb-1">Companions:</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {data.companions.map((companion, idx) => (
                                                            <span key={idx} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                                            {companion}
                                                        </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* Strengths and Areas for Improvement */}
                    {(report_data.strengths || report_data.areasForImprovement) && (
                        <div className="grid md:grid-cols-2 gap-4 mt-6">
                            {report_data.strengths && report_data.strengths.length > 0 && (
                                <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                                    <h4 className="font-semibold text-green-800 mb-2">💪 Strengths</h4>
                                    <ul className="space-y-1">
                                        {report_data.strengths.map((strength, idx) => (
                                            <li key={idx} className="text-sm text-green-700">• {strength}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {report_data.areasForImprovement && report_data.areasForImprovement.length > 0 && (
                                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                                    <h4 className="font-semibold text-blue-800 mb-2">📈 Areas for Growth</h4>
                                    <ul className="space-y-1">
                                        {report_data.areasForImprovement.map((area, idx) => (
                                            <li key={idx} className="text-sm text-blue-700">• {area}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </article>
    );
};

export default MonthlyReportCard;