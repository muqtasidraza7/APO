import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkDb() {
  const { data: projects } = await supabase.from('projects').select('id, name, status, workspace_id');
  console.log('Projects:', projects);

  const { data: assignments } = await supabase.from('project_assignments').select('*');
  console.log('Total Assignments:', assignments?.length);
  if (assignments && assignments.length > 0) {
    console.log('Sample Assignment:', assignments[0]);
  }
}

checkDb();
