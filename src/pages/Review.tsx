import { useEffect, useState } from "react";
import { LogOut, Trash2, Check, X, ExternalLink, Lock, AlertTriangle, Pencil, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  reviewIsLoggedIn,
  reviewLogin,
  reviewLogout,
  reviewHeartbeat,
  updateResourceStatus,
  deleteResource,
  isUrlUnverified,
  type Resource,
  type ResourceType,
  type Subject,
  type ResourceStatus,
} from "@/lib/prepdrop";
import { supabase } from "@/integrations/supabase/client";
import { getRatingSummary, subscribeRatings, initRatings } from "@/lib/ratings";
import { Star } from "lucide-react";

interface FeedbackEntry {
  id: string;
  type: string;
  message: string;
  submitted_at: string;
}

const FEEDBACK_SEEN_KEY = "prepdrop_feedback_seen_at";

const Review = () => {
  const [loggedIn, setLoggedIn] = useState(() => reviewIsLoggedIn());

  useEffect(() => {
    document.documentElement.classList.add("review-theme");
    return () => document.documentElement.classList.remove("review-theme");
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    reviewHeartbeat();
    const interval = setInterval(reviewHeartbeat, 10000);
    return () => clearInterval(interval);
  }, [loggedIn]);

  if (!loggedIn) return <LoginScreen onLogin={() => setLoggedIn(true)} />;
  return <Dashboard onLogout={() => { reviewLogout(); setLoggedIn(false); }} />;
};

const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const result = reviewLogin(password);
    if (result.ok) onLogin();
    else setError(result.error || "Login failed.");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-8 shadow-lg">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 rounded-full bg-secondary mb-3">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold">Review Access</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            Login
          </Button>
        </form>
      </Card>
    </div>
  );
};

const Dashboard = ({ onLogout }: { onLogout: () => void }) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [tab, setTab] = useState<"pending" | "published" | "feedback">("pending");
  const [seenAt, setSeenAt] = useState<number>(() =>
    Number(localStorage.getItem(FEEDBACK_SEEN_KEY) || 0)
  );
  const [, setRatingTick] = useState(0);

  useEffect(() => {
    initRatings();
    const unsubRatings = subscribeRatings(() => setRatingTick((t) => t + 1));

    const fetchAll = async () => {
      const { data, error } = await supabase
        .from("resources" as any)
        .select("*")
        .order("submitted_at", { ascending: false });
      if (error) {
        console.error("[review] fetch resources failed:", error);
        return;
      }
      const mapped: Resource[] = (data as any[]).map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type as ResourceType,
        url: r.url,
        subject: r.subject as Subject,
        userId: r.user_id,
        status: r.status as ResourceStatus,
        submittedAt: r.submitted_at,
      }));
      setResources(mapped);
    };

    const fetchFeedback = async () => {
      const { data, error } = await supabase
        .from("feedback" as any)
        .select("*")
        .order("submitted_at", { ascending: false });
      if (error) {
        console.error("[review] fetch feedback failed:", error);
        return;
      }
      setFeedback((data as any[]) as FeedbackEntry[]);
    };

    fetchAll();
    fetchFeedback();

    const channel = supabase
      .channel("review-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "resources" },
        () => fetchAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feedback" },
        () => fetchFeedback()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      unsubRatings();
    };
  }, []);

  const pending = resources.filter((r) => r.status === "pending");
  const published = resources.filter((r) => r.status === "published");
  const unreadFeedback = feedback.filter(
    (f) => new Date(f.submitted_at).getTime() > seenAt
  ).length;

  const handleTabChange = (v: string) => {
    setTab(v as any);
    if (v === "feedback") {
      const now = Date.now();
      localStorage.setItem(FEEDBACK_SEEN_KEY, String(now));
      setSeenAt(now);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    await supabase.from("feedback" as any).delete().eq("id", id);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">PrepDrop · Review</h1>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-1.5" /> Logout
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid grid-cols-3 gap-3 mb-8">
          <Stat label="Pending" value={pending.length} />
          <Stat label="Published" value={published.length} />
          <Stat label="Total" value={resources.length} />
        </div>

        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="published">Published ({published.length})</TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2">
              Feedback
              {unreadFeedback > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5">
                  {unreadFeedback}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pending.length === 0 ? (
              <Empty text="No pending submissions." />
            ) : (
              <div className="space-y-3">
                {pending.map((r) => (
                  <ReviewItem key={r.id} resource={r}>
                    <Button size="sm" onClick={() => updateResourceStatus(r.id, "published")}>
                      <Check className="h-4 w-4 mr-1" /> Publish
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteResource(r.id)}>
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </ReviewItem>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="published">
            {published.length === 0 ? (
              <Empty text="No published resources yet." />
            ) : (
              <div className="space-y-3">
                {published.map((r) => (
                  <ReviewItem key={r.id} resource={r} showRating>
                    <Button size="sm" variant="destructive" onClick={() => deleteResource(r.id)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </ReviewItem>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="feedback">
            {feedback.length === 0 ? (
              <Empty text="No feedback yet." />
            ) : (
              <div className="space-y-3">
                {feedback.map((f) => (
                  <Card key={f.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-secondary">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="secondary" className="text-xs">{f.type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(f.submitted_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words">{f.message}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteFeedback(f.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
const Stat = ({ label, value }: { label: string; value: number }) => (
  <Card className="p-4 text-center">
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{label}</div>
  </Card>
);

const Empty = ({ text }: { text: string }) => (
  <Card className="p-6 text-center text-sm text-muted-foreground">{text}</Card>
);

const ReviewItem = ({
  resource,
  children,
  showRating = false,
}: {
  resource: Resource;
  children: React.ReactNode;
  showRating?: boolean;
}) => {
  const summary = showRating ? getRatingSummary(resource.id) : null;
  const lowRated = summary && summary.count > 0 && summary.average < 2;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(resource.name);
  const [name, setName] = useState(resource.name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(resource.name);
    if (!editing) setDraft(resource.name);
  }, [resource.name]);

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("Name cannot be empty.");
      return;
    }
    setSaving(true);
    const { error: err } = await supabase
      .from("resources" as any)
      .update({ name: trimmed })
      .eq("id", resource.id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setName(trimmed);
    setEditing(false);
    setError(null);
  };

  const handleCancel = () => {
    setDraft(name);
    setError(null);
    setEditing(false);
  };

  return (
    <Card className="p-4">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {editing ? (
              <div className="flex items-center gap-2 flex-wrap w-full">
                <Input
                  value={draft}
                  onChange={(e) => { setDraft(e.target.value); setError(null); }}
                  className="h-8 max-w-xs"
                  autoFocus
                />
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Check className="h-4 w-4 mr-1" /> Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
              </div>
            ) : (
              <>
                <h3 className="font-semibold">{name}</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => { setDraft(name); setEditing(true); }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Name
                </Button>
              </>
            )}
            <Badge variant="secondary" className="text-xs">
              {resource.type === "app" ? "App" : "Telegram"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {resource.subject}
            </Badge>
            {summary && summary.count > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {summary.average.toFixed(1)} ({summary.count})
              </Badge>
            )}
            {lowRated && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="h-3 w-3" />
                Low Rated
              </Badge>
            )}
            {isUrlUnverified(resource.url) && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="h-3 w-3" />
                Unverified Link — Review Carefully
              </Badge>
            )}
          </div>
          {editing && error && (
            <p className="text-xs text-destructive mb-2">{error}</p>
          )}
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1 break-all"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="truncate">{resource.url}</span>
          </a>
          <div className="text-xs text-muted-foreground mt-2">
            By <span className="font-mono">{resource.userId}</span> ·{" "}
            {new Date(resource.submittedAt).toLocaleString()}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">{children}</div>
      </div>
    </Card>
  );
};

export default Review;
