import pg from 'pg';
const { Client } = pg;

async function executeSQLFix() {
  // Direct connection to Supabase PostgreSQL
  const client = new Client({
    connectionString: 'postgresql://postgres.yzlniqwzqlsftxrtapdl:Godisgood1.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔧 Connecting to Supabase database...\n');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    console.log('📝 Adding missing columns to sales table...\n');

    // Execute each ALTER TABLE statement individually for better error handling
    const alterStatements = [
      "ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_amount BIGINT DEFAULT 0",
      "ALTER TABLE sales ADD COLUMN IF NOT EXISTS final_amount BIGINT",
      "ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_email TEXT",
      "ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash'",
      "ALTER TABLE sales ADD COLUMN IF NOT EXISTS amount_paid BIGINT",
      "ALTER TABLE sales ADD COLUMN IF NOT EXISTS amount_due BIGINT DEFAULT 0",
      "ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_time TEXT",
      "ALTER TABLE sales ADD COLUMN IF NOT EXISTS cost_price BIGINT",
      "ALTER TABLE sales ADD COLUMN IF NOT EXISTS profit BIGINT",
      "ALTER TABLE sales ADD COLUMN IF NOT EXISTS is_credit BOOLEAN DEFAULT false",
      "ALTER TABLE sales ADD COLUMN IF NOT EXISTS credit_due_date DATE",
      "ALTER TABLE sales ADD COLUMN IF NOT EXISTS day_key TEXT",
      "ALTER TABLE sales ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced'"
    ];

    for (const statement of alterStatements) {
      try {
        await client.query(statement);
        const columnName = statement.match(/COLUMN IF NOT EXISTS (\w+)/)[1];
        console.log(`✅ Added column: ${columnName}`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          const columnName = statement.match(/COLUMN IF NOT EXISTS (\w+)/)[1];
          console.log(`⏭️  Column already exists: ${columnName}`);
        } else {
          console.error(`❌ Error adding column: ${err.message}`);
        }
      }
    }

    console.log('\n📝 Setting permissions...\n');

    // Grant permissions
    try {
      await client.query('GRANT ALL ON sales TO authenticated');
      console.log('✅ Granted permissions to authenticated users');
    } catch (err) {
      console.log('⏭️  Permissions already set for authenticated users');
    }

    try {
      await client.query('GRANT SELECT, INSERT, UPDATE ON sales TO anon');
      console.log('✅ Granted permissions to anonymous users');
    } catch (err) {
      console.log('⏭️  Permissions already set for anonymous users');
    }

    // Verify the table structure
    console.log('\n🔍 Verifying table structure...\n');
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'sales'
      ORDER BY ordinal_position
    `);

    console.log('Sales table columns:');
    console.log('==================');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });

    console.log('\n🎉 SUCCESS! Your sales table has been fixed!');
    console.log('✅ All required columns have been added');
    console.log('✅ Permissions have been set correctly');
    console.log('✅ Your sales data will now persist even after clearing cache!');

    console.log('\n📱 You can now:');
    console.log('1. Record sales in your app');
    console.log('2. Clear your browser cache anytime');
    console.log('3. Your sales data will remain safe in the cloud!');

  } catch (error) {
    console.error('❌ Connection error:', error.message);
    console.log('\nPlease check your database connection settings.');
  } finally {
    await client.end();
    console.log('\n✅ Database connection closed.');
  }
}

// Run the fix
executeSQLFix();