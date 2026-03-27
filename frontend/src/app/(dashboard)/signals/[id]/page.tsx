"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useSignal } from "@/hooks/use-signals";
import {
  useResponses,
  useGenerateResponse,
  useOverrideResponse,
} from "@/hooks/use-responses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Sparkles,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Radio,
  ThumbsUp,
  ThumbsDown,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { FaXTwitter, FaInstagram, FaFacebook, FaTiktok } from "react-icons/fa6";

const statusIcons: Record<string, any> = {
  DRAFT: Clock,
  APPROVED: CheckCircle,
  POSTED: CheckCircle,
  FAILED: XCircle,
  ESCALATED: AlertTriangle,
};

const platformIcons: Record<string, any> = {
  X: FaXTwitter,
  INSTAGRAM: FaInstagram,
  FACEBOOK: FaFacebook,
  TIKTOK: FaTiktok,
};

export default function SignalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: signal, isLoading } = useSignal(id);
  const { data: responses } = useResponses(id);
  const generate = useGenerateResponse();
  const override = useOverrideResponse();

  const handleGenerate = async () => {
    try {
      await generate.mutateAsync(id);
      toast.success("AI response generated");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to generate response");
    }
  };

  const handleApprove = async (responseId: string) => {
    try {
      await override.mutateAsync({ responseId, action: "approve" });
      toast.success("Response approved");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to approve");
    }
  };

  const handleReject = async (responseId: string) => {
    try {
      await override.mutateAsync({ responseId, action: "reject" });
      toast.success("Response rejected");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reject");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">Signal not found</p>
        <Link href="/signals">
          <Button variant="link">Back to signals</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/signals">
          <Button variant="ghost" size="icon" aria-label="Back to signals">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">Signal Detail</h2>
          <p className="text-sm text-muted-foreground">{signal.id}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Signal Content */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Content</CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  {platformIcons[signal.platform] ? (
                    React.createElement(platformIcons[signal.platform], {
                      className: "w-3 h-3",
                    })
                  ) : (
                    <Radio className="w-3 h-3" />
                  )}
                  {signal.platform}
                </Badge>
                <Badge variant="outline">{signal.type}</Badge>
                <Badge>{signal.status}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Author</p>
              <p className="font-medium">{signal.author}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-1">Message</p>
              <p className="whitespace-pre-wrap">{signal.content}</p>
            </div>
            <Separator />
            <div className="flex gap-8 text-sm">
              <div>
                <p className="text-muted-foreground">Received</p>
                <p>
                  {new Date(
                    signal.receivedAt || signal.createdAt,
                  ).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">External ID</p>
                <p className="font-mono text-xs">{signal.externalEventId}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform</span>
              <span className="font-medium">{signal.platform}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">{signal.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline">{signal.status}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Processed</span>
              <span>{signal.processed ? "Yes" : "No"}</span>
            </div>
            <Separator />
            <Button
              onClick={handleGenerate}
              disabled={generate.isPending}
              className="w-full"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {generate.isPending ? "Generating..." : "Generate AI Response"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Response Variants */}
      {responses && responses.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Response Variants</CardTitle>
              <Badge variant="outline">
                {responses.length} variant{responses.length !== 1 && "s"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {responses.map((resp: any, idx: number) => {
              const StatusIcon = statusIcons[resp.status] || Clock;
              const statusColors: Record<string, string> = {
                DRAFT: "border-gray-500/20 bg-gray-500/5",
                APPROVED: "border-green-500/20 bg-green-500/5",
                AUTO_APPROVED: "border-green-500/20 bg-green-500/5",
                POSTED: "border-blue-500/20 bg-blue-500/5",
                SENT: "border-blue-500/20 bg-blue-500/5",
                FAILED: "border-red-500/20 bg-red-500/5",
                ESCALATED: "border-orange-500/20 bg-orange-500/5",
              };
              const riskColor =
                resp.riskLevel === "HIGH"
                  ? "text-red-500"
                  : resp.riskLevel === "MEDIUM"
                    ? "text-yellow-500"
                    : "text-green-500";
              return (
                <div
                  key={resp.id}
                  className={`rounded-lg border-2 p-4 space-y-3 ${statusColors[resp.status] || "border-gray-500/20"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">
                        #{idx + 1}
                      </span>
                      <StatusIcon className="h-4 w-4" />
                      <Badge variant="outline">{resp.status}</Badge>
                      {resp.tone && (
                        <Badge variant="secondary">{resp.tone}</Badge>
                      )}
                      {resp.riskLevel && (
                        <Badge
                          variant={
                            resp.riskLevel === "HIGH"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {resp.riskLevel} Risk
                        </Badge>
                      )}
                      {resp.riskFlag && (
                        <Badge
                          variant="destructive"
                          className="flex items-center gap-1"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          Flagged
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(resp.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="rounded-md bg-background/50 p-3">
                    <p className="text-sm whitespace-pre-wrap">
                      {resp.generatedText || resp.content}
                    </p>
                  </div>

                  {/* Risk Reasons */}
                  {resp.riskReasons && resp.riskReasons.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {resp.riskReasons.map((reason: string, ri: number) => (
                        <Badge key={ri} variant="outline" className={riskColor}>
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Metrics Bar */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {resp.confidence !== undefined && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Confidence:</span>
                        <span
                          className={`font-bold ${resp.confidence >= 0.8 ? "text-green-500" : resp.confidence >= 0.5 ? "text-yellow-500" : "text-red-500"}`}
                        >
                          {(resp.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                    {resp.riskScore !== undefined && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Risk Score:</span>
                        <span
                          className={`font-bold ${resp.riskScore >= 70 ? "text-red-500" : resp.riskScore >= 40 ? "text-yellow-500" : "text-green-500"}`}
                        >
                          {resp.riskScore}
                        </span>
                      </div>
                    )}
                    {resp.approvedBy && (
                      <span>
                        Approved by:{" "}
                        {resp.approvedBy === "system" ? "AI" : "User"}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {(resp.status === "DRAFT" ||
                    resp.status === "ESCALATED" ||
                    resp.status === "AUTO_APPROVED") && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(resp.id)}
                        disabled={override.isPending}
                        className="flex-1"
                      >
                        {override.isPending ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <ThumbsUp className="mr-1 h-3 w-3" />
                        )}
                        {override.isPending
                          ? "Processing..."
                          : "Approve & Send"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(resp.id)}
                        disabled={override.isPending}
                        className="flex-1"
                      >
                        {override.isPending ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <ThumbsDown className="mr-1 h-3 w-3" />
                        )}
                        {override.isPending ? "Processing..." : "Reject"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
