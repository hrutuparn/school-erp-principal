const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ekgtundygvhvgessxofv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ3R1bmR5Z3Zodmdlc3N4b2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NTg2MjUsImV4cCI6MjA4NzMzNDYyNX0.y4XhUmWIbXJSIrxTaSLsEnYxO7VFkoLmaLY1_hM4w_g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const possibleTables = [
  'schools', 'principals', 'teachers', 'teacher_subjects', 'class_teachers', 'staff', 'classes',
  'students', 'parents', 'parent_students', 'parent_student', 'student_attendance', 'staff_attendance',
  'marks', 'homework', 'fees', 'buses', 'bus_stops', 'chat_rooms', 'chat_messages',
  'events', 'midday_meal', 'document_requests', 'timetable'
];

async function inspectAll() {
  console.log("Inspecting database columns...");
  for (const table of possibleTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table '${table}' failed:`, error.message);
      } else {
        const columns = data && data.length > 0 ? Object.keys(data[0]) : 'empty (no rows)';
        console.log(`✅ Table '${table}': Columns = ${Array.isArray(columns) ? columns.join(', ') : columns}`);
      }
    } catch (e) {
      console.log(`❌ Table '${table}' exception:`, e.message);
    }
  }
}

inspectAll();
