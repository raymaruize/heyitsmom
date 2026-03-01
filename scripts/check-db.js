require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkData() {
  console.log('\n=== Checking Database ===\n');
  
  // Check students
  const { data: students, error: studError } = await supabase
    .from('profiles')
    .select('id, display_name, role, invite_code')
    .eq('role', 'student');

  console.log('Students:', students);
  if (studError) console.error('Student error:', studError);

  // Check parents
  const { data: parents, error: parError } = await supabase
    .from('profiles')
    .select('id, display_name, role')
    .eq('role', 'parent');

  console.log('\nParents:', parents);
  if (parError) console.error('Parent error:', parError);

  // Check links
  const { data: links, error: linkError } = await supabase
    .from('parent_student_links')
    .select('*');

  console.log('\nLinks:', links);
  if (linkError) console.error('Link error:', linkError);
}

checkData();
