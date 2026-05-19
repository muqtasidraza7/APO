import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkDb() {
  const { data: sprintTasks } = await supabase.from('sprint_tasks').select('*').limit(1);
  console.log('Sprint Tasks Columns:', sprintTasks?.[0]);
}

checkDb();
