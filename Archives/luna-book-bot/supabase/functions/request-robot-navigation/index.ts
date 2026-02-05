import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Decode JWT payload without verification (Supabase already verified it)
function decodeJwtPayload(token: string): { sub: string; email?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create client with service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const jwtPayload = decodeJwtPayload(token);
    
    if (!jwtPayload?.sub) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = jwtPayload.sub;
    console.log('Authenticated user:', userId);

    const { bookId, studentName } = await req.json();

    if (!bookId || !studentName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: bookId and studentName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get book details
    const { data: book, error: bookError } = await supabaseAdmin
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single();

    if (bookError || !book) {
      console.error('Error fetching book:', bookError);
      return new Response(
        JSON.stringify({ error: 'Book not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create robot task with user_id
    const { data: robotTask, error: taskError } = await supabaseAdmin
      .from('robot_tasks')
      .insert({
        task_type: 'navigation_assist',
        book_id: bookId,
        student_name: studentName,
        user_id: userId,
        status: 'pending',
        priority: 1,
        notes: `Navigate student to ${book.shelf_location} for "${book.title}"`
      })
      .select()
      .single();

    if (taskError) {
      console.error('Error creating robot task:', taskError);
      return new Response(
        JSON.stringify({ error: 'Failed to create robot task' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create book request with user_id
    const { data: bookRequest, error: requestError } = await supabaseAdmin
      .from('book_requests')
      .insert({
        book_id: bookId,
        student_name: studentName,
        user_id: userId,
        request_type: 'navigation_assist',
        status: 'pending',
        robot_task_id: robotTask.id
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating book request:', requestError);
      return new Response(
        JSON.stringify({ error: 'Failed to create book request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Navigation request created:', {
      robotTaskId: robotTask.id,
      bookRequestId: bookRequest.id,
      book: book.title,
      location: book.shelf_location,
      userId: userId
    });

    return new Response(
      JSON.stringify({
        success: true,
        robotTask,
        bookRequest,
        message: `LUNA will guide you to ${book.shelf_location}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in request-robot-navigation:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});