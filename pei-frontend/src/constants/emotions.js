// Flat SVG icons — rendered theme-colored via EmotionIcon component
export const EMOTIONS = [
  { name:"Longing",       key:"longing",       hex:"#6366f1", icon:"Moon"        },
  { name:"Hope",          key:"hope",          hex:"#2dd4bf", icon:"Sprout"      },
  { name:"Anger",         key:"anger",         hex:"#ef4444", icon:"Flame"       },
  { name:"Anxiety",       key:"anxiety",       hex:"#f59e0b", icon:"Wind"        },
  { name:"Grief",         key:"grief",         hex:"#8b5cf6", icon:"CloudRain"   },
  { name:"Relief",        key:"relief",        hex:"#10b981", icon:"Sun"         },
  { name:"Determination", key:"determination", hex:"#3b82f6", icon:"Zap"         },
  { name:"Regret",        key:"regret",        hex:"#ec4899", icon:"Leaf"        },
];

export const EMOTION_MAP = Object.fromEntries(EMOTIONS.map(e => [e.key, e]));
