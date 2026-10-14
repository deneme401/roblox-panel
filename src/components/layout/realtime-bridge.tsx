"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { connectRealtime, onChange } from "@/lib/realtime/client";

/** Kanala bağlanır; diğer kullanıcı bir şey değiştirince sayfayı sessizce yeniler. */
export function RealtimeBridge({ member }: { member: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    connectRealtime(member);
    return onChange(() => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 400);
    });
  }, [member, router]);
  return null;
}
