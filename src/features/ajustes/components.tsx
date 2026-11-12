"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { removePushSubscription, savePushSubscription, sendTestPush } from "./actions";

/** Interruptor visual (el botón que lo envuelve lleva aria-pressed). */
export function Toggle({ on }: { on: boolean }) {
  return (
    <span className={cn("relative h-7 w-[46px] shrink-0 rounded-full transition-colors", on ? "bg-accent" : "bg-surface-2")} aria-hidden>
      <span className={cn("absolute top-[3px] left-[3px] size-[22px] rounded-full transition-transform", on ? "translate-x-[18px] bg-ink" : "bg-muted")} />
    </span>
  );
}

export function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="small"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copiada" : label}
    </Button>
  );
}

const base64ToBytes = (base64: string) => {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};

type Status = "cargando" | "no-soportado" | "sin-sw" | "denegado" | "activo" | "inactivo";

const MESSAGES: Record<Exclude<Status, "activo" | "inactivo">, string> = {
  cargando: "Comprobando…",
  "no-soportado": "Este navegador no admite notificaciones. En iPhone, añade root a la pantalla de inicio y ábrela desde ahí.",
  "sin-sw": "Las notificaciones funcionan en la app desplegada (producción), no en desarrollo.",
  denegado: "Has bloqueado las notificaciones. Actívalas en los ajustes del sistema para root.",
};

/** Activa las notificaciones push en este dispositivo. */
export function PushSetup({ publicKey }: { publicKey: string }) {
  const [status, setStatus] = useState<Status>("cargando");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: Status;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) next = "no-soportado";
      else if (Notification.permission === "denied") next = "denegado";
      else {
        const registration = await navigator.serviceWorker.getRegistration();
        next = !registration ? "sin-sw" : (await registration.pushManager.getSubscription()) ? "activo" : "inactivo";
      }
      if (!cancelled) setStatus(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = () =>
    startTransition(async () => {
      setMessage(null);
      if ((await Notification.requestPermission()) !== "granted") return setStatus("denegado");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(publicKey) });
      const result = await savePushSubscription(subscription.toJSON(), navigator.userAgent);
      if (result?.error) return setMessage(result.error);
      setStatus("activo");
    });

  const disable = () =>
    startTransition(async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("inactivo");
    });

  const test = () =>
    startTransition(async () => {
      const result = await sendTestPush();
      setMessage(result?.error ?? "Enviada. Debería llegarte en unos segundos.");
    });

  if (!publicKey) return <p className="text-[13px] text-muted">Faltan las claves VAPID en .env (NEXT_PUBLIC_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY).</p>;
  if (status !== "activo" && status !== "inactivo") return <p className="text-[13px] text-muted">{MESSAGES[status]}</p>;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {status === "activo" ? (
          <>
            <Button variant="small" onClick={test} disabled={pending}>
              Enviar prueba
            </Button>
            <Button variant="small" onClick={disable} disabled={pending}>
              Desactivar aquí
            </Button>
          </>
        ) : (
          <Button onClick={enable} disabled={pending} wide>
            Activar en este dispositivo
          </Button>
        )}
      </div>
      {message && <p className="text-[13px] text-muted">{message}</p>}
    </div>
  );
}
