import { useEffect, useRef } from "react";
import { API_BASE } from "../../../src/config";
import { subscribePush } from "../../../src/services/api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications(clerkId) {
  const subscribed = useRef(false);

  useEffect(() => {
    if (!clerkId || subscribed.current) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    let registration;

    async function subscribe() {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const keyRes = await fetch(`${API_BASE}/api/push/vapid-key`, { method: "POST" });
        const { publicKey } = await keyRes.json();

        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          await existing.unsubscribe();
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        await subscribePush(subscription);

        subscribed.current = true;
      } catch (err) {
        console.warn("Push subscription failed:", err.message);
      }
    }

    subscribe();
  }, [clerkId]);
}
