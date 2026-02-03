// Quick script to check avatar_url values in database
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local file
const envContent = fs.readFileSync('.env.local', 'utf-8');
const envLines = envContent.split('\n');
envLines.forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAvatars() {
  console.log('Checking suppliers avatar_url values...\n');
  
  const { data: suppliers, error } = await supabase
    .from('suppliers')
    .select('id, name, avatar_url')
    .limit(10);
  
  if (error) {
    console.error('Error fetching suppliers:', error);
    return;
  }
  
  console.log(`Found ${suppliers.length} suppliers:`);
  suppliers.forEach(s => {
    console.log(`- ${s.name}: avatar_url = ${s.avatar_url || 'NULL'}`);
  });
  
  console.log('\nChecking customers avatar_url values...\n');
  
  const { data: customers, error: custError } = await supabase
    .from('customers')
    .select('id, name, avatar_url')
    .limit(10);
  
  if (custError) {
    console.error('Error fetching customers:', custError);
    return;
  }
  
  console.log(`Found ${customers.length} customers:`);
  customers.forEach(c => {
    console.log(`- ${c.name}: avatar_url = ${c.avatar_url || 'NULL'}`);
  });
}

checkAvatars();
