const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://kxmgjvwhkooksfgqlipg.supabase.co";
const supabaseAnonKey = "sb_publishable_txtruO2JrUQXBd2zcsTu-A_R6S5c7sO";

console.log("Initializing Supabase client...");
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    console.log("Querying users table...");
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error("Error returned from Supabase:", error);
    } else {
      console.log("Success! Data returned:", data);
    }
  } catch (err) {
    console.error("Exception thrown:", err);
  }
}

run();
