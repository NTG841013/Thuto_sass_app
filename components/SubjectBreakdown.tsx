'use client';

import { getSubjectColor } from "@/lib/utils";
import Image from "next/image";

interface SubjectBreakdownProps {
    subjectPerformance: Record<string, {
        sessions: number;
        duration: number;
        completion: number;
    }>;
}

const SubjectBreakdown = ({ subjectPerformance }: SubjectBreakdownProps) => {
    const subjects = Object.entries(subjectPerformance).sort((a, b) => b[1].sessions - a[1].sessions);

    if (subjects.length === 0) {
        return null;
    }

    return (
        <section className="rounded-border p-6 bg-white mb-8">
            <h3 className="font-bold text-xl mb-4">Subject Performance</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map(([subject, data]) => (
                    <div key={subject} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div
                                className="size-12 flex items-center justify-center rounded-lg"
                                style={{ backgroundColor: getSubjectColor(subject) }}
                            >
                                <Image
                                    src={`/icons/${subject}.svg`}
                                    alt={subject}
                                    width={24}
                                    height={24}
                                />
                            </div>
                            <div>
                                <p className="font-semibold capitalize">{subject}</p>
                                <p className="text-sm text-muted-foreground">
                                    {data.sessions} {data.sessions === 1 ? 'session' : 'sessions'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-muted-foreground">Completion</span>
                                    <span className="font-medium">{data.completion}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-primary h-2 rounded-full transition-all"
                                        style={{ width: `${Math.min(data.completion, 100)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">
                                    {Math.round(data.duration / 60)}m
                                </span> total time
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default SubjectBreakdown;