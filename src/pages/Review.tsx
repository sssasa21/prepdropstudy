import { useEffect, useState } from "react";
import { LogOut, Trash2, Check, X, ExternalLink, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getResources,
  reviewIsLoggedIn,
  reviewLogin,
  reviewLogout,
  reviewHeartbeat,
  updateResourceStatus,
  deleteResource,
  isUrlUnverified,
  type Resource,
} from "@/lib/prepdrop";

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
  const [resources, setResources] = useState<Resource[]>(() => getResources());

  useEffect(() => {
    const handler = () => setResources(getResources());
    window.addEventListener("prepdrop:update", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("prepdrop:update", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const pending = resources.filter((r) => r.status === "pending");
  const published = resources.filter((r) => r.status === "published");

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

        <Section title="Pending" count={pending.length}>
          {pending.length === 0 ? (
            <Empty text="No pending submissions." />
          ) : (
            <div className="space-y-3">
              {pending.map((r) => (
                <ReviewItem key={r.id} resource={r}>
                  <Button
                    size="sm"
                    onClick={() => updateResourceStatus(r.id, "published")}
                  >
                    <Check className="h-4 w-4 mr-1" /> Publish
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteResource(r.id)}
                  >
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </ReviewItem>
              ))}
            </div>
          )}
        </Section>

        <Section title="Published" count={published.length}>
          {published.length === 0 ? (
            <Empty text="No published resources yet." />
          ) : (
            <div className="space-y-3">
              {published.map((r) => (
                <ReviewItem key={r.id} resource={r}>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteResource(r.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </ReviewItem>
              ))}
            </div>
          )}
        </Section>
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

const Section = ({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) => (
  <section className="mb-10">
    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
      {title} ({count})
    </h2>
    {children}
  </section>
);

const Empty = ({ text }: { text: string }) => (
  <Card className="p-6 text-center text-sm text-muted-foreground">{text}</Card>
);

const ReviewItem = ({
  resource,
  children,
}: {
  resource: Resource;
  children: React.ReactNode;
}) => (
  <Card className="p-4">
    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h3 className="font-semibold">{resource.name}</h3>
          <Badge variant="secondary" className="text-xs">
            {resource.type === "app" ? "App" : "Telegram"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {resource.subject}
          </Badge>
          {isUrlUnverified(resource.url) && (
            <Badge variant="destructive" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              Unverified Link — Review Carefully
            </Badge>
          )}
        </div>
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

export default Review;
