import { useState, useEffect } from "react";
import { T } from "../../constants/tokens";
import { useBreakpoint } from "../../hooks/useBreakpoint";

export default function PageWrapper({ children, page }) {
  const bp = useBreakpoint();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, [page]);

  useEffect(() => {
    setMounted(false);
  }, [page]);

  const isDesktop = bp === "desktop";

  return (
    <main style={{
      marginLeft: isDesktop ? 220 : 0,
      paddingTop: isDesktop ? 0 : 56,
      minHeight: "100vh",
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
