import { useState, useEffect } from "react";
import { useBreakpoint } from "../../hooks/useBreakpoint";

export default function PageWrapper({ children, page }) {
  const bp = useBreakpoint();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, [page]);

  return (
    <div style={{ maxWidth:1200, margin:"0 auto",
      padding:`80px ${bp==="mobile"?"0":bp==="tablet"?"2rem":"3rem"} 0`,
      opacity:mounted?1:0, transform:mounted?"none":"translateY(8px)",
      transition:"all 0.35s ease" }}>
      {children}
    </div>
  );
}
