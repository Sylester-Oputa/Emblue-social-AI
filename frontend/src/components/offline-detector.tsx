"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineDetector() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <Card
        className={
          isOnline ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
        }
      >
        <CardContent className="flex items-center gap-3 py-3">
          {isOnline ? (
            <Wifi className="h-5 w-5 text-green-600" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-600" />
          )}
          <div>
            <p
              className={`font-semibold ${isOnline ? "text-green-900" : "text-red-900"}`}
            >
              {isOnline ? "Back Online" : "No Connection"}
            </p>
            <p
              className={`text-sm ${isOnline ? "text-green-700" : "text-red-700"}`}
            >
              {isOnline
                ? "Your connection has been restored"
                : "Check your internet connection"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
