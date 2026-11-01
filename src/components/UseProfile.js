import { useEffect, useState } from "react";

export function useProfile() {
  const [data, setData] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetch("/api/profile")
      .then(async response => {
        if (!response.ok) throw new Error("Perfil no disponible");
        return response.json();
      })
      .then(profile => { if (active) setData(profile); })
      .catch(() => { if (active) setData(false); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { loading, data };
}
