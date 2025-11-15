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
} from "@/lib/actions/companion.actions";
import Image from "next/image";
import CompanionsList from "@/components/CompanionsList";
import ConversationCard from "@/components/ConversationCard";

const Profile = async () => {
    const user = await currentUser();

    if (!user) redirect("/sign-in");

    // Original data
    const companions = await getUserCompanions(user.id);
    const sessionHistory = await getUserSessions(user.id);
    const bookmarkedCompanions = await getBookmarkedCompanions(user.id);

    // New conversation history data
    const conversations = await getUserConversations(20);
    const stats = await getConversationStats();

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

            {/* New Statistics Section */}
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

            <Accordion type="multiple" defaultValue={["conversations"]}>
                {/* New Conversation History Section */}
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
                                {conversations.map((conversation) => (
                                    <ConversationCard
                                        key={conversation.id}
                                        conversation={conversation}
                                    />
                                ))}
                            </div>
                        )}
                    </AccordionContent>
                </AccordionItem>

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