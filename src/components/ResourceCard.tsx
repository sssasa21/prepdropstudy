import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Resource } from "@/lib/prepdrop";

export const ResourceCard = ({ resource }: { resource: Resource }) => {
  const isApp = resource.type === "app";
  return (
    <Card className="group p-5 hover:border-primary/50 transition-all hover:shadow-glow">
      <div className="flex items-center justify-between gap-3 mb-3">
        <Badge variant="secondary" className="text-xs">
          {isApp ? "App" : "Telegram"}
        </Badge>
        <Badge variant="outline" className="text-xs border-primary/40 text-primary-glow">
          {resource.subject}
        </Badge>
      </div>
      <h3 className="font-semibold text-lg mb-2 break-words">{resource.name}</h3>
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-primary-glow hover:text-primary transition-colors break-all mb-3"
      >
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{resource.url}</span>
      </a>
      <div className="text-xs text-muted-foreground pt-3 border-t border-border">
        Dropped by: <span className="text-foreground font-mono">{resource.userId}</span>
      </div>
    </Card>
  );
};
