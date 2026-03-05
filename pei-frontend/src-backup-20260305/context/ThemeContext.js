import { createContext, useContext } from "react";
import { THEMES } from "../hooks/useTheme";

// Default to dark tokens so components always have something
export const ThemeContext = createContext(THEMES.dark.tokens);

export function useT() {
  return useContext(ThemeContext);
}

