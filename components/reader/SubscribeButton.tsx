"use client";

import { useState, useTransition } from "react";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setSubscribed } from "@/lib/reader/actions";

// Records subscription intent now; transactional email is later scope. The RSS feed (/feed.xml)
// is the working channel in the meantime.
export function SubscribeButton({ initial, signedIn }: { initial: boolean; signedIn: boolean }) {
  const [subscribed, setSub] = useState(initial);
  const [pending, start] = useTransition();

  const onClick = () =>
    start(async () => {
      if (!signedIn) {
        toast.error("Sign in to subscribe.");
        return;
      }
      const res = await setSubscribed({ subscribed: !subscribed });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSub(res.subscribed);
      toast.success(res.subscribed ? "Subscribed to new explainers." : "Unsubscribed.");
    });

  return (
    <Button variant={subscribed ? "outline" : "default"} size="sm" onClick={onClick} disabled={pending}>
      {subscribed ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      {subscribed ? "Subscribed" : "Subscribe"}
    </Button>
  );
}
