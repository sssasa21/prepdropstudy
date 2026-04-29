import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Smartphone, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrepDropHeader } from "@/components/PrepDropHeader";
import { ResourceCard } from "@/components/ResourceCard";
import { getResources, type ResourceType } from "@/lib/prepdrop";

const Index = () => {
  const [resources, setResources] = useState(() => getResources());
  const [filter, setFilter] = useState<ResourceType | "all">("all");

  useEffect(() => {
    const handler = () => setResources(getResources());
    window.addEventListener("prepdrop:update", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("prepdrop:update", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const published = resources.filter((r) => r.status === "published");
  const appsCount = published.filter((r) => r.type === "app").length;
  const tgCount = published.filter((r) => r.type === "telegram").length;
  const visible = filter === "all" ? published : published.filter((r) => r.type === filter);

  return (
    <div className="min-h-screen bg-gradient-bg">
      <PrepDropHeader />

      <section className="container mx-auto px-4 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/60 border border-border text-xs text-muted-foreground mb-5">
          <Sparkles className="h-3 w-3 text-primary-glow" />
          Community-curated · 100% free
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
          <span className="text-gradient">PrepDrop</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
          Free resources, dropped by the community.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-2 gap-3 md:gap-4 max-w-2xl mx-auto">
          <CategoryButton
            active={filter === "app"}
            onClick={() => setFilter(filter === "app" ? "all" : "app")}
            icon={<Smartphone className="h-5 w-5" />}
            label="Apps"
            emoji="📱"
            count={appsCount}
          />
          <CategoryButton
            active={filter === "telegram"}
            onClick={() => setFilter(filter === "telegram" ? "all" : "telegram")}
            icon={<Send className="h-5 w-5" />}
            label="Telegram Channels"
            emoji="✈️"
            count={tgCount}
          />
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20">
        {published.length === 0 ? (
          <div className="text-center py-20 max-w-md mx-auto">
            <div className="text-6xl mb-4">💧</div>
            <p className="text-lg text-muted-foreground mb-6">
              No drops yet. Be the first to drop a resource!
            </p>
            <Button asChild size="lg" className="bg-gradient-primary border-0 shadow-glow">
              <Link to="/submit">Drop a Resource</Link>
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            No {filter === "app" ? "apps" : "Telegram channels"} yet in this category.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {visible.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const CategoryButton = ({
  active,
  onClick,
  icon,
  label,
  emoji,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  emoji: string;
  count: number;
}) => (
  <button
    onClick={onClick}
    className={`relative group rounded-2xl p-5 md:p-6 border text-left transition-all ${
      active
        ? "border-primary bg-gradient-primary shadow-glow"
        : "border-border bg-card hover:border-primary/50 hover:bg-secondary"
    }`}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-2xl md:text-3xl">{emoji}</span>
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          active ? "bg-background/20 text-primary-foreground" : "bg-secondary text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </div>
    <div className={`font-semibold text-base md:text-lg ${active ? "text-primary-foreground" : ""}`}>
      {label}
    </div>
  </button>
);

export default Index;
