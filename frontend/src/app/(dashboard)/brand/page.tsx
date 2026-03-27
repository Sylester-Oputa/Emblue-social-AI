"use client";

import { useState } from "react";
import {
  useBrandProfile,
  useUpdateBrandProfile,
} from "@/hooks/use-brand-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Palette, Save, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TONE_OPTIONS = [
  "professional",
  "friendly",
  "casual",
  "formal",
  "empathetic",
];

export default function BrandProfilePage() {
  const { data: profile, isLoading } = useBrandProfile();
  const update = useUpdateBrandProfile();

  const [companyName, setCompanyName] = useState("");
  const [tone, setTone] = useState("professional");
  const [prohibitedTerms, setProhibitedTerms] = useState<string[]>([]);
  const [requiredPhrases, setRequiredPhrases] = useState<string[]>([]);
  const [requiredDisclaimers, setRequiredDisclaimers] = useState<string[]>([]);
  const [newProhibited, setNewProhibited] = useState("");
  const [newRequired, setNewRequired] = useState("");
  const [newDisclaimer, setNewDisclaimer] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Initialize form once data loads
  if (profile && !initialized) {
    setCompanyName(profile.companyName || "");
    setTone(profile.tone || "professional");
    setProhibitedTerms(profile.prohibitedTerms || []);
    setRequiredPhrases(profile.requiredPhrases || []);
    setRequiredDisclaimers(profile.requiredDisclaimers || []);
    setInitialized(true);
  }

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        companyName,
        tone,
        prohibitedTerms,
        requiredPhrases,
        requiredDisclaimers,
      });
      toast.success("Brand profile updated");
    } catch {
      toast.error("Failed to update brand profile");
    }
  };

  const addItem = (
    list: string[],
    setList: (v: string[]) => void,
    value: string,
    setValue: (v: string) => void,
  ) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      setValue("");
    }
  };

  const removeItem = (
    list: string[],
    setList: (v: string[]) => void,
    index: number,
  ) => {
    setList(list.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Brand Profile</h2>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Palette className="h-8 w-8 text-violet-500" />
          <h2 className="text-3xl font-bold tracking-tight">Brand Profile</h2>
        </div>
        <Button onClick={handleSave} disabled={update.isPending}>
          {update.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your Company"
              />
            </div>
            <div>
              <Label>Brand Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Controls AI-generated reply tone
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Prohibited Terms (do_not_say) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Prohibited Terms (Do Not Say)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newProhibited}
                onChange={(e) => setNewProhibited(e.target.value)}
                placeholder="Add term..."
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  (e.preventDefault(),
                  addItem(
                    prohibitedTerms,
                    setProhibitedTerms,
                    newProhibited,
                    setNewProhibited,
                  ))
                }
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() =>
                  addItem(
                    prohibitedTerms,
                    setProhibitedTerms,
                    newProhibited,
                    setNewProhibited,
                  )
                }
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {prohibitedTerms.map((term, i) => (
                <Badge
                  key={i}
                  variant="destructive"
                  className="flex items-center gap-1"
                >
                  {term}
                  <button
                    onClick={() =>
                      removeItem(prohibitedTerms, setProhibitedTerms, i)
                    }
                    className="ml-1 hover:text-white/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {prohibitedTerms.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No prohibited terms
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Required Phrases */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Required Phrases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newRequired}
                onChange={(e) => setNewRequired(e.target.value)}
                placeholder="Add phrase..."
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  (e.preventDefault(),
                  addItem(
                    requiredPhrases,
                    setRequiredPhrases,
                    newRequired,
                    setNewRequired,
                  ))
                }
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() =>
                  addItem(
                    requiredPhrases,
                    setRequiredPhrases,
                    newRequired,
                    setNewRequired,
                  )
                }
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {requiredPhrases.map((phrase, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {phrase}
                  <button
                    onClick={() =>
                      removeItem(requiredPhrases, setRequiredPhrases, i)
                    }
                    className="ml-1 hover:text-foreground/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {requiredPhrases.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No required phrases
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Required Disclaimers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Required Disclaimers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newDisclaimer}
                onChange={(e) => setNewDisclaimer(e.target.value)}
                placeholder="Add disclaimer..."
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  (e.preventDefault(),
                  addItem(
                    requiredDisclaimers,
                    setRequiredDisclaimers,
                    newDisclaimer,
                    setNewDisclaimer,
                  ))
                }
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() =>
                  addItem(
                    requiredDisclaimers,
                    setRequiredDisclaimers,
                    newDisclaimer,
                    setNewDisclaimer,
                  )
                }
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {requiredDisclaimers.map((d, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  {d}
                  <button
                    onClick={() =>
                      removeItem(requiredDisclaimers, setRequiredDisclaimers, i)
                    }
                    className="ml-1 hover:text-foreground/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {requiredDisclaimers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No required disclaimers
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
