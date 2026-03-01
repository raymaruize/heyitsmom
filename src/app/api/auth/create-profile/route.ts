import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function generateInviteCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { userId, role, displayName, inviteCode } = await req.json();

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'Missing userId or role' },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    let generatedInviteCode: string | null = null;
    let linkedStudentId: string | null = null;

    if (role === 'student') {
      for (let i = 0; i < 8; i++) {
        const candidate = generateInviteCode();
        const { data: existing, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('invite_code', candidate)
          .maybeSingle();

        if (checkError) {
          return NextResponse.json({ error: checkError.message }, { status: 500 });
        }

        if (!existing) {
          generatedInviteCode = candidate;
          break;
        }
      }

      if (!generatedInviteCode) {
        return NextResponse.json(
          { error: 'Failed to generate unique invite code' },
          { status: 500 }
        );
      }
    }

    // Parent sign-up: validate student invite code before profile insert
    if (role === 'parent') {
      if (!inviteCode || !/^\d{6}$/.test(inviteCode)) {
        return NextResponse.json(
          { error: 'Parent sign-up requires a valid 6-digit student invite code' },
          { status: 400 }
        );
      }

      const { data: studentProfile, error: studentLookupError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('invite_code', inviteCode)
        .eq('role', 'student')
        .maybeSingle();

      if (studentLookupError) {
        return NextResponse.json({ error: studentLookupError.message }, { status: 500 });
      }

      if (!studentProfile) {
        return NextResponse.json(
          { error: 'Invalid invite code. Please ask the student for the correct code.' },
          { status: 400 }
        );
      }

      linkedStudentId = studentProfile.id;
    }

    const { error } = await supabase.from('profiles').insert([
      {
        id: userId,
        role,
        display_name: displayName || '',
        invite_code: generatedInviteCode,
      },
    ]);

    if (error) {
      console.error('Profile creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Parent sign-up: link to student by invite code
    if (role === 'parent' && linkedStudentId) {
      const { error: linkError } = await supabase.from('parent_student_links').insert([
        {
          parent_id: userId,
          student_id: linkedStudentId,
        },
      ]);

      if (linkError) {
        return NextResponse.json({ error: linkError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, inviteCode: generatedInviteCode });
  } catch (err: any) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
