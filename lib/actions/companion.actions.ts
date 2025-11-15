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

export const addToSessionHistory = async (companionId: string) => {
    const { userId } = await auth();
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('session_history')
        .insert({
            companion_id: companionId,
            user_id: userId,
        })
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
    if (!userId) throw new Error('User not authenticated');

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

    if (error) throw new Error(error.message);

    return data;
};

export const getUserConversations = async (limit = 20, page = 1) => {
    const { userId } = await auth();
    if (!userId) throw new Error('User not authenticated');

    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('conversation_history')
        .select(`
            *,
            companions:companion_id (id, name, subject, topic, duration),
            session_history:session_id (created_at)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

    if (error) throw new Error(error.message);

    return data;
};

export const getCompanionConversations = async (companionId: string, limit = 10) => {
    const { userId } = await auth();
    if (!userId) throw new Error('User not authenticated');

    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('conversation_history')
        .select(`
            *,
            companions:companion_id (id, name, subject, topic)
        `)
        .eq('user_id', userId)
        .eq('companion_id', companionId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw new Error(error.message);

    return data;
};

export const getConversationById = async (conversationId: string) => {
    const { userId } = await auth();
    if (!userId) throw new Error('User not authenticated');

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

    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('conversation_history')
        .select('duration, created_at, companion_id')
        .eq('user_id', userId);

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