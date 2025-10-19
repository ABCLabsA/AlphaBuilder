import { Button } from "@/components/ui/button";
import type { StabilityItem } from "@/hooks/useStabilityFeed";
import { cn } from "@/lib/utils";

interface StabilityTableProps {
  items: StabilityItem[];
  title?: string;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

function toNumber(value: number | string): number | null {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

type StabilityStatus = "stable" | "warning" | "unstable";

const STATUS_META: Record<
  StabilityStatus,
  { label: string; badge: string; dot: string }
> = {
  stable: {
    label: "稳定",
    badge: "bg-emerald-100/70 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  warning: {
    label: "一般",
    badge: "bg-amber-100/70 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  unstable: {
    label: "不稳定",
    badge: "bg-rose-100/80 text-rose-700 ring-rose-200",
    dot: "bg-rose-500",
  },
};

function resolveStatus(st?: StabilityItem["st"]): StabilityStatus {
  const normalized = (st ?? "").toString().toLowerCase();

  if (normalized.includes("green")) {
    return "stable";
  }
  if (normalized.includes("yellow")) {
    return "warning";
  }
  return "unstable";
}

function formatNumber(
  value: number | string | null | undefined,
  options: { minimumFractionDigits?: number; maximumFractionDigits?: number } = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }
) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return typeof value === "string" ? value : "-";
  }
  return parsed.toLocaleString("en-US", options);
}

const COLUMNS = [
  { key: "pair", label: "币种 / 交易对", align: "text-left" },
  { key: "price", label: "价格 (USDT)", align: "text-right" },
  { key: "spread", label: "价差基点", align: "text-right" },
  { key: "days", label: "4倍天数", align: "text-right" },
  { key: "status", label: "稳定性", align: "text-right" },
] as const;

export function StabilityTable({
  items,
  title = "币种稳定性列表",
  loading = false,
  error = null,
  onRetry,
}: StabilityTableProps) {
  const summary = items.reduce(
    (acc, item) => {
      const status = resolveStatus(item.st);
      acc[status] += 1;
      return acc;
    },
    { stable: 0, warning: 0, unstable: 0 }
  );

  const showData = !loading && !error && items.length > 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
      <div className="border-b border-border/70 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground">
              聚合价格、价差与持仓周期，全局查看主要币种的稳定性表现。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-medium">
            {([
              { key: "stable", label: "稳定", tone: "text-emerald-600" },
              { key: "warning", label: "一般", tone: "text-amber-600" },
              { key: "unstable", label: "不稳定", tone: "text-rose-600" },
            ] as const).map((itemMeta) => (
              <div
                key={itemMeta.key}
                className="rounded-xl border border-border/60 bg-background/60 px-4 py-2"
              >
                <p className="mb-1 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                  {itemMeta.label}
                </p>
                {loading ? (
                  <span className="mx-auto block h-4 w-10 animate-pulse rounded-full bg-muted/80" />
                ) : (
                  <p className={cn("text-base font-semibold", itemMeta.tone)}>
                    {summary[itemMeta.key]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              {COLUMNS.map((column, index) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "bg-muted/60 px-4 py-3 font-semibold text-xs",
                    column.align,
                    index === 0 && "rounded-tl-2xl pl-6",
                    index === COLUMNS.length - 1 && "rounded-tr-2xl pr-6"
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 6 }).map((_, index, arr) => {
                const isLastRow = index === arr.length - 1;
                return (
                  <tr
                    key={`skeleton-${index}`}
                    className={cn(
                      "border-b border-border/70",
                      index % 2 === 0 ? "bg-background" : "bg-muted/30"
                    )}
                  >
                    <td
                      className={cn(
                        "px-4 py-4 pl-6",
                        index === 0 && "pt-4",
                        isLastRow && "pb-4"
                      )}
                    >
                      <div className="flex flex-col gap-2">
                        <span className="h-4 w-24 animate-pulse rounded bg-muted/80" />
                        <span className="h-3 w-16 animate-pulse rounded bg-muted/60" />
                      </div>
                    </td>
                    {Array.from({ length: COLUMNS.length - 2 }).map((__, col) => (
                      <td
                        key={col}
                        className={cn(
                          "px-4 py-4",
                          index === 0 && "pt-4",
                          isLastRow && "pb-4"
                        )}
                      >
                        <span className="ml-auto block h-4 w-20 animate-pulse rounded bg-muted/80" />
                      </td>
                    ))}
                    <td
                      className={cn(
                        "px-4 py-4 pr-6",
                        index === 0 && "pt-4",
                        isLastRow && "pb-4"
                      )}
                    >
                      <span className="ml-auto block h-5 w-24 animate-pulse rounded-full bg-muted/70" />
                    </td>
                  </tr>
                );
              })}

            {!loading && error && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-6 py-14 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-sm text-destructive">
                      数据加载失败：{error.message}
                    </p>
                    {onRetry && (
                      <Button variant="outline" size="sm" onClick={onRetry}>
                        重试
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {!loading && !error && items.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-6 py-14 text-center">
                  <p className="text-sm text-muted-foreground">
                    暂无可用数据，请稍后再试。
                  </p>
                </td>
              </tr>
            )}

            {showData &&
              items.map((item, index) => {
                const price = toNumber(item.p);
                const spread = toNumber(item.spr);
                const marginDays = toNumber(item.md);
                const quadrupleDays =
                  marginDays !== null ? marginDays * 4 : item.md;
                const status = resolveStatus(item.st);
                const statusMeta = STATUS_META[status];
                const pair = item.n.split("/");
                const [base, quote] =
                  pair.length === 2 ? [pair[0], pair[1]] : [item.n, ""];

                const isLastRow = index === items.length - 1;

                return (
                  <tr
                    key={`${item.n}-${index}`}
                    className={cn(
                      "border-b border-border/80 transition-colors",
                      index % 2 === 0 ? "bg-background" : "bg-muted/30",
                      "hover:bg-muted/60"
                    )}
                  >
                    <td
                      className={cn(
                        "whitespace-nowrap px-4 py-4 text-sm font-medium text-foreground",
                        index === 0 && "pt-4",
                        isLastRow && "pb-4",
                        "pl-6"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold tracking-tight sm:text-base">
                          {base}
                        </span>
                        {quote && (
                          <span className="text-xs uppercase text-muted-foreground">
                            / {quote}
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className={cn(
                        "px-4 py-4 text-right font-mono text-sm",
                        index === 0 && "pt-4",
                        isLastRow && "pb-4"
                      )}
                    >
                      {price !== null
                        ? formatNumber(price, {
                            minimumFractionDigits: 6,
                            maximumFractionDigits: 6,
                          })
                        : String(item.p)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-4 text-right font-mono text-sm text-muted-foreground",
                        index === 0 && "pt-4",
                        isLastRow && "pb-4"
                      )}
                    >
                      {formatNumber(spread, {
                        minimumFractionDigits: 4,
                        maximumFractionDigits: 4,
                      })}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-4 text-right font-mono text-sm text-muted-foreground",
                        index === 0 && "pt-4",
                        isLastRow && "pb-4"
                      )}
                    >
                      {typeof quadrupleDays === "number"
                        ? formatNumber(quadrupleDays, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })
                        : String(quadrupleDays)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-4 pr-6 text-right",
                        index === 0 && "pt-4",
                        isLastRow && "pb-4"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition-colors",
                          statusMeta.badge
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn("h-1.5 w-1.5 rounded-full", statusMeta.dot)}
                        />
                        {statusMeta.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
