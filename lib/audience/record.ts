import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, isBotUserAgent, isPrefetch } from "./bot";

// Record one privacy-first view of a *published* artifact. SERVER-ONLY: it reads the request IP +
// User-Agent from headers (so it must run in a request scope — never a client component), skips
// prefetches and bots, and calls the SECURITY DEFINER recorder via the service-role client. The
// IP/UA are used only to compute a salted one-way hash inside Postgres and are never stored — see
// migration 0011 + foundation/security-and-privacy.md (Audience measurement). Never throws:
// analytics must never break a page render.
export async function recordArtifactView(artifactId: string): Promise<void> {
  try {
    const h = headers();
    const get = (name: string) => h.get(name);
    if (isPrefetch(get)) return;
    const ua = get("user-agent");
    if (isBotUserAgent(ua)) return;
    const ip = clientIp(get);
    const supabase = createAdminClient();
    await supabase.rpc("record_artifact_view", {
      p_artifact_id: artifactId,
      p_ip: ip,
      p_ua: ua ?? "",
    });
  } catch {
    // swallow — a failed view-record must never break the public read path
  }
}
