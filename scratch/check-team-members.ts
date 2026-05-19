import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkTeamMembers() {
  const { data: teamMembers } = await supabase.from('team_members').select('*').limit(1);
  console.log('Team Member columns:', teamMembers ? Object.keys(teamMembers[0]) : 'None');
  console.log('Sample Team Member:', teamMembers ? teamMembers[0] : 'None');
}

checkTeamMembers();
