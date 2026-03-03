// ─── PSGC IMPORT SCRIPT ───────────────────────────────────────────────────────
// Fetches all regions, provinces, cities and municipalities from the PSGC API
// and inserts them into the PEI Supabase database.
//
// Run once with: node psgc-import.js
// ─────────────────────────────────────────────────────────────────────────────

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://zocupidthlhxwroyxcuv.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvY3VwaWR0aGxoeHdyb3l4Y3V2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ5OTk4MCwiZXhwIjoyMDg4MDc1OTgwfQ.cmGMNGkmiqeeIBrZS8L1BzKZeLf2bUcP2Y9PlUKc6sw";

const PSGC_BASE = "https://psgc.gitlab.io/api";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Chunk array into smaller arrays
function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ─── STEP 1: CLEAR EXISTING SEED DATA ────────────────────────────────────────
async function clearExistingData() {
  console.log("🗑  Clearing existing seed data...");

  // Delete in order to respect foreign keys
  await supabase.from("lgu_aggregations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("submissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("lgus").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("provinces").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("regions").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  console.log("✓ Cleared existing data");
}

// ─── STEP 2: IMPORT REGIONS ───────────────────────────────────────────────────
async function importRegions() {
  console.log("\n📍 Fetching regions from PSGC...");
  const data = await fetchJSON(`${PSGC_BASE}/regions/`);

  const regions = data.map(r => ({
    psgc_code: r.code,
    name: r.name,
  }));

  console.log(`   Found ${regions.length} regions`);

  const { error } = await supabase.from("regions").insert(regions);
  if (error) throw new Error(`Region insert failed: ${error.message}`);

  console.log(`✓ Inserted ${regions.length} regions`);

  // Fetch back with IDs
  const { data: inserted } = await supabase.from("regions").select("id, psgc_code, name");
  return inserted;
}

// ─── STEP 3: IMPORT PROVINCES ─────────────────────────────────────────────────
async function importProvinces(regionMap) {
  console.log("\n📍 Fetching provinces from PSGC...");
  const data = await fetchJSON(`${PSGC_BASE}/provinces/`);

  const provinces = data.map(p => {
    // PSGC province code: first 4 digits match region code prefix
    const regionCode = p.regionCode || p.code.substring(0, 2) + "0000000";
    const region = regionMap.find(r =>
      r.psgc_code === regionCode ||
      r.psgc_code.startsWith(p.code.substring(0, 2))
    );

    return {
      psgc_code: p.code,
      name: p.name,
      region_id: region?.id || null,
    };
  });

  console.log(`   Found ${provinces.length} provinces`);

  // Insert in chunks to avoid payload limits
  const chunks = chunk(provinces, 50);
  for (const ch of chunks) {
    const { error } = await supabase.from("provinces").insert(ch);
    if (error) throw new Error(`Province insert failed: ${error.message}`);
    await sleep(100);
  }

  console.log(`✓ Inserted ${provinces.length} provinces`);

  const { data: inserted } = await supabase.from("provinces").select("id, psgc_code, name, region_id");
  return inserted;
}

// ─── STEP 4: IMPORT CITIES & MUNICIPALITIES ───────────────────────────────────
async function importLGUs(regionMap, provinceMap) {
  console.log("\n📍 Fetching cities from PSGC...");
  const cities = await fetchJSON(`${PSGC_BASE}/cities/`);
  console.log(`   Found ${cities.length} cities`);

  await sleep(300);

  console.log("📍 Fetching municipalities from PSGC...");
  const municipalities = await fetchJSON(`${PSGC_BASE}/municipalities/`);
  console.log(`   Found ${municipalities.length} municipalities`);

  const allLGUs = [
    ...cities.map(c => ({ ...c, lgu_type: "city" })),
    ...municipalities.map(m => ({ ...m, lgu_type: "municipality" })),
  ];

  console.log(`\n   Total LGUs to import: ${allLGUs.length}`);

  // Map city class from PSGC data
  function getCityClass(lgu) {
    if (lgu.lgu_type !== "city") return null;
    const name = (lgu.cityClass || lgu.classification || "").toLowerCase();
    if (name.includes("highly urbanized") || name === "huc") return "huc";
    if (name.includes("independent component") || name === "icc") return "icc";
    if (name.includes("component") || name === "cc") return "cc";
    return "cc"; // default for cities
  }

  const lguRows = allLGUs.map(lgu => {
    // Find province — PSGC code structure: RRPPMMMMM
    // First 2 digits = region, next 2 = province, rest = municipality
    const provinceCodePrefix = lgu.code.substring(0, 6) + "000";
    const province = provinceMap.find(p =>
      p.psgc_code === lgu.provinceCode ||
      p.psgc_code.startsWith(lgu.code.substring(0, 4))
    );

    // Find region
    const region = regionMap.find(r =>
      r.psgc_code === lgu.regionCode ||
      (province && r.id === province.region_id)
    );

    return {
      psgc_code:       lgu.code,
      name:            lgu.name,
      lgu_type:        lgu.lgu_type,
      city_class:      getCityClass(lgu),
      income_class:    lgu.incomeClassification || null,
      province_id:     province?.id || null,
      region_id:       region?.id || (province ? province.region_id : null),
      lat:             null, // PSGC API doesn't include coordinates — added separately
      lng:             null,
      population_2020: lgu.population || null,
      active:          true,
    };
  });

  // Insert in chunks of 100
  const chunks = chunk(lguRows, 100);
  let inserted = 0;

  for (let i = 0; i < chunks.length; i++) {
    const { error } = await supabase.from("lgus").insert(chunks[i]);
    if (error) {
      console.error(`   ⚠ Chunk ${i+1} failed: ${error.message}`);
      // Try inserting one by one to identify problem rows
      for (const row of chunks[i]) {
        const { error: rowError } = await supabase.from("lgus").insert([row]);
        if (rowError) {
          console.error(`   ⚠ Skipped ${row.name}: ${rowError.message}`);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += chunks[i].length;
    }
    process.stdout.write(`\r   Inserted ${inserted}/${lguRows.length} LGUs...`);
    await sleep(150);
  }

  console.log(`\n✓ Inserted ${inserted} LGUs`);
  return inserted;
}

// ─── STEP 5: ADD COORDINATES FOR MAJOR CITIES ────────────────────────────────
// PSGC API doesn't include coordinates so we add them for known cities
// These are used for map dot placement
async function addCoordinates() {
  console.log("\n📍 Adding coordinates for major cities...");

  const coords = [
    // NCR
    { name: "City of Manila",       lat: 14.5995, lng: 120.9842 },
    { name: "Quezon City",          lat: 14.6760, lng: 121.0437 },
    { name: "Makati City",          lat: 14.5547, lng: 121.0244 },
    { name: "Pasig City",           lat: 14.5764, lng: 121.0851 },
    { name: "Taguig City",          lat: 14.5243, lng: 121.0792 },
    { name: "Mandaluyong City",     lat: 14.5794, lng: 121.0359 },
    { name: "Marikina City",        lat: 14.6507, lng: 121.1029 },
    { name: "Caloocan City",        lat: 14.6499, lng: 120.9673 },
    { name: "Las Piñas City",       lat: 14.4453, lng: 120.9833 },
    { name: "Malabon City",         lat: 14.6628, lng: 120.9571 },
    { name: "Muntinlupa City",      lat: 14.4081, lng: 121.0415 },
    { name: "Navotas City",         lat: 14.6667, lng: 120.9417 },
    { name: "Parañaque City",       lat: 14.4793, lng: 121.0198 },
    { name: "Pasay City",           lat: 14.5378, lng: 121.0014 },
    { name: "Pateros",              lat: 14.5453, lng: 121.0680 },
    { name: "San Juan City",        lat: 14.6019, lng: 121.0355 },
    { name: "Valenzuela City",      lat: 14.7011, lng: 120.9830 },
    // Luzon
    { name: "Baguio City",          lat: 16.4023, lng: 120.5960 },
    { name: "Angeles City",         lat: 15.1450, lng: 120.5887 },
    { name: "Olongapo City",        lat: 14.8292, lng: 120.2828 },
    { name: "Dagupan City",         lat: 16.0430, lng: 120.3330 },
    { name: "San Fernando City",    lat: 16.6159, lng: 120.3168 },
    { name: "Laoag City",           lat: 18.1977, lng: 120.5936 },
    { name: "Vigan City",           lat: 17.5747, lng: 120.3870 },
    { name: "Cabanatuan City",      lat: 15.4866, lng: 120.9670 },
    { name: "Palayan City",         lat: 15.5330, lng: 121.0833 },
    { name: "San Jose City",        lat: 15.7933, lng: 121.0930 },
    { name: "Gapan City",           lat: 15.3069, lng: 120.9456 },
    { name: "Malolos City",         lat: 14.8527, lng: 120.8120 },
    { name: "Meycauayan City",      lat: 14.7362, lng: 120.9603 },
    { name: "San Jose del Monte City", lat: 14.8137, lng: 121.0453 },
    { name: "Antipolo City",        lat: 14.5863, lng: 121.1760 },
    { name: "Calamba City",         lat: 14.2116, lng: 121.1653 },
    { name: "San Pablo City",       lat: 14.0650, lng: 121.3228 },
    { name: "Lucena City",          lat: 13.9322, lng: 121.6172 },
    { name: "Batangas City",        lat: 13.7565, lng: 121.0583 },
    { name: "Lipa City",            lat: 13.9411, lng: 121.1631 },
    { name: "Legazpi City",         lat: 13.1391, lng: 123.7438 },
    { name: "Naga City",            lat: 13.6192, lng: 123.1814 },
    { name: "Puerto Princesa City", lat: 9.7392,  lng: 118.7353 },
    // Visayas
    { name: "Cebu City",            lat: 10.3157, lng: 123.8854 },
    { name: "Lapu-Lapu City",       lat: 10.3103, lng: 123.9494 },
    { name: "Mandaue City",         lat: 10.3236, lng: 123.9223 },
    { name: "Bogo City",            lat: 11.0513, lng: 124.0057 },
    { name: "Carcar City",          lat: 10.1069, lng: 123.6394 },
    { name: "Danao City",           lat: 10.5226, lng: 124.0268 },
    { name: "Naga City",            lat: 10.2119, lng: 123.7572 },
    { name: "Talisay City",         lat: 10.2447, lng: 123.8481 },
    { name: "Toledo City",          lat: 10.3775, lng: 123.6381 },
    { name: "Bacolod City",         lat: 10.6765, lng: 122.9509 },
    { name: "Bago City",            lat: 10.5333, lng: 122.8333 },
    { name: "Cadiz City",           lat: 10.9583, lng: 123.3008 },
    { name: "Escalante City",       lat: 10.8376, lng: 123.4997 },
    { name: "Himamaylan City",      lat: 10.0997, lng: 122.8700 },
    { name: "Kabankalan City",      lat: 9.9897,  lng: 122.8147 },
    { name: "La Carlota City",      lat: 10.4236, lng: 122.9217 },
    { name: "Sagay City",           lat: 10.8983, lng: 123.4175 },
    { name: "San Carlos City",      lat: 10.4933, lng: 123.4150 },
    { name: "Silay City",           lat: 10.7997, lng: 122.9739 },
    { name: "Talisay City",         lat: 10.7333, lng: 122.9667 },
    { name: "Victorias City",       lat: 10.9000, lng: 123.0736 },
    { name: "Iloilo City",          lat: 10.7202, lng: 122.5621 },
    { name: "Passi City",           lat: 11.1083, lng: 122.6411 },
    { name: "Roxas City",           lat: 11.5833, lng: 122.7500 },
    { name: "Ormoc City",           lat: 11.0044, lng: 124.6075 },
    { name: "Tacloban City",        lat: 11.2543, lng: 125.0000 },
    { name: "Calbayog City",        lat: 12.0667, lng: 124.6000 },
    { name: "Catbalogan City",      lat: 11.7756, lng: 124.8856 },
    { name: "Maasin City",          lat: 10.1322, lng: 124.8436 },
    { name: "Borongan City",        lat: 11.6081, lng: 125.4328 },
    { name: "Dumaguete City",       lat: 9.3068,  lng: 123.3054 },
    { name: "Bais City",            lat: 9.5908,  lng: 123.1214 },
    { name: "Bayawan City",         lat: 9.3667,  lng: 122.8000 },
    { name: "Canlaon City",         lat: 10.3858, lng: 123.2000 },
    { name: "Guihulngan City",      lat: 10.1167, lng: 123.2667 },
    { name: "Tanjay City",          lat: 9.5161,  lng: 123.1583 },
    { name: "Tagbilaran City",      lat: 9.6500,  lng: 123.8500 },
    // Mindanao
    { name: "Davao City",           lat: 7.1907,  lng: 125.4553 },
    { name: "Digos City",           lat: 6.7497,  lng: 125.3572 },
    { name: "Mati City",            lat: 6.9497,  lng: 126.2178 },
    { name: "Panabo City",          lat: 7.3083,  lng: 125.6833 },
    { name: "Samal City",           lat: 7.0667,  lng: 125.7167 },
    { name: "Tagum City",           lat: 7.4478,  lng: 125.8078 },
    { name: "Cagayan de Oro City",  lat: 8.4542,  lng: 124.6319 },
    { name: "El Salvador City",     lat: 8.5567,  lng: 124.5222 },
    { name: "Gingoog City",         lat: 8.8228,  lng: 125.1103 },
    { name: "Iligan City",          lat: 8.2280,  lng: 124.2452 },
    { name: "Oroquieta City",       lat: 8.4853,  lng: 123.8053 },
    { name: "Ozamiz City",          lat: 8.1500,  lng: 123.8500 },
    { name: "Tangub City",          lat: 8.0667,  lng: 123.7500 },
    { name: "Zamboanga City",       lat: 6.9214,  lng: 122.0790 },
    { name: "Dapitan City",         lat: 8.6544,  lng: 123.4244 },
    { name: "Dipolog City",         lat: 8.5878,  lng: 123.3411 },
    { name: "Pagadian City",        lat: 7.8272,  lng: 123.4369 },
    { name: "Isabela City",         lat: 6.7058,  lng: 121.9711 },
    { name: "General Santos City",  lat: 6.1164,  lng: 125.1716 },
    { name: "Kidapawan City",       lat: 7.0083,  lng: 125.0892 },
    { name: "Koronadal City",       lat: 6.5036,  lng: 124.8458 },
    { name: "Tacurong City",        lat: 6.6928,  lng: 124.6761 },
    { name: "Cotabato City",        lat: 7.2236,  lng: 124.2464 },
    { name: "Marawi City",          lat: 7.9986,  lng: 124.2928 },
    { name: "Butuan City",          lat: 8.9475,  lng: 125.5436 },
    { name: "Bayugan City",         lat: 8.9508,  lng: 125.7467 },
    { name: "Cabadbaran City",      lat: 9.1236,  lng: 125.5347 },
    { name: "Surigao City",         lat: 9.7833,  lng: 125.4958 },
    { name: "Bislig City",          lat: 8.2086,  lng: 126.3214 },
    { name: "Tandag City",          lat: 9.0783,  lng: 126.1983 },
  ];

  let updated = 0;
  for (const c of coords) {
    const { error } = await supabase
      .from("lgus")
      .update({ lat: c.lat, lng: c.lng })
      .eq("name", c.name);
    if (!error) updated++;
  }

  console.log(`✓ Added coordinates for ${updated} cities`);
}

// ─── STEP 6: RE-SEED TEST SUBMISSIONS FOR METRO MANILA ───────────────────────
async function reseedTestSubmissions() {
  console.log("\n📊 Re-seeding test submissions for Metro Manila...");

  // Get Metro Manila's new ID
  const { data: manila } = await supabase
    .from("lgus")
    .select("id")
    .ilike("name", "%manila%")
    .eq("lgu_type", "city")
    .limit(1)
    .single();

  if (!manila) {
    console.log("⚠ Could not find Manila — skipping test seed");
    return;
  }

  const emotions = ["longing","hope","anger","anxiety","grief","relief","determination","regret"];
  const rows = Array.from({ length: 65 }, (_, i) => ({
    lgu_id:      manila.id,
    emotion:     emotions[Math.floor(Math.random() * emotions.length)],
    intensity:   Math.floor(Math.random() * 5) + 1,
    week_number: 10,
    year:        2026,
    submitted_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  }));

  const { error } = await supabase.from("submissions").insert(rows);
  if (error) {
    console.error(`⚠ Test seed failed: ${error.message}`);
  } else {
    console.log(`✓ Seeded 65 test submissions for Manila`);
  }

  return manila.id;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  PEI — PSGC Full Import");
  console.log("═══════════════════════════════════════════\n");

  try {
    await clearExistingData();
    const regions   = await importRegions();
    const provinces = await importProvinces(regions);
    const lguCount  = await importLGUs(regions, provinces);
    await addCoordinates();
    const manilaId  = await reseedTestSubmissions();

    console.log("\n═══════════════════════════════════════════");
    console.log("  ✅ Import Complete!");
    console.log(`  Regions:   ${regions.length}`);
    console.log(`  Provinces: ${provinces.length}`);
    console.log(`  LGUs:      ${lguCount}`);
    console.log("═══════════════════════════════════════════");
    console.log("\nNext step: run the aggregation function to");
    console.log("compute ESI/HDR for Manila's new test data.");
    console.log("\ncurl -X POST https://zocupidthlhxwroyxcuv.supabase.co/functions/v1/aggregate-emotions \\");
    console.log('  -H "Authorization: Bearer <service_role_key>"');

  } catch (err) {
    console.error("\n❌ Import failed:", err.message);
    process.exit(1);
  }
}

main();
