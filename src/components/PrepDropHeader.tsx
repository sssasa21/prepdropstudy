import { Droplet, Plus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FeedbackButton } from "@/components/FeedbackButton";

export const PrepDropHeader = () => {
  const location = useLocation();
  const onSubmit = location.pathname === "/submit";
  return (
    <header className="border-b border-border/50 backdrop-blur-md bg-background/70 sticky top-0 z-30">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="p-2 rounded-xl bg-gradient-primary shadow-glow group-hover:scale-105 transition-transform">
            <Droplet className="h-5 w-5 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="text-xl font-bold tracking-tight">PrepDrop</span>
        </Link>
        {!onSubmit && (
          <Button asChild size="sm" className="bg-gradient-primary border-0 shadow-glow">
            <Link to="/submit">
              <Plus className="h-4 w-4 mr-1" /> Drop
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
};
