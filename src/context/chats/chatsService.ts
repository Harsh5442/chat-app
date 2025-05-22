import { createClient } from '@supabase/supabase-js';
import { Chat, Message } from '@/types/chat';
import { toast } from '@/components/ui/sonner';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize Supabase client
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!supabase) {
  console.warn('Supabase client not initialized. Missing credentials.');
}

// Fetch all users
export const fetchUsers = async () => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('fetchUsers error:', error);
    return [];
  }
};

// Fetch user's chats
export const fetchUserChats = async (userId: string) => {
  if (!supabase) return [];

  try {
    const { data: chatMembers, error: chatMembersError } = await supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', userId);

    if (chatMembersError) throw chatMembersError;

    const chatIds = chatMembers.map((m) => m.chat_id);
    if (chatIds.length === 0) return [];

    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .in('id', chatIds)
      .order('updated_at', { ascending: false });

    if (chatsError) throw chatsError;

    const enriched = await Promise.all(
      chats.map(async (chat) => {
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...chat,
          last_message: lastMsg || undefined,
        };
      })
    );

    return enriched;
  } catch (error) {
    console.error('fetchUserChats error:', error);
    return [];
  }
};

// Fetch all messages in a chat
export const fetchChatMessages = async (chatId: string) => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('fetchChatMessages error:', error);
    return [];
  }
};

// Send a new message
export const sendChatMessage = async (
  chatId: string,
  userId: string,
  content: string,
  attachment?: File
) => {
  if (!supabase) {
    toast.error('Supabase is not initialized.');
    throw new Error('Supabase is not initialized.');
  }

  let attachmentUrl: string | undefined;
  let attachmentType: string | undefined;

  if (attachment) {
    const ext = attachment.name.split('.').pop();
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(path, attachment);

    if (uploadError) {
      toast.error('Upload failed');
      throw uploadError;
    }

    const { data } = supabase.storage.from('attachments').getPublicUrl(path);
    attachmentUrl = data.publicUrl;

    if (attachment.type.includes('image')) {
      attachmentType = 'image';
    } else if (attachment.type.includes('video')) {
      attachmentType = 'video';
    } else {
      attachmentType = 'document';
    }
  }

  const { data: inserted, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: userId,
      content,
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    toast.error('Failed to send message');
    throw error;
  }

  await supabase
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chatId);

  return inserted;
};
