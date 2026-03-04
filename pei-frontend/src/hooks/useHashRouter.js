import { useState, useEffect, useCallback } from "react";

export function useHashRouter() {
  const [page, setPage] = useState(() => window.location.hash.replace("#/", "") || "home");
  const navigate = useCallback((p) => {
    window.location.hash = `#/${p}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  useEffect(() => {
    const onHash = () => {
      setPage(window.location.hash.replace("#/", "") || "home");
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return { page, navigate };
}
