import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushNotificationPayload {
  type: 'training_created' | 'training_started' | 'training_completed' | 'team_invite' | 'member_joined';
  team_id?: string;
  user_ids?: string[]; // Specific users to notify (optional, if not provided uses team_id)
  exclude_user_id?: string; // User to exclude (usually the sender)
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  sound?: 'default' | null;
  data?: Record<string, unknown>;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const payload: PushNotificationPayload = await req.json();
    const { type, team_id, user_ids, exclude_user_id, title, body, data } = payload;

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get target user IDs
    let targetUserIds: string[] = [];

    if (user_ids && user_ids.length > 0) {
      // Use provided user IDs
      targetUserIds = user_ids;
    } else if (team_id) {
      // Get all team members
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', team_id);

      if (membersError) {
        console.error('Error fetching team members:', membersError);
        return new Response(JSON.stringify({ error: 'Failed to fetch team members' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      targetUserIds = members?.map((m) => m.user_id) || [];
    }

    // Exclude the sender
    if (exclude_user_id) {
      targetUserIds = targetUserIds.filter((id) => id !== exclude_user_id);
    }

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'No users to notify' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get push tokens for target users
    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('expo_push_token')
      .in('user_id', targetUserIds);

    if (tokensError) {
      console.error('Error fetching push tokens:', tokensError);
      return new Response(JSON.stringify({ error: 'Failed to fetch push tokens' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pushTokens = tokens?.map((t) => t.expo_push_token).filter(Boolean) || [];

    if (pushTokens.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'No push tokens found' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prepare Expo push messages
    const messages: ExpoPushMessage[] = pushTokens.map((token) => ({
      to: token,
      title,
      body,
      sound: 'default',
      data: { ...data, type },
      channelId: getChannelId(type),
      priority: 'high',
    }));

    // Send to Expo Push API (batch up to 100)
    const chunks = chunkArray(messages, 100);
    let totalSent = 0;
    const errors: unknown[] = [];

    for (const chunk of chunks) {
      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(chunk),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Expo push error:', errorText);
          errors.push(errorText);
        } else {
          const result = await response.json();
          console.log('Expo push result:', result);
          totalSent += chunk.length;
        }
      } catch (err) {
        console.error('Error sending push:', err);
        errors.push(err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: totalSent,
        total_tokens: pushTokens.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

function getChannelId(type: string): string {
  switch (type) {
    case 'training_created':
    case 'training_started':
    case 'training_completed':
      return 'trainings';
    case 'team_invite':
    case 'member_joined':
      return 'teams';
    default:
      return 'default';
  }
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
