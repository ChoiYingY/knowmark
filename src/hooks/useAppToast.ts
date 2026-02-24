import { useCallback, useRef } from "react";
import { toast } from "sonner";

type AppToastType = "success" | "error" | "info";

const TOAST_ID = "app-toast";

export function useAppToast() {
  const lastToastMsg = useRef<string>("");

  const showToast = useCallback((msg: string, type: AppToastType) => {
    // Dedupe repeated rapid messages
    if (lastToastMsg.current === msg) {
      toast.dismiss(TOAST_ID);
    }
    lastToastMsg.current = msg;

    const opts = { id: TOAST_ID };

    if (type === "success") toast.success(msg, opts);
    else if (type === "error") toast.error(msg, opts);
    else toast(msg, opts);
  }, []);

  const dismissToast = useCallback((id?: string) => {
    toast.dismiss(id ?? TOAST_ID);
  }, []);

  return {
    showToast,
    dismissToast,
  };
}