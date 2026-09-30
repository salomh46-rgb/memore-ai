"use client";

import { useEffect, useState } from "react";
import { Sparkles, UserCheck } from "lucide-react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
        };
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        HapticFeedback?: {
          impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
          notificationOccurred: (type: "error" | "success" | "warning") => void;
        };
      };
    };
  }
}

export default function TelegramWebAppInit() {
  const [userName, setUserName] = useState<string | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      try {
        tg.ready();
        tg.expand();
        if (tg.setHeaderColor) tg.setHeaderColor("#050B18");
        if (tg.setBackgroundColor) tg.setBackgroundColor("#050B18");

        const user = tg.initDataUnsafe?.user;
        if (user?.first_name) {
          setUserName(user.first_name);
          setIsTelegram(true);
        }
      } catch (e) {
        console.error("Telegram WebApp init error:", e);
      }
    }
  }, []);

  if (!isTelegram) return null;

  return (
    <div className="w-full bg-[#4F8EF7]/10 border-b border-[#4F8EF7]/20 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm text-[#4F8EF7] sticky top-0 z-50 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <UserCheck size={16} />
        <span>
          Xush kelibsiz, <strong>{userName}</strong>!
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-slate-300">
        <Sparkles size={14} className="text-amber-400" />
        <span>Me'morAI Mini App</span>
      </div>
    </div>
  );
}
