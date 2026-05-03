import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Smartphone, Send, Sparkles, ArrowRight, Shield, Users, Zap } from "lucide-react";
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

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute top-40 right-0 h-[300px] w-[400px] rounded-full bg-accent/20 blur-[100px]" />
        </div>
        <div className="container mx-auto px-4 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/60 border border-primary/30 text-xs text-muted-foreground mb-6">
            <Sparkles className="h-3 w-3 text-primary-glow" />
            Community-curated · 100% free
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-5 leading-[1.05]">
            Free study resources,
            <br />
            <span className="text-gradient">dropped by students.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            PrepDrop is a community library of the best apps and Telegram channels
            for exam prep — verified, organized, and totally free.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-primary border-0 shadow-glow">
              <Link to="/submit">
                Drop a Resource <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary/40">
              <a href="#resources">Browse drops</a>
            </Button>
          </div>
        </div>
        <div className="container mx-auto px-4 pb-4 flex justify-between text-xs text-muted-foreground">
          <span>PrepDrop · v0.1</span>
          <span>Free. Forever. No login.</span>
        </div>
      </section>

      {/* FEATURE STRIP */}
      <section className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          <FeatureCard
            icon={<Shield className="h-5 w-5" />}
            title="AI-moderated"
            desc="Every drop is auto-screened for safety, spam and duplicates."
          />
          <FeatureCard
            icon={<Users className="h-5 w-5" />}
            title="Community-built"
            desc="Real students share what's actually working for them."
          />
          <FeatureCard
            icon={<Zap className="h-5 w-5" />}
            title="Instantly usable"
            desc="Direct links — no signups, no paywalls, no fluff."
          />
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="resources" className="container mx-auto px-4 pb-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-2">Browse the library</h2>
          <p className="text-muted-foreground">Tap a category to filter the drops below.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:gap-4 max-w-2xl mx-auto">
          <CategoryButton
            active={filter === "app"}
            onClick={() => setFilter(filter === "app" ? "all" : "app")}
            label="Apps"
            count={appsCount}
          />
          <CategoryButton
            active={filter === "telegram"}
            onClick={() => setFilter(filter === "telegram" ? "all" : "telegram")}
            label="Telegram Channels"
            count={tgCount}
          />
        </div>
      </section>

      {/* RESOURCES */}
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

      {/* CTA */}
      <section className="container mx-auto px-4 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-primary p-10 md:p-14 text-center max-w-5xl mx-auto shadow-glow">
          <h3 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">
            Found something gold?
          </h3>
          <p className="text-primary-foreground/90 max-w-xl mx-auto mb-6">
            Share it with thousands of students prepping for the same exam.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link to="/submit">Drop a Resource</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-5">
    <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-primary text-primary-foreground mb-3">
      {icon}
    </div>
    <h3 className="font-semibold mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{desc}</p>
  </div>
);

const CategoryButton = ({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
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
      <div className={`font-semibold text-base md:text-lg ${active ? "text-primary-foreground" : ""}`}>
        {label}
      </div>
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          active ? "bg-background/20 text-primary-foreground" : "bg-secondary text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </div>
    <div className={`text-xs ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
      {active ? "Filtering active — tap to clear" : "Tap to filter"}
    </div>
  </button>
);

export default Index;
