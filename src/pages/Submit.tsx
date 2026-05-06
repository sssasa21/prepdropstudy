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
import { runFullModeration } from "@/lib/moderation";
import { toast } from "@/hooks/use-toast";

function extractNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    let host = u.hostname.toLowerCase().replace(/^www\./, "");
    const parts = host.split(".");
    if (parts.length > 1) parts.pop(); // remove TLD
    if (parts.length > 1 && ["co", "com", "ac", "gov", "org"].includes(parts[parts.length - 1])) {
      parts.pop(); // remove second-level TLD like .co.uk
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

  const handleUserIdBlur = () => {
    if (!userId) return;
    setUserIdError(checkUserId(userId));
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
      setUrlWarning(result.warning || null);
    }
  };

  const handleUrlBlur = () => {
    if (!url) return;
    const result = validateUrl(url.trim());
    if (!result.ok) {
      setUrlError(result.error || "Please enter a valid URL.");
      setUrlWarning(null);
    } else {
      setUrlError(null);
      setUrlWarning(result.warning || null);
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
    if (!name.trim() || !url.trim()) {
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
      const report = await runFullModeration(name.trim(), url.trim());

      if (!report.name.clean) {
        setFormError(`Resource name rejected: ${report.name.reason}`);
        setChecking(false);
        return;
      }
      if (!report.url.safe) {
        setUrlError(`URL rejected: ${report.url.reason}`);
        setChecking(false);
        return;
      }
      if (report.spam.spam) {
        setFormError(`Submission flagged as spam: ${report.spam.reason}`);
        setChecking(false);
        return;
      }
      if (report.duplicate.duplicate) {
        setFormError(`Duplicate of an existing resource: ${report.duplicate.reason}`);
        setChecking(false);
        return;
      }

      addResource({ name: name.trim(), type, url: url.trim(), subject, userId });
      setSubmitted(true);
    } catch (err) {
      console.error("AI moderation failed:", err);
      toast({
        title: "Moderation service unavailable",
        description: "We couldn't verify your submission right now. Please try again in a moment.",
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
                setName("");
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
              <Label htmlFor="name">Resource Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="e.g. Physics Wallah"
                required
              />
            </div>

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
                !!userIdError ||
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
