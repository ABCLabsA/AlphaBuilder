import { useState, useEffect } from "react";
import {
  ExternalLink,
  Users,
  Gift,
  Copy,
  Check,
  Gem,
  CircleDollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuestData {
  project: string;
  title: string;
  reward: string;
  participants: string | null;
  image: string;
  link: string;
}

const QuestAskPage = () => {
  const [quests, setQuests] = useState<QuestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadQuests = async () => {
      try {
        const response = await fetch('/galxe.json');
        if (!response.ok) {
          throw new Error('Failed to load quest data');
        }
        const data = await response.json();
        setQuests(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadQuests();
  }, []);

  const copyToClipboard = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLinks(prev => new Set(prev).add(link));
      setTimeout(() => {
        setCopiedLinks(prev => {
          const newSet = new Set(prev);
          newSet.delete(link);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="h-48 bg-muted/50" />
                <div className="p-6 space-y-4">
                  <div className="h-4 bg-muted/50 rounded w-3/4" />
                  <div className="h-3 bg-muted/50 rounded w-1/2" />
                  <div className="h-3 bg-muted/50 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Quest Tasks
          </h1>
          <p className="text-muted-foreground">
            Discover and participate in various quest tasks to earn rewards.
          </p>
        </header>
        <div className="text-center py-12">
          <p className="text-destructive">Error loading quest data: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-10 p-6 lg:p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Quest Tasks
        </h1>
        <p className="text-muted-foreground">
          Discover and participate in various quest tasks to earn rewards.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {quests.map((quest, index) => {
          const rewardTags = quest.reward
            .split(/[+|]/)
            .map((tag) => tag.trim())
            .filter(Boolean);

          const participantsLabel = quest.participants
            ? `${quest.participants} participants`
            : "Be among the first to join";

          return (
            <div
              key={index}
              className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#e0f2fe_0%,transparent_65%)] opacity-0 transition-opacity duration-200 group-hover:opacity-80" />
              <div className="relative flex h-full flex-col gap-6 p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span className="flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">
                    <Gem className="h-3.5 w-3.5 text-sky-500" />
                    {rewardTags[0] ?? quest.reward}
                  </span>
                  {rewardTags.slice(1).map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className="rounded-full border border-border/70 bg-muted px-3 py-1 text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                  <span className="ml-auto flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-600">
                    <CircleDollarSign className="h-3.5 w-3.5 text-amber-500" />
                    {quest.project}
                  </span>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                  <div className="flex flex-1 flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold leading-tight text-foreground">
                        {quest.title}
                      </h3>
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4 text-muted-foreground/60" />
                        {participantsLabel}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        <Gift className="h-4 w-4 text-emerald-500" />
                        <span className="font-medium text-foreground">
                          {quest.reward}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 justify-end">
                    <div className="relative w-32 overflow-hidden rounded-3xl border border-border/80 bg-muted shadow-inner sm:w-36">
                      <img
                        src={quest.image}
                        alt={quest.title}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src =
                            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQ0IiBoZWlnaHQ9IjE0NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjhfZmFmZSIgcng9IjI0Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZpbGw9IiM4Yzg3OTgiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==";
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-3 pt-2">
                  <Button
                    asChild
                    size="sm"
                    className="flex-1 gap-2 rounded-full bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-white transition-shadow hover:shadow-[0_16px_36px_rgba(59,130,246,0.35)]"
                  >
                    <a
                      href={quest.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Join Quest
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(quest.link)}
                    className="h-10 w-10 rounded-full border-border bg-muted text-muted-foreground hover:bg-muted/80"
                  >
                    {copiedLinks.has(quest.link) ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuestAskPage;
