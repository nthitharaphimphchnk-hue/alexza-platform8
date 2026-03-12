import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";

export default function InviteLanding() {
  const [, params] = useRoute("/invite/:code");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const code = params?.code ?? "";
    if (code) {
      try {
        window.localStorage.setItem("alexza_referral_code", code);
      } catch {
        // ignore storage errors
      }
      setLocation(`/signup?ref=${encodeURIComponent(code)}`);
    } else {
      setLocation("/signup");
    }
  }, [params, setLocation]);

  return null;
}

