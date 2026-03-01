require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFoodRecords() {
  console.log('Checking food records for student...\n');
  
  const studentId = '6cac892c-6475-4044-bc58-b02cfcb264d5';
  
  // Get recent daily records
  const { data: records, error } = await supabase
    .from('daily_records')
    .select('id, date, student_id')
    .eq('student_id', studentId)
    .order('date', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error fetching daily records:', error);
    return;
  }
  
  console.log(`Found ${records.length} daily records:\n`);
  
  for (const record of records) {
    console.log(`Date: ${record.date}`);
    
    const { data: foodData, error: foodError } = await supabase
      .from('food_recrequire('dotenv').config({ path: '.env.local' });
const { createClient } = require(  const { createClient } = require('@supabase/supafo
const supabase = createClient(
  process.env.NEXT_PUBLIC it  process.env.NEXT_PUBLIC_SUPa.  process.env.SUPABASE_SERVICE_ROLE_KE` );

async function checkFoodRecords() _text   console.log('Checking food recor(`  
  const studentId = '6cac892c-6475-4044-bc58-b02cfcb)' \n  
  // Get recent daily records
  const { data: records, cking  const { data: records, err d    .from('daily_records')
    .select('id, dateba    .select('id, dates')
      .eq('student_id', studentId)
 id    .order('date', { ascending:
     .limit(5);
  
  if (error) {
    co'E  
  if (erro p of    console.leE    return;
  }
  
  console.log(`Found ${records.length}.i  }
  
  c |  'NULL  
  for (const record of records)cords();
