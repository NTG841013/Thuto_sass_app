'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { addBookmark, removeBookmark } from "@/lib/actions/companion.actions";
import { usePathname } from "next/navigation";

interface CompanionCardProps {
    id: string;
    name: string;
    topic: string;
    subject: string;
    duration: number;
    color: string;
    isBookmarked?: boolean;
}

const CompanionCard = ({id, name, topic, subject, duration, color, isBookmarked = false}: CompanionCardProps) => {
    const [bookmarked, setBookmarked] = useState(isBookmarked);
    const [isPending, startTransition] = useTransition();
    const pathname = usePathname();

    const handleBookmark = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent Link navigation
        e.stopPropagation();

        startTransition(async () => {
            try {
                if (bookmarked) {
                    await removeBookmark(id, pathname);
                    setBookmarked(false);
                } else {
                    await addBookmark(id, pathname);
                    setBookmarked(true);
                }
            } catch (error) {
                console.error('Error toggling bookmark:', error);
            }
        });
    };

    return (
        <article className="companion-card" style={{ backgroundColor: color}}>
            <div className="flex justify-between items-center">
                <div className="subject-badge">{subject}</div>
                <button
                    className="companion-bookmark"
                    onClick={handleBookmark}
                    disabled={isPending}
                    aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
                >
                    <Image
                        src={bookmarked ? "/icons/bookmark-filled.svg" : "/icons/bookmark.svg"}
                        alt="bookmark"
                        width={24}
                        height={24}
                        className={isPending ? "opacity-50" : ""}
                    />
                </button>
            </div>
            <h2 className="text-2xl font-bold">{name}</h2>
            <p className="text-sm">{topic}</p>
            <div className="flex items-center gap-2">
                <Image src="/icons/clock.svg" alt="duration" width={13.5} height={13.5} />
                <p className="text-sm">{duration} minutes</p>
            </div>
            <Link href={`/companions/${id}`} className="w-full">
                <button className="btn-primary w-full justify-center">
                    Launch Lesson
                </button>
            </Link>
        </article>
    )
}

export default CompanionCard