import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET(req: NextRequest) {
  try {
    const parentId = '15c63b2a-b36e-454b-9bfa-6b0036434cb4';
    
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check RLS policy by querying as service role
    const { data: links, error: linksError } = await supabase
      .from('parent_student_links')
      .select('*')
      .eq('parent_id', parentId);

    // Get students for those links
    const studentIds = (links || []).map((l: any) => l.student_id);
    
    let students: any[] = [];
    if (studentIds.length > 0) {
      const { data: studentsData } = await supabase
        .from('profiles')
        .select('id, display_name, role')
        .in('id', studentIds);
      students = studentsData || [];
    }

    // Check parent profile
    const { data: parentProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', parentId)
      .single();

    return NextResponse.json({
      parentId,
      parentProfile,
      linksFound: links?.length || 0,
      links,
      linksError: linksError?.message,
      studentIds,
      students,
      allParentStudentLinks: await supabase.from('parent_student_links').select('*'),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
