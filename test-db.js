
const { createClient } = require('@supabase/supabase-js');

// Hardcoded from .env.local
const supabaseUrl = "https://jpzaudbzbpzzcvwvdjhx.supabase.co";
const supabaseKey = "sb_publishable_ONcyVFHPXUgZKBqDwbFCQg_mHsNzvoW";

console.log('Testing connection to:', supabaseUrl);
console.log('Key:', supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        const { data, error } = await supabase.rpc('get_suppliers_with_balance', {
            p_business_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
            p_search: null,
            p_limit: 10,
            p_offset: 0
        });
        if (error) {
            console.error('Connection failed:', error.message);
            console.error('Details code:', error.code);
            console.error('Details hint:', error.hint);
        } else {
            console.log('Connection successful!');
            console.log('RPC Result:', data);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testConnection();
