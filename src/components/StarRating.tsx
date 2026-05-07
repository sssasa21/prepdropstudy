import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getRatingSummary,
  rateResource,
  subscribeRatings,
  type RatingSummary,
} from "@/lib/ratings";

interface Props {
  resourceId: string;
}

export const StarRating = ({ resourceId }: Props) => {
  const [summary, setSummary] = useState<RatingSummary>(() => getRatingSummary(resourceId));
  const [hover, setHover] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSummary(getRatingSummary(resourceId));
    const unsub = subscribeRatings(() => setSummary(getRatingSummary(resourceId)));
    return () => { unsub(); };
  }, [resourceId]);

  const locked = summary.myRating !== null;
  const displayed = hover || summary.myRating || 0;

  const handleClick = async (n: number) => {
    if (locked || busy) return;
    setBusy(true);
    try {
      await rateResource(resourceId, n);
    } catch {
      // error logged in lib
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-3 border-t border-border mt-3">
      <div className="flex items-center justify-between gap-2">
        <div
          className="flex items-center gap-0.5"
          onMouseLeave={() => setHover(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = n <= displayed;
            return (
              <button
                key={n}
                type="button"
                disabled={locked || busy}
                onMouseEnter={() => !locked && setHover(n)}
                onClick={() => handleClick(n)}
                className={cn(
                  "p-0.5 transition-transform",
                  !locked && "hover:scale-110 cursor-pointer",
                  locked && "cursor-default"
                )}
                aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
              >
                <Star
                  className={cn(
                    "h-4 w-4 transition-colors",
                    filled
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  )}
                />
              </button>
            );
          })}
        </div>
        <div className="text-xs text-muted-foreground">
          {summary.count > 0 ? (
            <>
              ⭐ {summary.average.toFixed(1)} ({summary.count}{" "}
              {summary.count === 1 ? "rating" : "ratings"})
            </>
          ) : (
            <>No ratings yet</>
          )}
        </div>
      </div>
      {locked && (
        <div className="text-[10px] text-muted-foreground mt-1">
          You rated this {summary.myRating} ★
        </div>
      )}
    </div>
  );
};
