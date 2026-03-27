"use client";

import { Bell, Menu, User, Zap, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { useUnreadCount } from "@/hooks/use-notifications";
import { useCurrentWorkspaceId } from "@/hooks/use-workspace";
import {
  useAutomationStatus,
  usePauseAutomation,
  useResumeAutomation,
} from "@/hooks/use-automation";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { toast } from "sonner";

const DEMO_PAYLOADS = [
  {
    platform: "X",
    payload: {
      tweet_id: `demo-x-${Date.now()}`,
      text: "Just discovered @EmblueAI — this is exactly what our social team needs! How does the automation engine handle compliance reviews? 🤖",
      user: {
        screen_name: "TechStartupCEO",
        id: "demo-user-1",
      },
      type: "mention",
    },
  },
  {
    platform: "INSTAGRAM",
    payload: {
      id: `demo-ig-${Date.now()}`,
      comment: {
        text: "Your AI response suggestions are incredibly accurate. Can we integrate this with our existing CRM workflow?",
      },
      from: {
        username: "digital_marketing_pro",
        id: "demo-user-2",
      },
      type: "comment",
    },
  },
  {
    platform: "FACEBOOK",
    payload: {
      id: `demo-fb-${Date.now()}`,
      message: {
        text: "URGENT: Getting error 500 on checkout page, order #45839 stuck for 2 hours. Need immediate resolution or requesting full refund!",
      },
      from: {
        name: "Sarah Mitchell",
        id: "demo-user-3",
      },
      type: "comment",
    },
  },
];

export function Header() {
  const { user, logout } = useAuth();
  const { data: unreadCount } = useUnreadCount();
  const workspaceId = useCurrentWorkspaceId();
  const { data: automationStatus } = useAutomationStatus();
  const pauseAutomation = usePauseAutomation();
  const resumeAutomation = useResumeAutomation();
  const [demoLoading, setDemoLoading] = useState(false);

  const isAutomationActive = automationStatus?.automationEnabled !== false;

  const toggleAutomation = async () => {
    try {
      if (isAutomationActive) {
        await pauseAutomation.mutateAsync(undefined);
        toast.success("Automation paused");
      } else {
        await resumeAutomation.mutateAsync(undefined);
        toast.success("Automation resumed");
      }
    } catch {
      toast.error("Failed to toggle automation");
    }
  };

  const triggerDemo = async () => {
    if (!workspaceId) {
      toast.error("No workspace available");
      return;
    }
    setDemoLoading(true);
    try {
      const demoData =
        DEMO_PAYLOADS[Math.floor(Math.random() * DEMO_PAYLOADS.length)];

      // Generate unique ID for this demo event
      const uniqueId = `demo-${demoData.platform.toLowerCase()}-${Date.now()}`;

      // Update the ID in the payload to ensure uniqueness
      const payload = { ...demoData.payload };
      if (demoData.platform === "X") {
        payload.tweet_id = uniqueId;
      } else {
        payload.id = uniqueId;
      }

      await api.post(`/ingestion/webhook/${demoData.platform}`, payload);
      toast.success("Demo event fired!", {
        description: "Watch the pipeline process it in real-time",
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Demo trigger failed");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open mobile menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Social Operations Dashboard</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleAutomation}
          disabled={pauseAutomation.isPending || resumeAutomation.isPending}
          className={`gap-2 ${isAutomationActive ? "border-green-500/50 text-green-600 hover:bg-green-500/10 dark:text-green-400" : "border-red-500/50 text-red-600 hover:bg-red-500/10 dark:text-red-400"}`}
        >
          {isAutomationActive ? (
            <>
              <Play className="h-3 w-3 fill-current" />
              Active
            </>
          ) : (
            <>
              <Pause className="h-3 w-3" />
              Paused
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={triggerDemo}
          disabled={demoLoading}
          className="gap-2 border-dashed border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10 hover:text-yellow-600 dark:text-yellow-400 dark:hover:text-yellow-400"
        >
          <Zap className="h-4 w-4" />
          {demoLoading ? "Firing..." : "Demo Mode"}
        </Button>

        <Link href="/notifications">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={`Notifications${(unreadCount ?? 0) > 0 ? ` (${unreadCount} unread)` : ""}`}
          >
            <Bell className="h-5 w-5" />
            {(unreadCount ?? 0) > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>
        </Link>

        <ThemeToggle />

        <div className="flex items-center gap-2 border-l pl-2">
          <div className="hidden text-right text-sm md:block">
            <p className="font-medium">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{user?.role}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            aria-label="Logout"
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
