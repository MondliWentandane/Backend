/**
 * Database Connection Diagnostic Script
 * This script helps debug database connection issues
 * Run: node test-db-connection.js
 */

const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

console.log('\n=== Database Connection Diagnostics ===\n');

// Display environment variables (masked for security)
console.log('Environment Variables:');
console.log('  PGHOST:', process.env.PGHOST || '(not set)');
console.log('  PGPORT:', process.env.PGPORT || '(not set)');
console.log('  PGDATABASE:', process.env.PGDATABASE || '(not set)');
console.log('  PGUSER:', process.env.PGUSER || '(not set)');
console.log('  PGPASSWORD:', process.env.PGPASSWORD ? '***' + process.env.PGPASSWORD.slice(-4) : '(not set)');
console.log('  PGSSLMODE:', process.env.PGSSLMODE || '(not set)');
console.log('');

// Check if all required variables are set
const required = ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:', missing.join(', '));
  console.error('   Make sure your .env file exists and contains all required variables.\n');
  process.exit(1);
}

// Create pool with same config as database.ts
const pool = new Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || "5432"),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
  max: 5,
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 20000,
  keepAlive: false,
});

console.log('Attempting to connect to database...\n');

// Test connection
pool.query('SELECT NOW() as current_time, current_database() as database, current_user as user')
  .then((result) => {
    console.log('✅ Database connection successful!\n');
    console.log('Connection Details:');
    console.log('  Current Time:', result.rows[0].current_time);
    console.log('  Database:', result.rows[0].database);
    console.log('  User:', result.rows[0].user);
    console.log('');
    
    // Test a simple query
    return pool.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = \'public\'');
  })
  .then((result) => {
    console.log('  Tables in database:', result.rows[0].table_count);
    console.log('');
    console.log('✅ All tests passed! Your database connection is working.\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Database connection failed!\n');
    console.error('Error Details:');
    console.error('  Message:', err.message);
    console.error('  Code:', err.code || 'N/A');
    console.error('  Severity:', err.severity || 'N/A');
    console.error('');
    
    // Provide specific troubleshooting based on error
    if (err.code === 'XX000' || err.message.includes('Tenant or user not found')) {
      console.error('🔍 Troubleshooting for "Tenant or user not found":');
      console.error('');
      console.error('This error usually means:');
      console.error('  1. The database user doesn\'t exist or is incorrect');
      console.error('  2. The host/port combination is wrong');
      console.error('  3. The connection pooler configuration is incorrect');
      console.error('');
      console.error('For Supabase Transaction Pooler, verify:');
      console.error('  - Host should be: aws-X-region-Y.pooler.supabase.com');
      console.error('  - Port should be: 5432');
      console.error('  - User should be: postgres.YOUR_PROJECT_REF');
      console.error('  - Database should be: postgres');
      console.error('  - Password should match your Supabase database password');
      console.error('');
      console.error('Get the correct connection string from:');
      console.error('  Supabase Dashboard → Settings → Database → Connection string');
      console.error('  Select "Transaction" mode and copy the connection parameters');
    } else if (err.code === 'ENOTFOUND' || err.message.includes('getaddrinfo')) {
      console.error('🔍 Troubleshooting for connection error:');
      console.error('  - Check if PGHOST is correct');
      console.error('  - Verify your internet connection');
      console.error('  - Check if the hostname resolves correctly');
    } else if (err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
      console.error('🔍 Troubleshooting for timeout:');
      console.error('  - Check if the port is correct');
      console.error('  - Verify firewall settings');
      console.error('  - Check if the database server is accessible');
    } else if (err.message.includes('password authentication failed')) {
      console.error('🔍 Troubleshooting for authentication:');
      console.error('  - Verify PGPASSWORD is correct');
      console.error('  - Check if the user has the right permissions');
    }
    
    console.error('');
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });

