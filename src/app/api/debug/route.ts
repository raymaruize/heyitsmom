import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get all parent_student_links
    const { data: links, error: linkError } = await supabase
      .from('parent_student_links')
      .select('*');

    // Get all parents
    const { data: parents, error: parentError } = await supabase
      .from('profiles')
      .select('id, display_name, role, created_at')
      .eq('role', 'parent');

    // Get all students  
    const { data: students, error: studentError } = await supabase
      .from('profiles')
      .select('id, display_name, role, invite_code')
      .eq('role', 'student');

    return NextResponse.json({
      links: links || [],
      parents: parents || [],
      students: students || [],
      errors: {
        linkError: linkError?.message,
        parentError: parentError?.message,
        studentError: studentError?.message,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
