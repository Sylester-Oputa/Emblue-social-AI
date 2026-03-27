"use client";

import React, { useState, useRef } from "react";
import { useSignals } from "@/hooks/use-signals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Radio, Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { FaXTwitter, FaInstagram, FaFacebook, FaTiktok } from "react-icons/fa6";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";

const statusColors: Record<string, string> = {
  NEW: "bg-blue-500/10 text-blue-500",
  PROCESSING: "bg-yellow-500/10 text-yellow-500",
  RESPONDED: "bg-green-500/10 text-green-500",
  ESCALATED: "bg-orange-500/10 text-orange-500",
  IGNORED: "bg-gray-500/10 text-gray-500",
  NORMALIZED: "bg-purple-500/10 text-purple-500",
};

const platformIcons: Record<string, any> = {
  X: FaXTwitter,
  INSTAGRAM: FaInstagram,
  FACEBOOK: FaFacebook,
  TIKTOK: FaTiktok,
};

export default function SignalsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("");
  const [platform, setPlatform] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "/",
      description: "Focus search",
      handler: () => {
        searchInputRef.current?.focus();
      },
    },
    {
      key: "?",
      shiftKey: true,
      description: "Show keyboard shortcuts",
      handler: () => {
        setShowShortcuts(true);
      },
    },
    {
      key: "Escape",
      description: "Clear selection",
      handler: () => {
        if (selectedIds.length > 0) {
          setSelectedIds([]);
        }
      },
    },
  ]);
  const { data, isLoading } = useSignals({
    page,
    limit: 20,
    status: status || undefined,
    platform: platform || undefined,
    search: search || undefined,
  });

  const signals = Array.isArray(data) ? data : data?.items || [];
  const total = data?.meta?.total ?? signals.length;

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === signals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(signals.map((s: any) => s.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      // Note: This requires a backend endpoint for bulk delete
      // For now, show a warning that this feature needs backend implementation
      toast.warning(
        `Bulk delete for ${selectedIds.length} items requires backend implementation`,
      );
      // TODO: Implement backend bulk delete endpoint
      // await api.delete('/signals/bulk', { data: { ids: selectedIds } });
      // setSelectedIds([]);
      // queryClient.invalidateQueries(['signals']);
    } catch (error) {
      toast.error("Failed to delete signals");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Signals</h2>
        <Badge variant="outline" className="text-sm">
          <Radio className="mr-1 h-3 w-3" /> {total} total
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search signals... (Press / to focus)"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={platform}
            onValueChange={(v) => {
              setPlatform(v === "ALL" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Platforms</SelectItem>
              <SelectItem value="X">X (Twitter)</SelectItem>
              <SelectItem value="INSTAGRAM">Instagram</SelectItem>
              <SelectItem value="FACEBOOK">Facebook</SelectItem>
              <SelectItem value="TIKTOK">TikTok</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v === "ALL" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="PROCESSING">Processing</SelectItem>
              <SelectItem value="RESPONDED">Responded</SelectItem>
              <SelectItem value="ESCALATED">Escalated</SelectItem>
              <SelectItem value="NORMALIZED">Normalized</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Active Filters Chips */}
      {(search || status || platform) && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {search && (
            <Badge variant="secondary" className="gap-1">
              Search: {search}
              <button
                onClick={() => setSearch("")}
                className="ml-1 hover:bg-muted rounded-full"
                aria-label="Clear search filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {platform && (
            <Badge variant="secondary" className="gap-1">
              Platform: {platform}
              <button
                onClick={() => setPlatform("")}
                className="ml-1 hover:bg-muted rounded-full"
                aria-label="Clear platform filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {status && (
            <Badge variant="secondary" className="gap-1">
              Status: {status}
              <button
                onClick={() => setStatus("")}
                className="ml-1 hover:bg-muted rounded-full"
                aria-label="Clear status filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setPlatform("");
              setStatus("");
              setPage(1);
            }}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <Card className="bg-muted">
          <CardContent className="flex items-center justify-between py-3">
            <p className="text-sm font-medium">
              {selectedIds.length} signal{selectedIds.length !== 1 ? "s" : ""}{" "}
              selected
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds([])}
              >
                Clear Selection
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedIds.length === signals.length &&
                        signals.length > 0
                      }
                      onCheckedChange={toggleAll}
                      aria-label="Select all signals"
                    />
                  </TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead className="max-w-[300px]">Content</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signals.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No signals found
                    </TableCell>
                  </TableRow>
                ) : (
                  signals.map((signal: any) => (
                    <TableRow key={signal.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(signal.id)}
                          onCheckedChange={() => toggleSelection(signal.id)}
                          aria-label={`Select signal from ${signal.author}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/signals/${signal.id}`}
                          className="flex items-center gap-2"
                        >
                          {platformIcons[signal.platform] ? (
                            React.createElement(
                              platformIcons[signal.platform],
                              {
                                className: "w-4 h-4",
                              },
                            )
                          ) : (
                            <Radio className="w-4 h-4" />
                          )}
                          <span className="text-sm">{signal.platform}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/signals/${signal.id}`}
                          className="font-medium"
                        >
                          {signal.author || "Unknown"}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <Link href={`/signals/${signal.id}`}>
                          <p className="truncate text-sm">{signal.content}</p>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {signal.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            statusColors[signal.status] ||
                            "bg-gray-100 text-gray-600"
                          }
                        >
                          {signal.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(
                          signal.receivedAt || signal.createdAt,
                        ).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page} · {total} signals
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={signals.length < 20}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
      />
    </div>
  );
}
