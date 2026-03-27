"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, User, Bell, Shield, Save } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function SettingsPage() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
  });

  const [notifications, setNotifications] = useState({
    emailEscalations: true,
    emailDigest: true,
    pushEnabled: false,
    digestFrequency: "daily",
  });

  const [automation, setAutomation] = useState({
    autoApproveHighConfidence: true,
    confidenceThreshold: 85,
    escalateLowConfidence: true,
    escalateThreshold: 40,
  });

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.patch(`/users/${user?.id}`, {
        firstName: profile.firstName,
        lastName: profile.lastName,
      });
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Settings</h2>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2">
            <Shield className="h-4 w-4" /> Automation
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e) =>
                      setProfile({ ...profile, firstName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) =>
                      setProfile({ ...profile, lastName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Role</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.role || "ADMIN"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Member Since</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />{" "}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Escalation Alerts</p>
                  <p className="text-xs text-muted-foreground">
                    Get notified when drafts are escalated
                  </p>
                </div>
                <Switch
                  checked={notifications.emailEscalations}
                  onCheckedChange={(v) =>
                    setNotifications({ ...notifications, emailEscalations: v })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Daily Digest</p>
                  <p className="text-xs text-muted-foreground">
                    Receive a summary of daily activity
                  </p>
                </div>
                <Switch
                  checked={notifications.emailDigest}
                  onCheckedChange={(v) =>
                    setNotifications({ ...notifications, emailDigest: v })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Digest Frequency</p>
                  <p className="text-xs text-muted-foreground">
                    How often to receive digests
                  </p>
                </div>
                <Select
                  value={notifications.digestFrequency}
                  onValueChange={(v) =>
                    setNotifications({ ...notifications, digestFrequency: v })
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => toast.success("Notification preferences saved")}
              >
                <Save className="mr-2 h-4 w-4" /> Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation">
          <Card>
            <CardHeader>
              <CardTitle>Automation Rules</CardTitle>
              <CardDescription>
                Configure how the AI pipeline handles responses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Auto-Approve High Confidence
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Automatically approve drafts above threshold
                  </p>
                </div>
                <Switch
                  checked={automation.autoApproveHighConfidence}
                  onCheckedChange={(v) =>
                    setAutomation({
                      ...automation,
                      autoApproveHighConfidence: v,
                    })
                  }
                />
              </div>
              {automation.autoApproveHighConfidence && (
                <div className="space-y-2 pl-4 border-l-2">
                  <Label>
                    Confidence Threshold: {automation.confidenceThreshold}%
                  </Label>
                  <Input
                    type="range"
                    min={50}
                    max={100}
                    value={automation.confidenceThreshold}
                    onChange={(e) =>
                      setAutomation({
                        ...automation,
                        confidenceThreshold: Number(e.target.value),
                      })
                    }
                    className="cursor-pointer"
                  />
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Escalate Low Confidence</p>
                  <p className="text-xs text-muted-foreground">
                    Escalate drafts below threshold for human review
                  </p>
                </div>
                <Switch
                  checked={automation.escalateLowConfidence}
                  onCheckedChange={(v) =>
                    setAutomation({ ...automation, escalateLowConfidence: v })
                  }
                />
              </div>
              {automation.escalateLowConfidence && (
                <div className="space-y-2 pl-4 border-l-2">
                  <Label>
                    Escalation Threshold: {automation.escalateThreshold}%
                  </Label>
                  <Input
                    type="range"
                    min={10}
                    max={70}
                    value={automation.escalateThreshold}
                    onChange={(e) =>
                      setAutomation({
                        ...automation,
                        escalateThreshold: Number(e.target.value),
                      })
                    }
                    className="cursor-pointer"
                  />
                </div>
              )}
              <Button onClick={() => toast.success("Automation rules saved")}>
                <Save className="mr-2 h-4 w-4" /> Save Rules
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
