"use client";

import React, { useState } from "react";
import {
  useEscalatedResponses,
  useOverrideResponse,
} from "@/hooks/use-responses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Radio,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { FaXTwitter, FaInstagram, FaFacebook, FaTiktok } from "react-icons/fa6";

const platformIcons: Record<string, any> = {
  X: FaXTwitter,
  INSTAGRAM: FaInstagram,
  FACEBOOK: FaFacebook,
  TIKTOK: FaTiktok,
};

export default function EscalatedPage() {
  const [page, setPage] = useState(1);
  const { data: escalated, isLoading } = useEscalatedResponses({
    page,
    limit: 10,
  });
  const override = useOverrideResponse();

  const handleAction = async (
    responseId: string,
    action: "approve" | "reject",
  ) => {
    try {
      await override.mutateAsync({ responseId, action });
      toast.success(`Draft ${action}d successfully`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to ${action}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Escalation Queue</h2>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  const items = Array.isArray(escalated) ? escalated : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Escalation Queue</h2>
        <Badge variant="destructive" className="text-sm">
          <ShieldAlert className="mr-1 h-3 w-3" /> {items.length} pending review
        </Badge>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">All clear!</p>
            <p className="text-sm text-muted-foreground">
              No escalated drafts require review
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item: any) => (
            <Card key={item.id} className="border-l-4 border-l-orange-500">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="font-medium text-sm">
                        Escalated Draft
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs flex items-center gap-1"
                      >
                        {item.signal?.platform &&
                        platformIcons[item.signal.platform] ? (
                          React.createElement(
                            platformIcons[item.signal.platform],
                            {
                              className: "w-3 h-3",
                            },
                          )
                        ) : (
                          <Radio className="w-3 h-3" />
                        )}
                        {item.signal?.platform || "Unknown"}
                      </Badge>
                    </div>

                    {/* Original signal */}
                    {item.signal && (
                      <div className="rounded-md bg-muted p-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          Original Signal from @{item.signal.author}
                        </p>
                        <p className="text-sm">{item.signal.content}</p>
                      </div>
                    )}

                    {/* Draft response */}
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground mb-1">
                        AI-Generated Response
                      </p>
                      <p className="text-sm">{item.generatedText}</p>
                    </div>

                    {/* Reasons */}
                    {item.reasons && item.reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.reasons.map((reason: string, i: number) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs"
                          >
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {item.confidence !== undefined && (
                        <span>
                          Confidence: {(item.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                      <span>·</span>
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleAction(item.id, "approve")}
                      disabled={override.isPending}
                    >
                      {override.isPending ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-1 h-3 w-3" />
                      )}
                      {override.isPending ? "Processing..." : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAction(item.id, "reject")}
                      disabled={override.isPending}
                    >
                      {override.isPending ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <XCircle className="mr-1 h-3 w-3" />
                      )}
                      {override.isPending ? "Processing..." : "Reject"}
                    </Button>
                    <Link href={`/signals/${item.signalId}`}>
                      <Button size="sm" variant="outline" className="w-full">
                        View Signal
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <div className="text-sm text-muted-foreground">Page {page}</div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={items.length < 10}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
