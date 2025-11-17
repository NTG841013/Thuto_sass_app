'use server';

import {auth} from "@clerk/nextjs/server";
import {createSupabaseClient} from "@/lib/supabase";
import { revalidatePath } from "next/cache";

// ==================== COMPANION CRUD ====================

export const createCompanion = async (formData: CreateCompanion) => {
    const { userId: author } = await auth();
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('companions')
        .insert({...formData, author })
        .select();

    if(error || !data) throw new Error(error?.message || 'Failed to create a companion');

    return data[0];
}

export const getAllCompanions = async ({ limit = 10, page = 1, subject, topic }: GetAllCompanions) => {
    const supabase = createSupabaseClient();

    let query = supabase.from('companions').select();

    if(subject && topic) {
        query = query.ilike('subject', `%${subject}%`)
            .or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`)
    } else if(subject) {
        query = query.ilike('subject', `%${subject}%`)
    } else if(topic) {
        query = query.or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`)
    }

    query = query.range((page - 1) * limit, page * limit - 1);

    const { data: companions, error } = await query;

    if(error) {
        console.error('❌ getAllCompanions error:', error);
        throw new Error(`Failed to fetch companions: ${error.message || JSON.stringify(error)}`);
    }

    return companions;
}

export const getCompanion = async (id: string) => {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('companions')
        .select()
        .eq('id', id);

    if(error) return console.log(error);

    return data[0];
}

export const getUserCompanions = async (userId: string) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from('companions')
        .select()
        .eq('author', userId)

    if(error) throw new Error(error.message);

    return data;
}

export const newCompanionPermissions = async () => {
    const { userId, has } = await auth();
    const supabase = createSupabaseClient();

    let limit = 3; // ✅ Default limit for free users

    if(has({ plan: 'pro' })) {
        return true; // Unlimited for pro users
    } else if(has({ feature: "3_companion_limit" })) {
        limit = 3;
    } else if(has({ feature: "10_companion_limit" })) {
        limit = 10;
    }

    const { data, error } = await supabase
        .from('companions')
        .select('id', { count: 'exact' })
        .eq('author', userId)

    if(error) throw new Error(error.message);

    const companionCount = data?.length || 0;

    return companionCount < limit;
}

// ==================== SESSION HISTORY ====================

export const addToSessionHistory = async (companionId: string, duration?: number) => {
    const { userId } = await auth();
    const supabase = createSupabaseClient();

    const insertData: any = {
        companion_id: companionId,
        user_id: userId,
    };

    // Add duration if provided
    if (duration !== undefined) {
        insertData.duration = duration;
    }

    const { data, error } = await supabase
        .from('session_history')
        .insert(insertData)
        .select();

    if(error) throw new Error(error.message);

    return data;
}

export const getRecentSessions = async (limit = 10) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from('session_history')
        .select(`companions:companion_id (*)`)
        .order('created_at', { ascending: false })
        .limit(limit * 3)

    if(error) throw new Error(error.message);

    // ✅ Deduplicate companions by ID
    const companionsMap = new Map();
    data.forEach(({ companions }) => {
        if (companions && !companionsMap.has(companions.id)) {
            companionsMap.set(companions.id, companions);
        }
    });

    return Array.from(companionsMap.values()).slice(0, limit);
}

export const getUserSessions = async (userId: string, limit = 10) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from('session_history')
        .select(`companions:companion_id (*)`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit * 3)

    if(error) throw new Error(error.message);

    // ✅ Deduplicate companions by ID
    const companionsMap = new Map();
    data.forEach(({ companions }) => {
        if (companions && !companionsMap.has(companions.id)) {
            companionsMap.set(companions.id, companions);
        }
    });

    return Array.from(companionsMap.values()).slice(0, limit);
}

// ==================== BOOKMARKS ====================

export const addBookmark = async (companionId: string, path: string) => {
    const { userId } = await auth();
    if (!userId) return;
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from("bookmarks").insert({
        companion_id: companionId,
        user_id: userId,
    });
    if (error) {
        throw new Error(error.message);
    }
    revalidatePath(path);
    return data;
};

export const removeBookmark = async (companionId: string, path: string) => {
    const { userId } = await auth();
    if (!userId) return;
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("companion_id", companionId)
        .eq("user_id", userId);
    if (error) {
        throw new Error(error.message);
    }
    revalidatePath(path);
    return data;
};

export const getBookmarkedCompanions = async (userId: string) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from("bookmarks")
        .select(`companions:companion_id (*)`)
        .eq("user_id", userId);
    if (error) {
        throw new Error(error.message);
    }
    return data.map(({ companions }) => companions);
};

// ==================== CONVERSATION HISTORY (NEW) ====================

// Check if user has access to conversation history features
// Free (3_companion_limit) = No access
// Core (10_companion_limit) = Has access
// Pro (unlimited/pro plan) = Has access
export const hasConversationHistoryAccess = async () => {
    const { has } = await auth();

    // Pro users (unlimited companions) have access
    if (has({ plan: 'pro' })) return true;

    // Core users (10 companion limit) have access
    if (has({ feature: "10_companion_limit" })) return true;

    // Free users (3 companion limit) don't have access
    return false;
};

export const saveConversationHistory = async ({
                                                  sessionId,
                                                  companionId,
                                                  messages,
                                                  duration,
                                              }: {
    sessionId: string;
    companionId: string;
    messages: SavedMessage[];
    duration?: number;
}) => {
    const { userId } = await auth();
    if (!userId) {
        console.error('❌ No userId found when saving conversation');
        throw new Error('User not authenticated');
    }

    // ✅ Check if user has access to conversation history
    const hasAccess = await hasConversationHistoryAccess();
    if (!hasAccess) {
        console.log('ℹ️ User does not have access to conversation history (Basic plan)');
        return null; // Don't save for basic plan users
    }

    console.log('💾 Attempting to save conversation:', {
        sessionId,
        companionId,
        userId,
        messageCount: messages.length,
        duration,
    });

    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('conversation_history')
        .insert({
            session_id: sessionId,
            companion_id: companionId,
            user_id: userId,
            messages: messages,
            duration: duration,
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Error saving conversation:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw new Error(`Failed to save conversation: ${error.message}`);
    }

    console.log('✅ Conversation saved successfully:', data);
    return data;
};

export const getUserConversations = async (limit = 20, page = 1, sortOrder: 'asc' | 'desc' = 'asc') => {
    const { userId } = await auth();
    if (!userId) throw new Error('User not authenticated');

    // ✅ Check access
    const hasAccess = await hasConversationHistoryAccess();
    if (!hasAccess) {
        return []; // Return empty array for basic plan users
    }

    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('conversation_history')
        .select(`
            *,
            companions:companion_id (id, name, subject, topic, duration),
            session_history:session_id (created_at)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: sortOrder === 'asc' }) // ✅ Configurable sort order
        .range((page - 1) * limit, page * limit - 1);

    if (error) throw new Error(error.message);

    console.log('📊 getUserConversations:', {
        count: data.length,
        sortOrder,
        ascending: sortOrder === 'asc',
        firstConversation: data[0] ? {
            id: data[0].id.substring(0, 8),
            created_at: data[0].created_at,
        } : null,
        lastConversation: data[data.length - 1] ? {
            id: data[data.length - 1].id.substring(0, 8),
            created_at: data[data.length - 1].created_at,
        } : null,
        allDates: data.map(d => d.created_at),
    });

    return data;
};

export const getCompanionConversations = async (companionId: string, limit = 10) => {
    const { userId } = await auth();
    if (!userId) throw new Error('User not authenticated');

    // ✅ Check access
    const hasAccess = await hasConversationHistoryAccess();
    if (!hasAccess) {
        return [];
    }

    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('conversation_history')
        .select(`
            *,
            companions:companion_id (id, name, subject, topic)
        `)
        .eq('user_id', userId)
        .eq('companion_id', companionId)
        .order('created_at', { ascending: false }) // ✅ Descending order (newest first from DB)
        .limit(limit);

    if (error) throw new Error(error.message);

    return data;
};

export const getConversationById = async (conversationId: string) => {
    const { userId } = await auth();
    if (!userId) throw new Error('User not authenticated');

    // ✅ Check access
    const hasAccess = await hasConversationHistoryAccess();
    if (!hasAccess) {
        throw new Error('Access denied: Upgrade to Core or Pro plan');
    }

    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('conversation_history')
        .select(`
            *,
            companions:companion_id (id, name, subject, topic, duration)
        `)
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();

    if (error) throw new Error(error.message);

    return data;
};

export const deleteConversation = async (conversationId: string, path: string) => {
    const { userId } = await auth();
    if (!userId) throw new Error('User not authenticated');

    // ✅ Check access
    const hasAccess = await hasConversationHistoryAccess();
    if (!hasAccess) {
        throw new Error('Access denied: Upgrade to Core or Pro plan');
    }

    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('conversation_history')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', userId);

    if (error) throw new Error(error.message);

    revalidatePath(path);
    return data;
};

export const getConversationStats = async () => {
    const { userId } = await auth();
    if (!userId) throw new Error('User not authenticated');

    // ✅ Check access
    const hasAccess = await hasConversationHistoryAccess();
    if (!hasAccess) {
        return {
            totalConversations: 0,
            totalDuration: 0,
            averageDuration: 0,
            uniqueCompanions: 0,
        };
    }

    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('conversation_history')
        .select('duration, created_at, companion_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }); // ✅ Descending order

    if (error) throw new Error(error.message);

    // Calculate statistics
    const totalConversations = data.length;
    const totalDuration = data.reduce((sum, conv) => sum + (conv.duration || 0), 0);
    const uniqueCompanions = new Set(data.map(conv => conv.companion_id)).size;

    return {
        totalConversations,
        totalDuration,
        averageDuration: totalConversations > 0 ? Math.round(totalDuration / totalConversations) : 0,
        uniqueCompanions,
    };
};

// ==================== PREMIUM FEATURES (Core/Pro Only) ====================

// Check if user has access to premium features (recaps, reports)
// Free (3_companion_limit) = No access
// Core (10_companion_limit) = Has access
// Pro (unlimited/pro plan) = Has access
export const hasPremiumFeatureAccess = async () => {
    const { has } = await auth();

    // Pro users (unlimited companions) have access
    if (has({ plan: 'pro' })) return true;

    // Core users (10 companion limit) have access
    if (has({ feature: "10_companion_limit" })) return true;

    // Free users (3 companion limit) don't have access
    return false;
};

// ==================== MONTHLY REPORTS ====================

export const generateMonthlyReport = async (month: number, year: number) => {
    const { userId } = await auth();
    if (!userId) throw new Error('User not authenticated');

    const hasAccess = await hasPremiumFeatureAccess();
    if (!hasAccess) throw new Error('Upgrade to Core or Pro for monthly reports');

    const supabase = createSupabaseClient();

    // Get all conversations for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const { data: conversations, error: convError } = await supabase
        .from('conversation_history')
        .select(`*, companions:companion_id (subject, duration, topic, name)`)
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

    if (convError) throw new Error(convError.message);

    // Calculate statistics with detailed subject tracking
    const totalSessions = conversations.length;
    const totalDuration = conversations.reduce((sum, c) => sum + (c.duration || 0), 0);

    const subjectsStudied: Record<string, {
        sessions: number;
        totalDuration: number;
        expectedDuration: number;
        companions: Set<string>;
    }> = {};

    const companionsUsed = new Set<string>();

    conversations.forEach(conv => {
        const subject = conv.companions?.subject;
        const companionDuration = conv.companions?.duration || 0; // Expected duration in minutes
        const actualDuration = conv.duration || 0; // Actual duration in seconds

        if (subject) {
            if (!subjectsStudied[subject]) {
                subjectsStudied[subject] = {
                    sessions: 0,
                    totalDuration: 0,
                    expectedDuration: 0,
                    companions: new Set(),
                };
            }
            subjectsStudied[subject].sessions += 1;
            subjectsStudied[subject].totalDuration += actualDuration;
            subjectsStudied[subject].expectedDuration += companionDuration * 60; // Convert to seconds
            subjectsStudied[subject].companions.add(conv.companions.name);
        }
        companionsUsed.add(conv.companion_id);
    });

    // Convert to serializable format
    const subjectsData: Record<string, any> = {};
    Object.entries(subjectsStudied).forEach(([subject, data]) => {
        const completionPercentage = data.expectedDuration > 0
            ? Math.round((data.totalDuration / data.expectedDuration) * 100)
            : 100;

        subjectsData[subject] = {
            sessions: data.sessions,
            totalDuration: data.totalDuration,
            expectedDuration: data.expectedDuration,
            completionPercentage,
            companions: Array.from(data.companions),
        };
    });

    // Calculate insights for strengths and areas for improvement
    const strengths: string[] = [];
    const areasForImprovement: string[] = [];

    // Identify strengths (>80% completion or high engagement)
    Object.entries(subjectsData).forEach(([subject, data]) => {
        if (data.completionPercentage >= 80) {
            strengths.push(`Strong engagement in ${subject} with ${data.completionPercentage}% completion`);
        }
        if (data.sessions >= 3) {
            strengths.push(`Consistent practice in ${subject} (${data.sessions} sessions)`);
        }
    });

    // Identify areas for improvement (<50% completion or low session count)
    Object.entries(subjectsData).forEach(([subject, data]) => {
        if (data.completionPercentage < 50 && data.sessions > 0) {
            areasForImprovement.push(`Complete more ${subject} sessions (currently ${data.completionPercentage}%)`);
        }
    });

    // Add general improvements if no specific ones
    if (areasForImprovement.length === 0 && totalSessions > 0) {
        areasForImprovement.push('Try exploring new subjects to diversify learning');
    }

    const reportData = {
        totalSessions,
        totalDuration,
        averageDuration: totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0,
        subjectsStudied: subjectsData,
        companionsUsed: Array.from(companionsUsed),
        mostStudiedSubject: Object.entries(subjectsData).sort((a, b) => b[1].sessions - a[1].sessions)[0]?.[0],
        strengths,
        areasForImprovement,
    };

    // Save report - for backwards compatibility, keep old format too
    const simpleSubjects: Record<string, number> = {};
    Object.entries(subjectsData).forEach(([subject, data]) => {
        simpleSubjects[subject] = data.sessions;
    });

    const { data, error } = await supabase
        .from('monthly_reports')
        .upsert({
            user_id: userId,
            month,
            year,
            total_sessions: totalSessions,
            total_duration: totalDuration,
            subjects_studied: simpleSubjects,
            companions_used: Array.from(companionsUsed),
            strengths, // ✅ Now populated
            areas_for_improvement: areasForImprovement, // ✅ Now populated
            report_data: reportData,
        }, { onConflict: 'user_id,month,year' })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

export const getMonthlyReport = async (month: number, year: number) => {
    const { userId } = await auth();
    if (!userId) throw new Error('User not authenticated');

    const hasAccess = await hasPremiumFeatureAccess();
    if (!hasAccess) throw new Error('Upgrade to Core or Pro for monthly reports');

    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('monthly_reports')
        .select()
        .eq('user_id', userId)
        .eq('month', month)
        .eq('year', year)
        .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data;
};

// ==================== LEARNING REMINDERS (Pro Only) ====================

export const saveLearningReminders = async ({
                                                enabled,
                                                time,
                                                frequency,
                                                customDays,
                                            }: {
    enabled: boolean;
    time: string;
    frequency: 'daily' | 'weekdays' | 'custom';
    customDays?: string[];
}) => {
    const { userId, has } = await auth();
    if (!userId) throw new Error('User not authenticated');

    // Check if user is Pro
    const isProUser = has({ plan: 'pro' });
    if (!isProUser) throw new Error('Daily reminders are only available for Pro users');

    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('learning_reminders')
        .upsert({
            user_id: userId,
            enabled,
            reminder_time: time,
            frequency,
            custom_days: customDays,
        }, { onConflict: 'user_id' })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

export const getLearningReminders = async () => {
    const { userId, has } = await auth();
    if (!userId) throw new Error('User not authenticated');

    // Check if user is Pro
    const isProUser = has({ plan: 'pro' });
    if (!isProUser) return null;

    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('learning_reminders')
        .select()
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data;
};

export const getAllMonthlyReports = async () => {
    const { userId } = await auth();
    if (!userId) throw new Error('User not authenticated');

    const hasAccess = await hasPremiumFeatureAccess();
    if (!hasAccess) return [];

    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('monthly_reports')
        .select()
        .eq('user_id', userId)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
};

// ==================== SESSION RECAPS ====================

export const generateSessionRecap = async (conversationId: string) => {
    const { userId } = await auth();
    if (!userId) throw new Error('User not authenticated');

    const hasAccess = await hasPremiumFeatureAccess();
    if (!hasAccess) throw new Error('Upgrade to Core or Pro for session recaps');

    const supabase = createSupabaseClient();

    // Get conversation
    const { data: conversation, error: convError } = await supabase
        .from('conversation_history')
        .select('*, companions:companion_id (*)')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();

    if (convError) throw new Error(convError.message);

    // Here you would integrate with AI to generate recap
    // For now, we'll create a basic recap from the conversation
    const messages = conversation.messages as Array<{role: string; content: string}>;
    const keyPoints = messages
        .filter(m => m.role === 'assistant')
        .slice(0, 3)
        .map(m => m.content.substring(0, 100));

    const summary = `Session on ${conversation.companions.topic} completed. ${messages.length} messages exchanged.`;

    const { data, error } = await supabase
        .from('session_recaps')
        .insert({
            conversation_id: conversationId,
            user_id: userId,
            companion_id: conversation.companion_id,
            key_points: keyPoints,
            summary,
            next_steps: ['Review key concepts', 'Practice with examples'],
            difficulty_level: 'medium',
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

export const getSessionRecap = async (conversationId: string) => {
    const { userId } = await auth();
    if (!userId) throw new Error('User not authenticated');

    const hasAccess = await hasPremiumFeatureAccess();
    if (!hasAccess) throw new Error('Upgrade to Core or Pro for session recaps');

    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('session_recaps')
        .select('*, companions:companion_id (*)')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data;
};