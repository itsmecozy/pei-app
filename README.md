# Philippines Emotional Index (PEI)

A real-time emotional census of the Philippines — anonymous, voluntary, and built on collective signal rather than individual surveillance.

---

## What It Is

PEI aggregates emotional submissions from Filipinos across all 1,642 cities and municipalities, computes city-level and national emotional indices, and visualizes how the country is feeling — week by week.

Data is anonymous by design. No IP addresses, no device fingerprints, no accounts. Raw text is never stored. Only the aggregate pattern survives.

---

## Indices

**ESI — Emotional Stability Index**
Measures how concentrated or spread emotional distribution is across a city. Higher = more emotionally diverse = more stable.

**HDR — Hope/Despair Ratio**
Groups emotions into hope-leaning (hope, relief, determination) and despair-leaning (grief, anger, anxiety, regret, longing) and divides. Above 1.0 = net positive.

**Velocity**
Rate of change in ESI compared to the previous equivalent period. Positive = stabilizing. Negative = narrowing toward a dominant emotion.

---

## Emotions Tracked

| Emotion | Category |
|---|---|
| Hope | Hope-leaning |
| Relief | Hope-leaning |
| Determination | Hope-leaning |
| Grief | Despair-leaning |
| Anger | Despair-leaning |
| Anxiety | Despair-leaning |
| Regret | Despair-leaning |
| Longing | Despair-leaning |

---

## Coverage

- 17 regions
- 82 provinces
- 149 cities (33 HUC, 5 ICC, 111 component)
- 1,493 municipalities
- **1,642 total LGUs** — sourced from PSA Philippine Standard Geographic Code (PSGC)

A city or municipality only appears on the map once it reaches **50 submissions** in the active time window. Below that threshold, data is collected but not displayed — protecting small communities from exposure.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Supabase (Postgres + Edge Functions) |
| Hosting | Vercel (frontend) + Supabase (backend) |
| Geographic Data | PSA PSGC |
| Rate Limiting | Salted IP hashing (daily rotating salt) |

---

## Ethical Framework

- No raw text stored — only AI-extracted signal metadata
- No individual submissions readable by public API
- Minimum 50-submission threshold before any LGU appears
- Daily rotating salt on IP hashes — after midnight, hashes are unrecoverable
- No accounts, no tracking, no behavioral profiling

---

## Project Status

🟡 **In active development — prototype phase**

- [x] Database schema (Supabase / Postgres)
- [x] RLS policies
- [x] Geographic seed data (6 cities)
- [ ] Full PSGC import (1,642 LGUs)
- [ ] Submission Edge Function
- [ ] Aggregation cron job
- [ ] Frontend connected to real API
- [ ] Real Philippines map (PSGC shapefiles)
- [ ] Methodology page
- [ ] Public launch

---

## Methodology Disclaimer

PEI is a voluntary emotional census, not a scientific survey. It does not claim statistical representativeness of the Philippine population. It is a mirror of participating Filipinos — directionally meaningful, culturally revealing, and honest about its limitations.

---

*Pattern survives. Person does not.*
