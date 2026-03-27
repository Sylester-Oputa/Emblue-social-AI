"use client";

import React from "react";
import {
  useIntegrations,
  useConnectIntegration,
  useDisconnectIntegration,
} from "@/hooks/use-integrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plug,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { FaXTwitter, FaInstagram, FaFacebook, FaTiktok } from "react-icons/fa6";

const platformConfig: Record<
  string,
  { name: string; icon: any; color: string; description: string }
> = {
  X: {
    name: "X (Twitter)",
    icon: FaXTwitter,
    color: "border-l-sky-500",
    description: "Monitor mentions, DMs, and replies on X",
  },
  INSTAGRAM: {
    name: "Instagram",
    icon: FaInstagram,
    color: "border-l-pink-500",
    description: "Track comments, stories, and brand mentions",
  },
  FACEBOOK: {
    name: "Facebook",
    icon: FaFacebook,
    color: "border-l-blue-600",
    description: "Manage page comments and inbox messages",
  },
  TIKTOK: {
    name: "TikTok",
    icon: FaTiktok,
    color: "border-l-teal-500",
    description: "Engage with video comments and trends",
  },
};

const ALL_PLATFORMS = ["X", "INSTAGRAM", "FACEBOOK", "TIKTOK"];

export default function IntegrationsPage() {
  const { data: integrations, isLoading } = useIntegrations();
  const connectIntegration = useConnectIntegration();
  const disconnectIntegration = useDisconnectIntegration();

  const items = Array.isArray(integrations) ? integrations : [];
  const connectedPlatforms = new Set(items.map((i: any) => i.platform));

  const handleConnect = async (platform: string) => {
    try {
      await connectIntegration.mutateAsync({
        platform,
        accountId: `demo_${platform.toLowerCase()}_account`,
        accountName: `Demo ${platformConfig[platform]?.name || platform} Account`,
        scopes: ["read", "write"],
        accessToken: "demo_token_" + platform.toLowerCase(),
        refreshToken: "demo_refresh_" + platform.toLowerCase(),
      });
      toast.success(
        `Connected to ${platformConfig[platform]?.name || platform}`,
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to connect");
    }
  };

  const handleDisconnect = async (id: string, platform: string) => {
    try {
      await disconnectIntegration.mutateAsync(id);
      toast.success(
        `Disconnected from ${platformConfig[platform]?.name || platform}`,
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to disconnect");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Integrations</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Integrations</h2>
          <p className="text-muted-foreground">
            Connect your social media platforms to start monitoring
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Plug className="mr-1 h-3 w-3" /> {items.length} connected
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ALL_PLATFORMS.map((platform) => {
          const config = platformConfig[platform];
          const integration = items.find((i: any) => i.platform === platform);
          const isConnected = !!integration;

          return (
            <Card key={platform} className={`border-l-4 ${config.color}`}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <span className="text-3xl flex items-center">
                    {React.createElement(config.icon, { className: "w-7 h-7" })}
                  </span>
                  <div>
                    <CardTitle className="text-base">{config.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                </div>
                {isConnected ? (
                  <Badge className="bg-green-500/10 text-green-500">
                    <CheckCircle className="mr-1 h-3 w-3" /> Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <XCircle className="mr-1 h-3 w-3" /> Not connected
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {isConnected && integration ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Account</span>
                      <span className="font-medium">
                        {integration.accountName || "Connected"}
                      </span>
                    </div>
                    {integration.lastSyncAt && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Last sync</span>
                        <span>
                          {new Date(integration.lastSyncAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" disabled>
                        <RefreshCw className="mr-1 h-3 w-3" /> Sync
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            Disconnect
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Disconnect {config.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the integration. You can
                              reconnect later.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleDisconnect(integration.id, platform)
                              }
                            >
                              Disconnect
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleConnect(platform)}
                    disabled={connectIntegration.isPending}
                  >
                    {connectIntegration.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="mr-2 h-4 w-4" />
                    )}
                    {connectIntegration.isPending
                      ? "Connecting..."
                      : `Connect ${config.name}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
