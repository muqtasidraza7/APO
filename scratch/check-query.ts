import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkQuery() {
  const { data: teamMembers } = await supabase
    .from("team_members")
    .select(`
      id,
      user_id,
      job_title,
      status,
      user:workspace_members!user_id (
        id,
        user_id
      )
    `)
    .limit(1);
  console.log('Query result:', JSON.stringify(teamMembers, null, 2));
}

checkQuery();
