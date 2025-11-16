import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
    getUserCompanions,
    getUserSessions,
    getBookmarkedCompanions,
    getUserConversations,
    getConversationStats,
    hasConversationHistoryAccess,
    getAllMonthlyReports,
    generateMonthlyReport,
} from "@/lib/actions/companion.actions";
import Image from "next/image";
import CompanionsList from "@/components/CompanionsList";
import ConversationCard from "@/components/ConversationCard";
import MonthlyReportCard from "@/components/MonthlyReportCard";
import GenerateReportButton from "@/components/GenerateReportButton";
import Link from "next/link";

const Profile = async () => {
    const user = await currentUser();

    if (!user) redirect("/sign-in");

    // Original data
    const companions = await getUserCompanions(user.id);
    const sessionHistory = await getUserSessions(user.id);
    const bookmarkedCompanions = await getBookmarkedCompanions(user.id);

    // Check if user has access to premium features (Core/Pro)
    const hasHistoryAccess = await hasConversationHistoryAccess();

    // New conversation history data (only if has access)
    const conversations = hasHistoryAccess ? await getUserConversations(20) : [];
    const stats = hasHistoryAccess ? await getConversationStats() : {
        totalConversations: 0,
        totalDuration: 0,
        averageDuration: 0,
        uniqueCompanions: 0,
    };

    // Get monthly reports (only if has access)
    let monthlyReports = hasHistoryAccess ? await getAllMonthlyReports() : [];

    // Auto-generate current month report if doesn't exist and has conversations
    if (hasHistoryAccess && conversations.length > 0) {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        const currentMonthReport = monthlyReports.find(
            r => r.month === currentMonth && r.year === currentYear
        );

        if (!currentMonthReport) {
            try {
                await generateMonthlyReport(currentMonth, currentYear);
                // Refetch reports after generation
                monthlyReports = await getAllMonthlyReports();
            } catch (err) {
                console.error('Failed to generate monthly report:', err);
            }
        }
    }

    return (
        <main className="min-lg:w-3/4">
            <section className="flex justify-between gap-4 max-sm:flex-col items-center">
                <div className="flex gap-4 items-center">
                    <Image
                        src={user.imageUrl}
                        alt={user.firstName!}
                        width={110}
                        height={110}
                        className="rounded-lg"
                    />
                    <div className="flex flex-col gap-2">
                        <h1 className="font-bold text-2xl">
                            {user.firstName} {user.lastName}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {user.emailAddresses[0].emailAddress}
                        </p>
                    </div>
                </div>
                <div className="flex gap-4 max-sm:flex-col max-sm:w-full">
                    <div className="border border-black rounded-lg p-3 gap-2 flex flex-col h-fit">
                        <div className="flex gap-2 items-center">
                            <Image
                                src="/icons/check.svg"
                                alt="checkmark"
                                width={22}
                                height={22}
                            />
                            <p className="text-2xl font-bold">{sessionHistory.length}</p>
                        </div>
                        <div>Lessons completed</div>
                    </div>
                    <div className="border border-black rounded-lg p-3 gap-2 flex flex-col h-fit">
                        <div className="flex gap-2 items-center">
                            <Image src="/icons/cap.svg" alt="cap" width={22} height={22} />
                            <p className="text-2xl font-bold">{companions.length}</p>
                        </div>
                        <div>Companions created</div>
                    </div>
                </div>
            </section>

            {/* Statistics Section - Only for Core/Pro users */}
            {hasHistoryAccess && (
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-border p-4 bg-white">
                        <p className="text-muted-foreground text-xs mb-1">Total Sessions</p>
                        <p className="text-2xl font-bold">{stats.totalConversations}</p>
                    </div>
                    <div className="rounded-border p-4 bg-white">
                        <p className="text-muted-foreground text-xs mb-1">Total Time</p>
                        <p className="text-2xl font-bold">{Math.round(stats.totalDuration / 60)}m</p>
                    </div>
                    <div className="rounded-border p-4 bg-white">
                        <p className="text-muted-foreground text-xs mb-1">Avg Duration</p>
                        <p className="text-2xl font-bold">{stats.averageDuration}s</p>
                    </div>
                    <div className="rounded-border p-4 bg-white">
                        <p className="text-muted-foreground text-xs mb-1">Companions Used</p>
                        <p className="text-2xl font-bold">{stats.uniqueCompanions}</p>
                    </div>
                </section>
            )}

            <Accordion type="multiple" defaultValue={hasHistoryAccess ? ["reports", "conversations"] : []}>
                {/* Monthly Reports Section - Only for Core/Pro users */}
                {hasHistoryAccess ? (
                    <AccordionItem value="reports">
                        <AccordionTrigger className="text-2xl font-bold">
                            Monthly Reports {monthlyReports.length > 0 && `(${monthlyReports.length})`}
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="mb-4">
                                <GenerateReportButton />
                            </div>
                            {monthlyReports.length === 0 ? (
                                <div className="rounded-border p-10 text-center bg-white">
                                    <p className="text-muted-foreground">
                                        No monthly reports yet. Complete some sessions to generate your first report!
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {monthlyReports.map((report) => (
                                        <MonthlyReportCard
                                            key={report.id}
                                            report={report}
                                        />
                                    ))}
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                ) : (
                    <AccordionItem value="reports" className="border-2 border-cta-gold">
                        <AccordionTrigger className="text-2xl font-bold">
                            <div className="flex items-center gap-2">
                                Monthly Reports
                                <span className="cta-badge text-xs">Core/Pro</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="rounded-border p-10 text-center bg-white flex flex-col items-center gap-4">
                                <div className="cta-badge">Premium Feature</div>
                                <h3 className="text-xl font-bold">Unlock Monthly Progress Reports</h3>
                                <p className="text-muted-foreground max-w-md">
                                    Get detailed monthly insights into your learning journey. Track subjects studied, time spent, and your progress over time.
                                </p>
                                <Link href="/subscription" className="btn-primary">
                                    Upgrade to Core or Pro
                                </Link>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )}

                {/* Conversation History Section - Only for Core/Pro users */}
                {hasHistoryAccess ? (
                    <AccordionItem value="conversations">
                        <AccordionTrigger className="text-2xl font-bold">
                            Conversation History {conversations.length > 0 && `(${conversations.length})`}
                        </AccordionTrigger>
                        <AccordionContent>
                            {conversations.length === 0 ? (
                                <div className="rounded-border p-10 text-center bg-white">
                                    <p className="text-muted-foreground">
                                        No conversations yet. Start a session to see your history here!
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {/* Reverse the array to show oldest first (ascending order) */}
                                    {conversations.slice().reverse().map((conversation) => (
                                        <ConversationCard
                                            key={conversation.id}
                                            conversation={conversation}
                                        />
                                    ))}
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                ) : (
                    <AccordionItem value="conversations" className="border-2 border-cta-gold">
                        <AccordionTrigger className="text-2xl font-bold">
                            <div className="flex items-center gap-2">
                                Conversation History
                                <span className="cta-badge text-xs">Core/Pro</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="rounded-border p-10 text-center bg-white flex flex-col items-center gap-4">
                                <div className="cta-badge">Premium Feature</div>
                                <h3 className="text-xl font-bold">Unlock Conversation History</h3>
                                <p className="text-muted-foreground max-w-md">
                                    Save and review your learning conversations. Track your progress with detailed statistics and transcripts.
                                </p>
                                <Link href="/subscription" className="btn-primary">
                                    Upgrade to Core or Pro
                                </Link>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )}

                {/* Original Sections */}
                <AccordionItem value="bookmarks">
                    <AccordionTrigger className="text-2xl font-bold">
                        Bookmarked Companions {`(${bookmarkedCompanions.length})`}
                    </AccordionTrigger>
                    <AccordionContent>
                        {bookmarkedCompanions.length === 0 ? (
                            <div className="rounded-border p-10 text-center bg-white">
                                <p className="text-muted-foreground">
                                    No bookmarked companions yet.
                                </p>
                            </div>
                        ) : (
                            <CompanionsList
                                companions={bookmarkedCompanions}
                                title="Bookmarked Companions"
                            />
                        )}
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="recent">
                    <AccordionTrigger className="text-2xl font-bold">
                        Recent Sessions {`(${sessionHistory.length})`}
                    </AccordionTrigger>
                    <AccordionContent>
                        {sessionHistory.length === 0 ? (
                            <div className="rounded-border p-10 text-center bg-white">
                                <p className="text-muted-foreground">
                                    No recent sessions yet.
                                </p>
                            </div>
                        ) : (
                            <CompanionsList
                                title="Recent Sessions"
                                companions={sessionHistory}
                            />
                        )}
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="companions">
                    <AccordionTrigger className="text-2xl font-bold">
                        My Companions {`(${companions.length})`}
                    </AccordionTrigger>
                    <AccordionContent>
                        {companions.length === 0 ? (
                            <div className="rounded-border p-10 text-center bg-white">
                                <p className="text-muted-foreground">
                                    You haven't created any companions yet.
                                </p>
                            </div>
                        ) : (
                            <CompanionsList title="My Companions" companions={companions} />
                        )}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </main>
    );
};

export default Profile;