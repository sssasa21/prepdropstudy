import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const TYPES = ["Bug Report", "Suggestion", "Other"] as const;

export const FeedbackButton = () => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof TYPES)[number]>("Suggestion");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("feedback" as any)
      .insert({ type, message: trimmed.slice(0, 300) });
    setSubmitting(false);
    if (error) {
      toast({
        title: "Could not send feedback",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Thanks for your feedback!" });
    setMessage("");
    setType("Suggestion");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="fixed bottom-4 left-4 md:left-1/2 md:-translate-x-1/2 z-50 shadow-lg bg-gradient-primary border-0 rounded-full"
        >
          <MessageSquare className="h-4 w-4 mr-1.5" /> Give Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Give Feedback</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fb-message">Your message</Label>
            <Textarea
              id="fb-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 300))}
              maxLength={300}
              rows={4}
              placeholder="Tell us what's on your mind..."
              required
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/300
            </p>
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-primary border-0"
            disabled={submitting || !message.trim()}
          >
            {submitting ? "Sending..." : "Submit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
