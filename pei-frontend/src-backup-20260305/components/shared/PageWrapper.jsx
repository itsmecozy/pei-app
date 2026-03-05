import { useState, useEffect } from "react";
import { useT } from "../../context/ThemeContext";
import { useBreakpoint } from "../../hooks/useBreakpoint";

export default function PageWrapper({ children, page }) {
  const T  = useT();
  const bp = useBreakpoint();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(false); }, [page]);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, [page]);

  const isDesktop = bp === "desktop";

  return (
    <main style={{
      marginLeft: isDesktop ? 220 : 0,
      paddingTop: isDesktop ? 52 : 56, // desktop: top avatar bar; mobile: top nav
      minHeight: "100vh",
      background: T.bg,
      color: T.text,
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0)" : "translateY(8px)",
      transition: "opacity 0.3s ease, transform 0.3s ease",
    }}>
      <div style={{
        maxWidth: isDesktop ? "none" : 900,
        margin: "0 auto",
        padding: isDesktop ? "2.5rem 3rem" : "1.5rem 1.25rem",
      }}>
        {children}
      </div>
    </main>
  );
}
