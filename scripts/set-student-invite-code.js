require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setInviteCode() {
  try {
    // Get all student profiles without invite_code
    const { data: students, error: fetchError } = await supabase
      .from('profiles')
      .select('id, display_name, invite_code')
      .eq('role', 'student');

    if (fetchError) throw fetchError;

    console.log(`Found ${students.length} student(s)`);

    for (const student of students) {
      if (!student.invite_code) {
        // Set fixed code 226257 for first student without code
        const code = '226257';
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ invite_code: code })
          .eq('id', student.id);

        if (updateError) {
          console.error(`Failed to update ${student.id}:`, updateError);
        } else {
          console.log(`✅ Set invite code ${code} for student: ${student.display_name || student.id}`);
        }
        break; // Only set for first student
      } else {
        console.log(`Student ${student.display_name || student.id} already has code: ${student.invite_code}`);
      }
    }

    console.log('Done!');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

setInviteCode();
