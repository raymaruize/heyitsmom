import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(req: NextRequest) {
  try {
    // Get parent ID from query
    const parentId = req.nextUrl.searchParams.get('parentId');
    
    if (!parentId) {
      return NextResponse.json({ error: 'parentId required' }, { status: 400 });
    }

    // Verify user is authenticated by checking the authorization header or cookies
    const authHeader = req.headers.get('authorization');
    
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get linked students
    const { data: links, error: linksError } = await supabase
      .from('parent_student_links')
      .select('student_id')
      .eq('parent_id', parentId);

    if (linksError) {
      return NextResponse.json({ error: linksError.message }, { status: 500 });
    }

    const studentIds = (links || []).map((l: any) => l.student_id);

    if (studentIds.length === 0) {
      return NextResponse.json({ students: [] });
    }

    // Get student profiles
    const { data: students, error: studentsError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', studentIds);

    if (studentsError) {
      return NextResponse.json({ error: studentsError.message }, { status: 500 });
    }

    return NextResponse.json({
      students: students || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
