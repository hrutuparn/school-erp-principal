const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ekgtundygvhvgessxofv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ3R1bmR5Z3Zodmdlc3N4b2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NTg2MjUsImV4cCI6MjA4NzMzNDYyNX0.y4XhUmWIbXJSIrxTaSLsEnYxO7VFkoLmaLY1_hM4w_g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSQL() {
  console.log("Testing if we can execute raw SQL via RPC...");
  // Common RPC names for SQL execution
  const rpcNames = ['exec_sql', 'execute_sql', 'run_sql', 'sql'];
  for (const name of rpcNames) {
    try {
      const { data, error } = await supabase.rpc(name, { 
        query: 'SELECT 1 as val;', 
        sql: 'SELECT 1 as val;',
        sql_query: 'SELECT 1 as val;' 
      });
      if (error) {
        console.log(`❌ RPC '${name}':`, error.message);
      } else {
        console.log(`✅ RPC '${name}' works! Data:`, data);
        return;
      }
    } catch(e) {
      console.log(`❌ RPC '${name}' exception:`, e.message);
    }
  }
}

testSQL();
