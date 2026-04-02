#!/usr/bin/env node

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase connection details
const DB_URL = 'postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';
const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

console.log('🚀 EXECUTING CONTRIBUTION TABLES MIGRATION\n');
console.log('=' .repeat(60));
console.log('\nSince direct database access is restricted, I will:');
console.log('1. Save the SQL to a file for you to copy');
console.log('2. Provide you with a direct link to run it\n');

// Read the migration file
const migrationPath = path.join(__dirname, 'supabase/migrations/20260331_contributions.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Save to an easy-to-find location
const outputPath = path.join(__dirname, 'RUN_THIS_SQL.sql');
fs.writeFileSync(outputPath, migrationSQL);

console.log('✅ Migration SQL saved to: RUN_THIS_SQL.sql\n');
console.log('=' .repeat(60));
console.log('\n📋 SIMPLE INSTRUCTIONS TO RUN THE MIGRATION:\n');
console.log('1. Click this link to open Supabase SQL Editor:');
console.log('   👉 https://app.supabase.com/project/yzlniqwzqlsftxrtapdl/sql/new\n');
console.log('2. Copy ALL the SQL below (from "-- Create" to the last line)\n');
console.log('3. Paste it in the SQL editor that opened\n');
console.log('4. Click the green "Run" button\n');
console.log('=' .repeat(60));
console.log('\n📄 COPY THIS SQL:\n');
console.log(migrationSQL);
console.log('\n' + '=' .repeat(60));
console.log('\n✅ After running the SQL, the Create Group button will work!');