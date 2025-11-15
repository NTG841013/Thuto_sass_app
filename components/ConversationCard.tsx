'use client';

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getSubjectColor } from "@/lib/utils";
import { deleteConversation } from "@/lib/actions/companion.actions";
import { usePathname } from "next/navigation";

interface ConversationCardProps {
    conversation: {
        id: string;
        created_at: string;
        duration: number;
        messages: Array<{ role: string; content: string }>;
        companions: {
            id: string;
            name: string;
            subject: string;
            topic: string;
        };
    };
}

const ConversationCard = ({ conversation }: ConversationCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const pathname = usePathname();

    const { companions, messages, duration, created_at } = conversation;
    const messageCount = messages.length;
    const date = new Date(created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this conversation?')) return;

        setIsDeleting(true);
        try {
            await deleteConversation(conversation.id, pathname);
        } catch (error) {
            console.error('Error deleting conversation:', error);
            alert('Failed to delete conversation');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <article className="rounded-border p-6 bg-white">
            <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <div
                        className="size-16 flex items-center justify-center rounded-lg shrink-0"
                        style={{ backgroundColor: getSubjectColor(companions.subject) }}
                    >
                        <Image
                            src={`/icons/${companions.subject}.svg`}
                            alt={companions.subject}
                            width={30}
                            height={30}
                        />
                    </div>

                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <Link
                            href={`/companions/${companions.id}`}
                            className="font-bold text-xl hover:underline truncate"
                        >
                            {companions.name}
                        </Link>
                        <p className="text-sm text-muted-foreground truncate">{companions.topic}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <span>{date}</span>
                            <span>•</span>
                            <span>{messageCount} messages</span>
                            <span>•</span>
                            <span>{duration ? `${Math.round(duration / 60)}m ${duration % 60}s` : 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="px-3 py-2 rounded-lg border border-black hover:bg-gray-50 text-sm"
                    >
                        {isExpanded ? 'Hide' : 'View'}
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="px-3 py-2 rounded-lg border border-red-500 text-red-500 hover:bg-red-50 text-sm disabled:opacity-50"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <h3 className="font-semibold mb-3">Conversation</h3>
                    <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`p-3 rounded-lg ${
                                    message.role === 'assistant'
                                        ? 'bg-gray-100'
                                        : 'bg-primary/10 ml-8'
                                }`}
                            >
                                <p className="text-xs font-semibold mb-1 text-muted-foreground">
                                    {message.role === 'assistant' ? companions.name : 'You'}
                                </p>
                                <p className="text-sm">{message.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </article>
    );
};

export default ConversationCard;