"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
// Debug: Log all environment variables
console.log('🔍 Environment Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('All env keys:', Object.keys(process.env).sort().join(', '));
console.log('SUPABASE_URL exists?', !!process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY exists?', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    console.error('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
    throw new Error('Supabase configuration is incomplete');
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
console.log('✅ Supabase client created successfully');
