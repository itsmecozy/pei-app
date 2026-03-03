// Run with: node trigger-aggregation.js

const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvY3VwaWR0aGxoeHdyb3l4Y3V2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ5OTk4MCwiZXhwIjoyMDg4MDc1OTgwfQ.cmGMNGkmiqeeIBrZS8L1BzKZeLf2bUcP2Y9PlUKc6sw";
const URL = "https://zocupidthlhxwroyxcuv.supabase.co/functions/v1/aggregate-emotions";

console.log("Triggering aggregation...");

fetch(URL, {
  method: "POST",
  headers: { "Authorization": "Bearer " + SERVICE_KEY }
})
.then(r => r.json())
.then(d => {
  console.log("Done!");
  console.log(JSON.stringify(d, null, 2));
})
.catch(e => console.error("Error:", e));
