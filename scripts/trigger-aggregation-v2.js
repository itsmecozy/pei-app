const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvY3VwaWR0aGxoeHdyb3l4Y3V2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ5OTk4MCwiZXhwIjoyMDg4MDc1OTgwfQ.cmGMNGkmiqeeIBrZS8L1BzKZeLf2bUcP2Y9PlUKc6sw";
const URL = "https://zocupidthlhxwroyxcuv.supabase.co/functions/v1/aggregate-emotions";

console.log("Triggering aggregation (this may take 2-3 minutes)...");

fetch(URL, {
  method: "POST",
  headers: { 
    "Authorization": "Bearer " + SERVICE_KEY,
    "Content-Type": "application/json"
  },
  signal: AbortSignal.timeout(300000) // 5 minute timeout
})
.then(r => {
  console.log("Status:", r.status);
  return r.text();
})
.then(text => {
  console.log("Raw response:", text.slice(0, 500));
  try {
    const d = JSON.parse(text);
    console.log("\nResult:");
    console.log(JSON.stringify(d, null, 2));
  } catch(e) {
    console.log("Could not parse as JSON");
  }
})
.catch(e => console.error("Error:", e.message));
