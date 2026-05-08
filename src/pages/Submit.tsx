import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { PrepDropHeader } from "@/components/PrepDropHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addResource,
  checkUserId,
  validateUserId,
  validateUrl,
  SUBJECTS,
  type ResourceType,
  type Subject,
} from "@/lib/prepdrop";
import { aiCheckUrl, aiCheckUsername } from "@/lib/moderation";
import { toast } from "@/hooks/use-toast";

function extractNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    let host = u.hostname.toLowerCase().replace(/^www\./, "");
    const parts = host.split(".");
    if (parts.length > 1) parts.pop();
    if (parts.length > 1 && ["co", "com", "ac", "gov", "org"].includes(parts[parts.length - 1])) {
      parts.pop();
    }
    return parts.join(" ").replace(/[-.]/g, " ").trim();
  } catch {
    return "";
  }
}

const Submit = () => {
  const [type, setType] = useState<ResourceType>("app");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlWarning, setUrlWarning] = useState<string | null>(null);
  const [subject, setSubject] = useState<Subject>("General");
  const [userId, setUserId] = useState("");
  const [userIdError, setUserIdError] = useState<string | null>(null);
  const [userIdChecking, setUserIdChecking] = useState(false);
  const [urlChecking, setUrlChecking] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handleUserIdChange = (v: string) => {
    setUserId(v);
    if (v.length > 7) setUserIdError("User ID must be 7 characters or less.");
    else if (v && !/^[A-Za-z0-9_]*$/.test(v))
      setUserIdError("Only letters, numbers, and underscores allowed.");
    else if (v) setUserIdError(validateUserId(v, true));
    else setUserIdError(null);
  };

  const handleUserIdBlur = async () => {
    if (!userId) return;
    const localErr = checkUserId(userId);
    if (localErr) {
      setUserIdError(localErr);
      return;
    }
    setUserIdChecking(true);
    const result = await aiCheckUsername(userId);
    setUserIdChecking(false);
    if (!result.allowed) {
      setUserIdError("This User ID is not allowed. Please choose a clean appropriate name.");
    } else {
      setUserIdError(null);
    }
  };

  const handleUrlChange = (v: string) => {
    setUrl(v);
    if (!v) {
      setUrlError(null);
      setUrlWarning(null);
      return;
    }
    const result = validateUrl(v.trim());
    if (!result.ok) {
      setUrlError(result.error || "Please enter a valid URL.");
      setUrlWarning(null);
    } else {
      setUrlError(null);
      setUrlWarning(null);
    }
  };

  const handleUrlBlur = async () => {
    if (!url) return;
    const result = validateUrl(url.trim());
    if (!result.ok) {
      setUrlError(result.error || "Please enter a valid URL.");
      setUrlWarning(null);
      return;
    }
    setUrlChecking(true);
    const ai = await aiCheckUrl(url.trim());
    setUrlChecking(false);
    if (!ai.allowed) {
      setUrlError("This URL is not allowed on PrepDrop.");
      setUrlWarning(null);
    } else if (!ai.trusted) {
      setUrlError(null);
      setUrlWarning("This link will go through extra review before publishing.");
    } else {
      setUrlError(null);
      setUrlWarning(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const idErr = checkUserId(userId);
    if (idErr) {
      setUserIdError(idErr);
      return;
    }
    const derivedName = extractNameFromUrl(url.trim());
    if (!derivedName || !url.trim()) {
      setFormError("Please fill out all fields.");
      return;
    }
    const urlResult = validateUrl(url.trim());
    if (!urlResult.ok) {
      setUrlError(urlResult.error || "Please enter a valid URL.");
      return;
    }

    setChecking(true);
    try {
      const [usernameAi, urlAi] = await Promise.all([
        aiCheckUsername(userId),
        aiCheckUrl(url.trim()),
      ]);

      if (!usernameAi.allowed) {
        setUserIdError("This User ID is not allowed. Please choose a clean appropriate name.");
        setChecking(false);
        return;
      }
      if (!urlAi.allowed) {
        setUrlError("This URL is not allowed on PrepDrop.");
        setChecking(false);
        return;
      }

      await addResource({ name: derivedName, type, url: url.trim(), subject, userId });
      setSubmitted(true);
    } catch (err) {
      console.error("Submission failed:", err);
      toast({
        title: "Submission failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-bg">
        <PrepDropHeader />
        <div className="container mx-auto px-4 py-20 max-w-md text-center">
          <div className="inline-flex p-4 rounded-full bg-success/20 mb-6">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Dropped!</h1>
          <p className="text-muted-foreground mb-8">
            Your resource is under review. It will be published once approved.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline">
              <Link to="/">Back to Home</Link>
            </Button>
            <Button
              className="bg-gradient-primary border-0"
              onClick={() => {
                setSubmitted(false);
                setUrl("");
                setSubject("General");
              }}
            >
              Drop another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg">
      <PrepDropHeader />
      <div className="container mx-auto px-4 py-10 max-w-xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <h1 className="text-3xl font-bold mb-2">Drop a Resource</h1>
        <p className="text-muted-foreground mb-8">
          Share a free app or Telegram channel with fellow learners.
        </p>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Resource Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ResourceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="app">App Link</SelectItem>
                  <SelectItem value="telegram">Telegram Link</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL / Link</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                onBlur={handleUrlBlur}
                maxLength={500}
                placeholder="https://..."
                className={urlError ? "border-destructive" : ""}
                required
              />
              {urlChecking && <p className="text-xs text-muted-foreground">Checking...</p>}
              {urlError && <p className="text-xs text-destructive">{urlError}</p>}
              {!urlError && urlWarning && (
                <p className="text-xs text-primary-glow">⚠️ {urlWarning}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={(v) => setSubject(v as Subject)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userId">Your User ID</Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => handleUserIdChange(e.target.value)}
                onBlur={handleUserIdBlur}
                maxLength={20}
                placeholder="max 7 chars"
                className={userIdError ? "border-destructive" : ""}
                required
              />
              {userIdChecking && <p className="text-xs text-muted-foreground">Checking...</p>}
              {userIdError && <p className="text-xs text-destructive">{userIdError}</p>}
              <p className="text-xs text-muted-foreground">
                Max 7 characters. Letters, numbers and _ only. No login needed — this is your public identity.
              </p>
            </div>

            {formError && (
              <p className="text-sm text-destructive text-center">{formError}</p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full bg-gradient-primary border-0 shadow-glow"
              disabled={
                checking ||
                userIdChecking ||
                urlChecking ||
                !!userIdError ||
                !!urlError ||
                !!validateUserId(userId) ||
                !url.trim() ||
                !validateUrl(url.trim()).ok
              }
            >
              {checking ? "Checking with AI..." : "Drop it"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Submit;
