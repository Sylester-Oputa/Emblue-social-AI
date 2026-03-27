"use client";

import { useState } from "react";
import {
  useShortlinks,
  useCreateShortlink,
  useDeleteShortlink,
} from "@/hooks/use-shortlinks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Link2,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  MousePointerClick,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005";

export default function ShortlinksPage() {
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    destinationUrl: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmContent: "",
  });

  const { data, isLoading } = useShortlinks({ page, limit: 20 });
  const create = useCreateShortlink();
  const deleteLink = useDeleteShortlink();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({
        destinationUrl: formData.destinationUrl,
        utmSource: formData.utmSource || undefined,
        utmMedium: formData.utmMedium || undefined,
        utmCampaign: formData.utmCampaign || undefined,
        utmContent: formData.utmContent || undefined,
      });
      toast.success("Shortlink created");
      setDialogOpen(false);
      setFormData({
        destinationUrl: "",
        utmSource: "",
        utmMedium: "",
        utmCampaign: "",
        utmContent: "",
      });
    } catch {
      toast.error("Failed to create shortlink");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLink.mutateAsync(id);
      toast.success("Shortlink deleted");
    } catch {
      toast.error("Failed to delete shortlink");
    }
  };

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(`${API_URL}/s/${code}`);
    toast.success("Copied to clipboard");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Shortlinks</h2>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const links = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link2 className="h-8 w-8 text-blue-500" />
          <h2 className="text-3xl font-bold tracking-tight">Shortlinks</h2>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Shortlink
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Shortlink</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="destinationUrl">Destination URL *</Label>
                <Input
                  id="destinationUrl"
                  type="url"
                  required
                  placeholder="https://example.com/page"
                  value={formData.destinationUrl}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      destinationUrl: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="utmSource">UTM Source</Label>
                  <Input
                    id="utmSource"
                    placeholder="social"
                    value={formData.utmSource}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, utmSource: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="utmMedium">UTM Medium</Label>
                  <Input
                    id="utmMedium"
                    placeholder="reply"
                    value={formData.utmMedium}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, utmMedium: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="utmCampaign">UTM Campaign</Label>
                  <Input
                    id="utmCampaign"
                    placeholder="campaign-name"
                    value={formData.utmCampaign}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        utmCampaign: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="utmContent">UTM Content</Label>
                  <Input
                    id="utmContent"
                    placeholder="variant-a"
                    value={formData.utmContent}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, utmContent: e.target.value }))
                    }
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={create.isPending}
              >
                {create.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Links List */}
      <div className="space-y-3">
        {links.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No shortlinks yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create one to start tracking clicks
              </p>
            </CardContent>
          </Card>
        ) : (
          links.map((link: any) => (
            <Card key={link.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-primary">
                        {API_URL}/s/{link.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyLink(link.code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      {link.destinationUrl}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {link.utmSource && (
                        <Badge variant="secondary" className="text-xs">
                          source: {link.utmSource}
                        </Badge>
                      )}
                      {link.utmMedium && (
                        <Badge variant="secondary" className="text-xs">
                          medium: {link.utmMedium}
                        </Badge>
                      )}
                      {link.utmCampaign && (
                        <Badge variant="secondary" className="text-xs">
                          campaign: {link.utmCampaign}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-lg font-bold">
                        <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                        {link.clickCount ?? 0}
                      </div>
                      <p className="text-xs text-muted-foreground">clicks</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(link.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
