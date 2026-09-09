// Flat SVG icons — rendered theme-colored via EmotionIcon component
// Prompts from Lovable version — more human, more Filipino in feeling
export const EMOTIONS = [
  { name:"Hope",          key:"hope",          hex:"#e8a83a", icon:"Sprout",    family:"hope",    prompt:"Something ahead feels possible."           },
  { name:"Relief",        key:"relief",        hex:"#10b981", icon:"Sun",       family:"hope",    prompt:"A weight has lifted, at least for now."     },
  { name:"Determination", key:"determination", hex:"#60a5fa", icon:"Zap",       family:"hope",    prompt:"Hard, but I am carrying on."                },
  { name:"Calm",          key:"calm",          hex:"#94a3b8", icon:"Waves",     family:"neutral", prompt:"Steady. Nothing pulling either way."         },
  { name:"Longing",       key:"longing",       hex:"#a78bfa", icon:"Moon",      family:"despair", prompt:"Missing a person, a place, a life."         },
  { name:"Regret",        key:"regret",        hex:"#f472b6", icon:"Leaf",      family:"despair", prompt:"Looking back at what could have been."      },
  { name:"Anxiety",       key:"anxiety",       hex:"#fb923c", icon:"Wind",      family:"despair", prompt:"Bracing for what happens next."             },
  { name:"Anger",         key:"anger",         hex:"#f87171", icon:"Flame",     family:"despair", prompt:"Something is wrong and it should not be."  },
  { name:"Grief",         key:"grief",         hex:"#818cf8", icon:"CloudRain", family:"despair", prompt:"Carrying a loss."                          },
];

// HDR categories
export const HOPE_LEANING    = ["hope", "relief", "determination"];
export const NEUTRAL         = ["calm"];
export const DESPAIR_LEANING = ["grief", "anger", "anxiety", "regret", "longing"];

export const EMOTION_MAP = Object.fromEntries(EMOTIONS.map(e => [e.key, e]));

// Intensity labels — shown in submission modal step 3
export const INTENSITIES = [
  { value: 1, label: "Faint",        hint: "It's there, barely."     },
  { value: 2, label: "Mild",         hint: "In the background."       },
  { value: 3, label: "Present",      hint: "Clearly with me today."  },
  { value: 4, label: "Strong",       hint: "Hard to set down."       },
  { value: 5, label: "Overwhelming", hint: "It fills the whole day." },
];
