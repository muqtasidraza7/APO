import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkDb() {
  const { data: workspaces } = await supabase.from('workspaces').select('*');
  console.log('Workspaces:', workspaces?.length);
  
  if (workspaces) {
    for (const ws of workspaces) {
      console.log('--- Workspace:', ws.id, ws.name);
      
      const { data: wm } = await supabase.from('workspace_members').select('*').eq('workspace_id', ws.id);
      console.log('  Workspace members:', wm?.length, wm?.map(m => m.user_id));
      
      const { data: tm } = await supabase.from('team_members').select('*').eq('workspace_id', ws.id);
      console.log('  Team members:', tm?.length, tm?.map(m => m.user_id));
    }
  }
}

checkDb();
