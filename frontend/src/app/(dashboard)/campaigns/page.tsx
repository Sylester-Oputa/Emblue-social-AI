"use client";

import { useState } from "react";
import {
  useCampaigns,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
} from "@/hooks/use-campaigns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Play,
  Pause,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import type { Campaign } from "@/lib/types";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500/10 text-gray-500",
  ACTIVE: "bg-green-500/10 text-green-500",
  PAUSED: "bg-yellow-500/10 text-yellow-500",
  COMPLETED: "bg-blue-500/10 text-blue-500",
};

export default function CampaignsPage() {
  const { data: campaigns, isLoading } = useCampaigns();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();

  const [open, setOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  });
  const [dateError, setDateError] = useState<string>("");
  const [search, setSearch] = useState("");

  const validateDates = (startDate: string, endDate: string) => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        setDateError("End date must be after start date");
        return false;
      } else if (end.getTime() === start.getTime()) {
        setDateError("End date must be different from start date");
        return false;
      }
    }
    setDateError("");
    return true;
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", startDate: "", endDate: "" });
    setEditingCampaign(null);
    setDateError("");
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || "",
      startDate: campaign.startDate?.split("T")[0] || "",
      endDate: campaign.endDate?.split("T")[0] || "",
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.startDate) {
      toast.error("Name and start date are required");
      return;
    }

    // Validate date range
    if (!validateDates(formData.startDate, formData.endDate)) {
      return;
    }

    try {
      if (editingCampaign) {
        await updateCampaign.mutateAsync({
          id: editingCampaign.id,
          name: formData.name,
          description: formData.description || undefined,
        });
        toast.success("Campaign updated");
      } else {
        await createCampaign.mutateAsync({
          name: formData.name,
          description: formData.description || undefined,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: formData.endDate
            ? new Date(formData.endDate).toISOString()
            : undefined,
        });
        toast.success("Campaign created");
      }
      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCampaign.mutateAsync(id);
      toast.success("Campaign deleted");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const handleStatusToggle = async (campaign: Campaign) => {
    const newStatus = campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      await updateCampaign.mutateAsync({ id: campaign.id, status: newStatus });
      toast.success(`Campaign ${newStatus.toLowerCase()}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  const items = Array.isArray(campaigns) ? campaigns : [];
  const filteredItems = items.filter((campaign: Campaign) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      campaign.name.toLowerCase().includes(searchLower) ||
      campaign.description?.toLowerCase().includes(searchLower) ||
      campaign.status.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Campaigns</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Campaigns</h2>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCampaign ? "Edit Campaign" : "Create Campaign"}
              </DialogTitle>
              <DialogDescription>
                {editingCampaign
                  ? "Update campaign details"
                  : "Set up a new engagement campaign"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Q1 Brand Awareness"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Campaign goals and details..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => {
                      const newStartDate = e.target.value;
                      setFormData({ ...formData, startDate: newStartDate });
                      validateDates(newStartDate, formData.endDate);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => {
                      const newEndDate = e.target.value;
                      setFormData({ ...formData, endDate: newEndDate });
                      validateDates(formData.startDate, newEndDate);
                    }}
                  />
                </div>
              </div>
              {dateError && (
                <p className="text-sm text-destructive">{dateError}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createCampaign.isPending || updateCampaign.isPending}
              >
                {(createCampaign.isPending || updateCampaign.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {createCampaign.isPending || updateCampaign.isPending
                  ? "Saving..."
                  : editingCampaign
                    ? "Save Changes"
                    : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search campaigns by name, description, or status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">
              {search ? "No campaigns found" : "No campaigns yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {search
                ? "Try adjusting your search query"
                : "Create your first engagement campaign"}
            </p>
            {!search && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Create Campaign
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((campaign: Campaign) => (
            <Card key={campaign.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base">{campaign.name}</CardTitle>
                  {campaign.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {campaign.description}
                    </p>
                  )}
                </div>
                <Badge
                  className={statusColors[campaign.status] || "bg-gray-100"}
                >
                  {campaign.status}
                </Badge>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {new Date(campaign.startDate).toLocaleDateString()}
                    {campaign.endDate &&
                      ` — ${new Date(campaign.endDate).toLocaleDateString()}`}
                  </span>
                </div>
                <div className="flex gap-2">
                  {campaign.status !== "COMPLETED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusToggle(campaign)}
                      disabled={updateCampaign.isPending}
                    >
                      {updateCampaign.isPending ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : campaign.status === "ACTIVE" ? (
                        <>
                          <Pause className="mr-1 h-3 w-3" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="mr-1 h-3 w-3" /> Activate
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(campaign)}
                  >
                    <Pencil className="mr-1 h-3 w-3" /> Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete &quot;{campaign.name}
                          &quot;. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(campaign.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
