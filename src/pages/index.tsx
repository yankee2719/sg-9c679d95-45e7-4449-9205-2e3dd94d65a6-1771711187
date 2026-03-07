// src/pages/index.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";

export default function HomeRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          router.replace("/dashboard");
          return;
        }

        router.replace("/login");
      } catch (error) {
        console.error(error);
        router.replace("/login");
      }
    };

    run();
  }, [router]);

  return null;
}
