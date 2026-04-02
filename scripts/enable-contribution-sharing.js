import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://yzlniqwzqlsftxrtapdl.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A'
);

async function enableSharingForExistingGroups() {
  try {
    console.log('Fetching existing contribution groups...');

    // Get all groups that have a share_code but sharing is disabled
    const { data: groups, error: fetchError } = await supabase
      .from('contribution_groups')
      .select('id, name, share_code, share_enabled')
      .not('share_code', 'is', null)
      .eq('share_enabled', false);

    if (fetchError) {
      console.error('Error fetching groups:', fetchError);
      return;
    }

    console.log(`Found ${groups?.length || 0} groups with disabled sharing`);

    if (!groups || groups.length === 0) {
      console.log('No groups need updating');
      return;
    }

    // Enable sharing for each group
    for (const group of groups) {
      const { error: updateError } = await supabase
        .from('contribution_groups')
        .update({ share_enabled: true })
        .eq('id', group.id);

      if (updateError) {
        console.error(`Failed to update group ${group.name}:`, updateError);
      } else {
        console.log(`✓ Enabled sharing for: ${group.name} (code: ${group.share_code})`);
      }
    }

    console.log('\n✅ Sharing enabled for all existing groups with share codes');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

enableSharingForExistingGroups();