import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkColumns() {
  try {
    console.log('Checking sales table structure...\n');

    // Get all columns from sales table
    const { data: columns, error } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'sales'
          ORDER BY ordinal_position;
        `
      });

    if (error || !columns) {
      // Try alternative method
      const { data: testData, error: testError } = await supabase
        .from('sales')
        .select('*')
        .limit(0);

      if (!testError) {
        console.log('Sales table exists but cannot get column details via SQL.');
        console.log('Running test insert to discover structure...');
      } else {
        console.error('Error getting columns:', error || testError);
      }
      return;
    }

    console.log('Sales table columns:');
    console.log('==========================================');
    columns.forEach(col => {
      console.log(`${col.column_name}:`);
      console.log(`  Type: ${col.data_type}`);
      console.log(`  Nullable: ${col.is_nullable}`);
      console.log(`  Default: ${col.column_default || 'none'}`);
      console.log('');
    });

    // Check which columns are missing from our expected list
    const expectedColumns = [
      'id', 'user_id', 'product_id', 'product_name', 'quantity',
      'unit_price', 'total_amount', 'sale_date', 'payment_status',
      'customer_name', 'customer_phone', 'notes', 'cost_price',
      'profit', 'created_at', 'updated_at', 'is_credit',
      'credit_due_date', 'day_key', 'sync_status'
    ];

    const existingColumns = columns.map(c => c.column_name);
    const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length > 0) {
      console.log('\n⚠️  Missing columns:');
      missingColumns.forEach(col => console.log(`  - ${col}`));

      console.log('\n📝 SQL to add missing columns:');
      console.log('==========================================');
      missingColumns.forEach(col => {
        let sql = `ALTER TABLE sales ADD COLUMN IF NOT EXISTS ${col} `;

        // Define column types based on our schema
        switch(col) {
          case 'cost_price':
          case 'profit':
            sql += 'BIGINT';
            break;
          case 'is_credit':
            sql += 'BOOLEAN DEFAULT false';
            break;
          case 'credit_due_date':
            sql += 'DATE';
            break;
          case 'day_key':
          case 'sync_status':
            sql += 'TEXT';
            if (col === 'sync_status') sql += " DEFAULT 'synced'";
            break;
          default:
            sql += 'TEXT';
        }
        console.log(sql + ';');
      });
    } else {
      console.log('\n✅ All expected columns exist!');
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

checkColumns();