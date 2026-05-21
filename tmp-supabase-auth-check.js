const { createClient } = require('./node_modules/@supabase/supabase-js');
const supabase = createClient('http://localhost', 'key');
console.log('verifyOtp source:\n', supabase.auth.verifyOtp.toString());
