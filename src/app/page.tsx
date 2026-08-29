import { Box } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { Features } from "@/components/marketing/features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { SiteFooter } from "@/components/marketing/site-footer";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authed = Boolean(user);

  return (
    <Box display="flex" flexDirection="column" minH="dvh">
      <Navbar authed={authed} />
      <Hero authed={authed} />
      <Features />
      <HowItWorks />
      <SiteFooter />
    </Box>
  );
}
