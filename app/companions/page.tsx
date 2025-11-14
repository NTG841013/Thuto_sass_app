import {getAllCompanions, getBookmarkedCompanions} from "@/lib/actions/companion.actions";
import CompanionCard from "@/components/CompanionCard";
import {getSubjectColor} from "@/lib/utils";
import SearchInput from "@/components/SearchInput";
import SubjectFilter from "@/components/SubjectFilter";
import {auth} from "@clerk/nextjs/server";

interface CompanionsLibraryProps {
    searchParams: Promise<{
        subject?: string;
        topic?: string;
    }>;
}

const CompanionsLibrary = async ({ searchParams }: CompanionsLibraryProps) => {
    // ✅ Await the searchParams
    const filters = await searchParams;
    const subject = filters.subject ?? '';
    const topic = filters.topic ?? '';

    const companions = await getAllCompanions({ subject, topic });

    // Get bookmarked companions for the current user
    const { userId } = await auth();
    const bookmarkedCompanions = userId ? await getBookmarkedCompanions(userId) : [];
    const bookmarkedIds = new Set(bookmarkedCompanions.map(c => c.id));

    return (
        <main>
            <section className="flex justify-between gap-4 max-sm:flex-col">
                <h1>Companion Library</h1>
                <div className="flex gap-4">
                    <SearchInput />
                    <SubjectFilter />
                </div>
            </section>
            <section className="companions-grid">
                {companions.length === 0 ? (
                    <div className="col-span-full text-center py-10">
                        <p className="text-gray-500">No companions found. Create your first one!</p>
                    </div>
                ) : (
                    companions.map((companion) => (
                        <CompanionCard
                            key={companion.id}
                            {...companion}
                            color={getSubjectColor(companion.subject)}
                            isBookmarked={bookmarkedIds.has(companion.id)}
                        />
                    ))
                )}
            </section>
        </main>
    )
}

export default CompanionsLibrary