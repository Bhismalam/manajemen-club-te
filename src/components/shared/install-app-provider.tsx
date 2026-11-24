"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallAppState = {
  platform: "ios" | "other" | "standalone" | null;
  installed: boolean;
  canInstall: boolean;
  installing: boolean;
  message: string | null;
  install: () => Promise<void>;
};

const InstallAppContext = createContext<InstallAppState | null>(null);
const STANDALONE_QUERY = "(display-mode: standalone)";

function subscribePlatform(onChange: () => void) {
  const media = window.matchMedia(STANDALONE_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getPlatform(): InstallAppState["platform"] {
  const iosStandalone = "standalone" in navigator && navigator.standalone === true;
  if (window.matchMedia(STANDALONE_QUERY).matches || iosStandalone) return "standalone";
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return isIOS ? "ios" : "other";
}

// Mounted at the root so the browser's install event is captured before account data loads.
export function InstallAppProvider({ children }: { children: React.ReactNode }) {
  const platform = useSyncExternalStore(subscribePlatform, getPlatform, () => null);
  const [installed, setInstalled] = useState(false);
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    function onPrompt(event: Event) {
      if (!("prompt" in event) || typeof event.prompt !== "function" || !("userChoice" in event)) {
        return;
      }
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setMessage(null);
    }

    function onInstalled() {
      setInstalled(true);
      setPromptEvent(null);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent || busy.current) return;
    busy.current = true;
    setInstalling(true);
    setMessage(null);
    try {
      // prompt() must run directly from the user's click; each event can only be used once.
      const prompted = promptEvent.prompt();
      setPromptEvent(null);
      await prompted;
      const choice = await promptEvent.userChoice;
      setMessage(
        choice.outcome === "dismissed"
          ? "Pemasangan dibatalkan. Kamu tetap bisa memakai TE melalui browser."
          : "Ikuti proses pemasangan dari browser, lalu buka TE dari ikon aplikasi.",
      );
    } catch {
      setPromptEvent(null);
      setMessage("Pemasangan belum berhasil. Coba melalui menu pemasangan di browser.");
    } finally {
      busy.current = false;
      setInstalling(false);
    }
  }

  return (
    <InstallAppContext.Provider
      value={{
        platform,
        installed,
        canInstall: promptEvent !== null,
        installing,
        message,
        install,
      }}
    >
      {children}
    </InstallAppContext.Provider>
  );
}

export function useInstallApp() {
  const state = useContext(InstallAppContext);
  if (!state) throw new Error("useInstallApp requires InstallAppProvider");
  return state;
}
