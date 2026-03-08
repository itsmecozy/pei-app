// Philippine Provinces SVG Map Data
// Paths scaled to viewBox="0 0 300 500" (from 560x760 source)
// Each province has: id, name, region, province_key (for fuzzy matching), d (SVG path)

export const PH_PROVINCES = [
  // ── REGION I — Ilocos ──────────────────────────────────────────
  { id:"ilocos-norte",   name:"Ilocos Norte",          region:"R1",    province_key:"ilocos norte",
    d:"M81,25 L88,21 L91,24 L92,30 L90,38 L86,42 L82,41 L80,35 L80,28 Z" },
  { id:"ilocos-sur",     name:"Ilocos Sur",             region:"R1",    province_key:"ilocos sur",
    d:"M79,41 L83,41 L87,45 L85,54 L82,59 L78,58 L76,51 L77,45 Z" },
  { id:"la-union",       name:"La Union",               region:"R1",    province_key:"la union",
    d:"M76,58 L80,57 L82,63 L80,73 L75,75 L73,68 L74,62 Z" },
  { id:"pangasinan",     name:"Pangasinan",             region:"R1",    province_key:"pangasinan",
    d:"M69,74 L76,71 L82,73 L85,81 L82,90 L75,92 L64,89 L61,83 L64,76 Z" },

  // ── REGION II — Cagayan Valley ─────────────────────────────────
  { id:"batanes",        name:"Batanes",                region:"R2",    province_key:"batanes",
    d:"M118,11 L124,9 L126,13 L123,18 L118,18 L116,14 Z" },
  { id:"cagayan",        name:"Cagayan",                region:"R2",    province_key:"cagayan",
    d:"M88,21 L100,19 L107,23 L110,31 L110,41 L107,49 L101,53 L95,50 L90,43 L88,33 Z" },
  { id:"isabela",        name:"Isabela",                region:"R2",    province_key:"isabela",
    d:"M95,49 L103,46 L110,50 L112,60 L109,70 L103,75 L97,73 L93,65 L92,56 Z" },
  { id:"nueva-vizcaya",  name:"Nueva Vizcaya",          region:"R2",    province_key:"nueva vizcaya",
    d:"M91,66 L97,64 L102,68 L100,78 L94,82 L88,79 L86,73 Z" },
  { id:"quirino",        name:"Quirino",                region:"R2",    province_key:"quirino",
    d:"M97,69 L104,68 L107,75 L103,82 L97,80 L94,75 Z" },

  // ── CAR — Cordillera ───────────────────────────────────────────
  { id:"abra",           name:"Abra",                   region:"CAR",   province_key:"abra",
    d:"M82,41 L87,40 L90,47 L88,55 L83,57 L79,53 L79,46 Z" },
  { id:"benguet",        name:"Benguet",                region:"CAR",   province_key:"benguet",
    d:"M76,57 L82,55 L85,60 L83,68 L78,71 L73,66 L73,60 Z" },
  { id:"ifugao",         name:"Ifugao",                 region:"CAR",   province_key:"ifugao",
    d:"M87,53 L93,51 L96,57 L93,65 L87,65 L84,59 Z" },
  { id:"kalinga",        name:"Kalinga",                region:"CAR",   province_key:"kalinga",
    d:"M87,40 L92,38 L95,43 L94,51 L89,53 L85,48 Z" },
  { id:"mt-province",    name:"Mt. Province",           region:"CAR",   province_key:"mountain province",
    d:"M81,55 L87,53 L90,58 L88,65 L83,67 L79,63 L79,57 Z" },
  { id:"apayao",         name:"Apayao",                 region:"CAR",   province_key:"apayao",
    d:"M87,30 L94,28 L97,34 L95,41 L89,42 L85,37 Z" },

  // ── REGION III — Central Luzon ─────────────────────────────────
  { id:"zambales",       name:"Zambales",               region:"R3",    province_key:"zambales",
    d:"M60,84 L66,80 L68,89 L66,99 L62,104 L57,101 L55,94 Z" },
  { id:"tarlac",         name:"Tarlac",                 region:"R3",    province_key:"tarlac",
    d:"M66,87 L74,84 L77,90 L74,102 L68,105 L63,99 Z" },
  { id:"pampanga",       name:"Pampanga",               region:"R3",    province_key:"pampanga",
    d:"M69,103 L76,100 L79,106 L78,113 L72,116 L67,111 Z" },
  { id:"bulacan",        name:"Bulacan",                region:"R3",    province_key:"bulacan",
    d:"M76,99 L82,96 L87,102 L86,111 L79,113 L74,108 Z" },
  { id:"nueva-ecija",    name:"Nueva Ecija",            region:"R3",    province_key:"nueva ecija",
    d:"M77,87 L86,84 L90,90 L89,101 L82,104 L76,100 L75,93 Z" },
  { id:"aurora",         name:"Aurora",                 region:"R3",    province_key:"aurora",
    d:"M87,80 L95,77 L98,84 L97,96 L91,99 L86,93 Z" },
  { id:"bataan",         name:"Bataan",                 region:"R3",    province_key:"bataan",
    d:"M55,99 L62,97 L63,106 L59,112 L54,110 L51,103 Z" },

  // ── NCR ────────────────────────────────────────────────────────
  { id:"metro-manila",   name:"Metro Manila",           region:"NCR",   province_key:"metro manila",
    d:"M73,113 L79,111 L82,116 L81,123 L75,126 L71,121 L71,116 Z" },

  // ── REGION IV-A — CALABARZON ───────────────────────────────────
  { id:"cavite",         name:"Cavite",                 region:"R4A",   province_key:"cavite",
    d:"M65,116 L72,114 L74,120 L70,129 L63,130 L59,124 Z" },
  { id:"laguna",         name:"Laguna",                 region:"R4A",   province_key:"laguna",
    d:"M79,111 L87,108 L90,115 L87,124 L81,127 L76,122 Z" },
  { id:"batangas",       name:"Batangas",               region:"R4A",   province_key:"batangas",
    d:"M63,129 L71,127 L75,133 L73,143 L66,146 L59,139 L58,133 Z" },
  { id:"rizal",          name:"Rizal",                  region:"R4A",   province_key:"rizal",
    d:"M81,108 L88,107 L91,113 L88,120 L82,119 Z" },
  { id:"quezon",         name:"Quezon",                 region:"R4A",   province_key:"quezon",
    d:"M87,107 L97,104 L103,111 L104,124 L98,134 L91,136 L86,128 L84,117 Z" },

  // ── REGION IV-B — MIMAROPA ─────────────────────────────────────
  { id:"occidental-mindoro", name:"Occidental Mindoro", region:"R4B",  province_key:"occidental mindoro",
    d:"M44,134 L54,131 L57,139 L54,150 L47,152 L41,145 L41,138 Z" },
  { id:"oriental-mindoro",   name:"Oriental Mindoro",   region:"R4B",  province_key:"oriental mindoro",
    d:"M54,132 L62,130 L66,137 L63,149 L56,151 L51,143 Z" },
  { id:"marinduque",     name:"Marinduque",             region:"R4B",   province_key:"marinduque",
    d:"M79,137 L85,135 L87,142 L83,148 L77,146 L75,140 Z" },
  { id:"romblon",        name:"Romblon",                region:"R4B",   province_key:"romblon",
    d:"M85,127 L90,126 L92,132 L87,137 L83,134 Z" },
  { id:"palawan",        name:"Palawan",                region:"R4B",   province_key:"palawan",
    d:"M26,151 L33,148 L38,153 L41,165 L38,178 L34,188 L29,190 L23,181 L22,166 L24,156 Z" },

  // ── REGION V — Bicol ───────────────────────────────────────────
  { id:"camarines-norte", name:"Camarines Norte",       region:"R5",   province_key:"camarines norte",
    d:"M100,112 L107,110 L110,116 L107,124 L101,124 L98,118 Z" },
  { id:"camarines-sur",  name:"Camarines Sur",          region:"R5",   province_key:"camarines sur",
    d:"M102,122 L110,119 L116,126 L115,138 L107,141 L101,135 L100,127 Z" },
  { id:"albay",          name:"Albay",                  region:"R5",   province_key:"albay",
    d:"M107,140 L115,136 L118,143 L115,152 L108,153 L104,147 Z" },
  { id:"sorsogon",       name:"Sorsogon",               region:"R5",   province_key:"sorsogon",
    d:"M112,152 L119,149 L122,157 L117,164 L110,162 L108,155 Z" },
  { id:"catanduanes",    name:"Catanduanes",            region:"R5",   province_key:"catanduanes",
    d:"M120,127 L125,125 L128,132 L124,139 L119,137 L117,131 Z" },
  { id:"masbate",        name:"Masbate",                region:"R5",   province_key:"masbate",
    d:"M101,144 L109,141 L112,149 L107,157 L99,154 L97,148 Z" },

  // ── REGION VI — Western Visayas ────────────────────────────────
  { id:"aklan",          name:"Aklan",                  region:"R6",   province_key:"aklan",
    d:"M73,167 L79,164 L82,169 L79,176 L73,176 L70,171 Z" },
  { id:"antique",        name:"Antique",                region:"R6",   province_key:"antique",
    d:"M63,169 L70,167 L73,173 L71,184 L65,187 L59,182 L59,174 Z" },
  { id:"capiz",          name:"Capiz",                  region:"R6",   province_key:"capiz",
    d:"M79,163 L87,160 L90,166 L87,173 L80,173 L77,168 Z" },
  { id:"iloilo",         name:"Iloilo",                 region:"R6",   province_key:"iloilo",
    d:"M65,184 L73,181 L77,187 L75,196 L67,199 L61,194 L61,187 Z" },
  { id:"guimaras",       name:"Guimaras",               region:"R6",   province_key:"guimaras",
    d:"M77,187 L83,185 L85,191 L80,196 L74,193 Z" },
  { id:"negros-occidental", name:"Negros Occidental",   region:"R6",   province_key:"negros occidental",
    d:"M60,177 L67,175 L69,183 L66,199 L60,204 L53,198 L53,187 Z" },

  // ── REGION VII — Central Visayas ───────────────────────────────
  { id:"cebu",           name:"Cebu",                   region:"R7",   province_key:"cebu",
    d:"M79,173 L86,170 L89,179 L87,194 L81,198 L76,193 L75,181 Z" },
  { id:"negros-oriental", name:"Negros Oriental",       region:"R7",   province_key:"negros oriental",
    d:"M66,197 L73,194 L76,202 L73,213 L66,215 L61,208 L62,200 Z" },
  { id:"bohol",          name:"Bohol",                  region:"R7",   province_key:"bohol",
    d:"M80,199 L87,196 L91,204 L88,213 L80,215 L76,208 Z" },
  { id:"siquijor",       name:"Siquijor",               region:"R7",   province_key:"siquijor",
    d:"M74,214 L80,213 L81,220 L75,222 L71,218 Z" },

  // ── REGION VIII — Eastern Visayas ──────────────────────────────
  { id:"biliran",        name:"Biliran",                region:"R8",   province_key:"biliran",
    d:"M95,171 L99,170 L100,175 L96,178 L92,176 Z" },
  { id:"northern-samar", name:"Northern Samar",         region:"R8",   province_key:"northern samar",
    d:"M100,168 L107,165 L110,171 L108,181 L101,183 L97,176 Z" },
  { id:"eastern-samar",  name:"Eastern Samar",          region:"R8",   province_key:"eastern samar",
    d:"M107,178 L114,175 L117,183 L115,195 L107,197 L102,189 Z" },
  { id:"samar",          name:"Samar",                  region:"R8",   province_key:"samar",
    d:"M95,177 L103,174 L107,181 L105,194 L97,196 L92,188 Z" },
  { id:"leyte",          name:"Leyte",                  region:"R8",   province_key:"leyte",
    d:"M90,178 L96,176 L99,185 L97,197 L89,199 L85,191 L87,181 Z" },
  { id:"southern-leyte", name:"Southern Leyte",         region:"R8",   province_key:"southern leyte",
    d:"M89,196 L96,194 L98,202 L92,208 L85,204 L84,198 Z" },

  // ── REGION IX — Zamboanga ──────────────────────────────────────
  { id:"zamboanga-norte", name:"Zamboanga del Norte",   region:"R9",   province_key:"zamboanga del norte",
    d:"M45,236 L54,232 L58,238 L56,249 L48,252 L42,246 L43,238 Z" },
  { id:"zamboanga-sibugay", name:"Zamboanga Sibugay",   region:"R9",   province_key:"zamboanga sibugay",
    d:"M43,246 L49,243 L52,249 L50,257 L44,257 L40,251 Z" },
  { id:"zamboanga-sur",  name:"Zamboanga del Sur",      region:"R9",   province_key:"zamboanga del sur",
    d:"M48,253 L56,249 L60,257 L58,268 L50,271 L44,264 L44,256 Z" },

  // ── REGION X — Northern Mindanao ───────────────────────────────
  { id:"misamis-occidental", name:"Misamis Occidental", region:"R10",  province_key:"misamis occidental",
    d:"M57,222 L65,219 L68,226 L65,234 L57,236 L53,228 Z" },
  { id:"misamis-oriental",   name:"Misamis Oriental",   region:"R10",  province_key:"misamis oriental",
    d:"M65,219 L74,216 L77,223 L73,232 L65,233 Z" },
  { id:"camiguin",       name:"Camiguin",               region:"R10",  province_key:"camiguin",
    d:"M79,207 L85,205 L87,212 L82,216 L76,213 Z" },
  { id:"lanao-norte",    name:"Lanao del Norte",        region:"R10",  province_key:"lanao del norte",
    d:"M53,237 L62,234 L65,242 L61,250 L53,251 L49,244 Z" },
  { id:"bukidnon",       name:"Bukidnon",               region:"R10",  province_key:"bukidnon",
    d:"M65,231 L75,227 L79,236 L77,249 L68,252 L62,244 L62,236 Z" },

  // ── REGION XI — Davao ──────────────────────────────────────────
  { id:"davao-norte",    name:"Davao del Norte",        region:"R11",  province_key:"davao del norte",
    d:"M80,237 L90,234 L93,241 L90,250 L81,251 L77,245 Z" },
  { id:"davao-de-oro",   name:"Davao de Oro",           region:"R11",  province_key:"davao de oro",
    d:"M77,227 L87,223 L91,230 L88,239 L79,240 L74,234 Z" },
  { id:"davao-oriental", name:"Davao Oriental",         region:"R11",  province_key:"davao oriental",
    d:"M88,233 L96,230 L99,239 L96,249 L88,249 Z" },
  { id:"davao-sur",      name:"Davao del Sur",          region:"R11",  province_key:"davao del sur",
    d:"M79,249 L87,246 L91,254 L87,264 L79,265 L74,258 Z" },
  { id:"davao-occidental", name:"Davao Occidental",     region:"R11",  province_key:"davao occidental",
    d:"M73,257 L80,254 L82,262 L77,270 L70,268 L68,261 Z" },

  // ── REGION XII — SOCCSKSARGEN ──────────────────────────────────
  { id:"north-cotabato", name:"Cotabato",               region:"R12",  province_key:"cotabato",
    d:"M65,242 L75,238 L79,246 L76,256 L67,257 L61,250 Z" },
  { id:"south-cotabato", name:"South Cotabato",         region:"R12",  province_key:"south cotabato",
    d:"M73,254 L80,252 L84,260 L80,269 L72,270 L67,263 Z" },
  { id:"sultan-kudarat", name:"Sultan Kudarat",         region:"R12",  province_key:"sultan kudarat",
    d:"M62,251 L68,249 L73,256 L68,266 L61,266 L57,258 Z" },
  { id:"sarangani",      name:"Sarangani",              region:"R12",  province_key:"sarangani",
    d:"M67,263 L75,260 L79,267 L75,276 L66,274 L62,267 Z" },

  // ── CARAGA ─────────────────────────────────────────────────────
  { id:"agusan-norte",   name:"Agusan del Norte",       region:"CARAGA", province_key:"agusan del norte",
    d:"M83,215 L92,211 L95,218 L92,226 L83,227 L79,221 Z" },
  { id:"agusan-sur",     name:"Agusan del Sur",         region:"CARAGA", province_key:"agusan del sur",
    d:"M80,224 L89,220 L93,228 L90,239 L80,240 L74,232 Z" },
  { id:"surigao-norte",  name:"Surigao del Norte",      region:"CARAGA", province_key:"surigao del norte",
    d:"M91,206 L101,202 L104,210 L99,219 L91,219 L87,213 Z" },
  { id:"surigao-sur",    name:"Surigao del Sur",        region:"CARAGA", province_key:"surigao del sur",
    d:"M92,218 L101,215 L104,224 L100,234 L91,234 L87,226 Z" },
  { id:"dinagat",        name:"Dinagat Islands",        region:"CARAGA", province_key:"dinagat islands",
    d:"M103,197 L109,195 L111,201 L106,206 L100,203 Z" },

  // ── BARMM ──────────────────────────────────────────────────────
  { id:"lanao-sur",      name:"Lanao del Sur",          region:"BARMM", province_key:"lanao del sur",
    d:"M50,244 L58,241 L61,248 L58,257 L50,258 L46,251 Z" },
  { id:"maguindanao",    name:"Maguindanao",            region:"BARMM", province_key:"maguindanao",
    d:"M58,249 L66,246 L70,255 L65,266 L57,267 L52,259 Z" },
  { id:"basilan",        name:"Basilan",                region:"BARMM", province_key:"basilan",
    d:"M48,264 L56,261 L58,268 L52,274 L45,270 Z" },
  { id:"sulu",           name:"Sulu",                   region:"BARMM", province_key:"sulu",
    d:"M45,281 L52,278 L55,284 L49,290 L42,287 Z" },
  { id:"tawi-tawi",      name:"Tawi-Tawi",              region:"BARMM", province_key:"tawi-tawi",
    d:"M36,292 L43,289 L45,295 L39,301 L33,297 Z" },
];

export const REGION_LABELS = {
  "R1":"Ilocos", "R2":"Cagayan Valley", "CAR":"Cordillera",
  "R3":"Central Luzon", "NCR":"Metro Manila", "R4A":"CALABARZON",
  "R4B":"MIMAROPA", "R5":"Bicol", "R6":"Western Visayas",
  "R7":"Central Visayas", "R8":"Eastern Visayas", "R9":"Zamboanga",
  "R10":"Northern Mindanao", "R11":"Davao", "R12":"SOCCSKSARGEN",
  "CARAGA":"Caraga", "BARMM":"BARMM",
};
