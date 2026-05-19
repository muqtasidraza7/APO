import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkDb() {
  const { data: projects } = await supabase.from('projects').select('id, name, status, workspace_id, ai_data');
  console.log('Project AI Data Sprints:', JSON.stringify(projects?.[0]?.ai_data?.sprints, null, 2));
}

checkDb();
