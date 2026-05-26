const url = 'https://ekgtundygvhvgessxofv.supabase.co/rest/v1/';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ3R1bmR5Z3Zodmdlc3N4b2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NTg2MjUsImV4cCI6MjA4NzMzNDYyNX0.y4XhUmWIbXJSIrxTaSLsEnYxO7VFkoLmaLY1_hM4w_g';

async function fetchSpec() {
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    });
    const spec = await response.json();
    console.log("Keys in response:", Object.keys(spec));
    if (spec.paths) {
      console.log("Paths in response:", Object.keys(spec.paths).slice(0, 10));
    }
    if (spec.definitions) {
      console.log("Definitions in response:", Object.keys(spec.definitions).slice(0, 10));
    } else {
      console.log("No definitions field. Full spec size in characters:", JSON.stringify(spec).length);
      console.log("First 1000 characters of response:", JSON.stringify(spec).substring(0, 1000));
    }
  } catch (e) {
    console.error("Error fetching OpenAPI spec:", e.message);
  }
}

fetchSpec();
