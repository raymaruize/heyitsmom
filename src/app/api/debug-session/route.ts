import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(req: NextRequest) {
  try {
    // Get auth token from cookie
    const authToken = req.cookies.get('sb-jzztxiprogdngqfxbnww-auth-token')?.value;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    const userId = sessionData?.session?.user?.id;
    
    // Try to get links for this user
    let links = null;
    let linksError = null;
    if (userId) {
      const { data, error } = await supabase
        .from('parent_student_links')
        .select('*')
        .eq('parent_id', userId);
      links = data;
      linksError = error;
    }

    return NextResponse.json({
      hasAuthToken: !!authToken,
      hasSession: !!sessionData?.session,
      userId: userId || null,
      userEmail: sessionData?.session?.user?.email || null,
      expectedParentId: '15c63b2a-b36e-454b-9bfa-6b0036434cb4',
      idsMatch: userId === '15c63b2a-b36e-454b-9bfa-6b0036434cb4',
      linksForThisUser: links,
      linksError: linksError?.message,
      sessionError: sessionError?.message,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
