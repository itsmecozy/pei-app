export const EMOTIONS = [
  { name:"Longing",       emoji:"🌙", hex:"#6366f1", key:"longing"       },
  { name:"Hope",          emoji:"🌱", hex:"#2dd4bf", key:"hope"          },
  { name:"Anger",         emoji:"🔥", hex:"#ef4444", key:"anger"         },
  { name:"Anxiety",       emoji:"🌀", hex:"#f59e0b", key:"anxiety"       },
  { name:"Grief",         emoji:"🌧",  hex:"#8b5cf6", key:"grief"         },
  { name:"Relief",        emoji:"☀️", hex:"#10b981", key:"relief"        },
  { name:"Determination", emoji:"⚡", hex:"#3b82f6", key:"determination" },
  { name:"Regret",        emoji:"🍂", hex:"#ec4899", key:"regret"        },
];

export const EMOTION_MAP = Object.fromEntries(EMOTIONS.map(e => [e.key, e]));
