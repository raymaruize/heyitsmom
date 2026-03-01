require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function checkAuthUsers() {
  console.log('\n=== Checking Auth Users ===\n');
  
  // Check profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'parent');

  console.log('Parent Profiles:', JSON.stringify(profiles, null, 2));
  if (profileError) console.error('Profile Error:', profileError);

  // Use admin API to list users
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error('Users Error:', usersError);
    return;
  }

  console.log('\n=== All Auth Users ===');
  users.forEach(user => {
    console.log({
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    });
  });

  // Find parent user
  const parentProfile = profiles?.[0];
  if (parentProfile) {
    const parentUser = users.find(u => u.id === parentProfile.id);
    console.log('\n=== Parent User Match ===');
    console.log('Parent ID from profiles:', parentProfile.id);
    console.log('Parent auth user found:', !!parentUser);
    if (parentUser) {
      console.log('Email confirmed:', !!parentUser.email_confirmed_at);
      console.log('Email:', parentUser.email);
      console.log('Last sign in:', parentUser.last_sign_in_at || 'Never');
    }
  }
}

checkAuthUsers();
