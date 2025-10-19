import { Button } from '@/components/ui/button';
import { useStabilityFeed } from '@/hooks/useStabilityFeed';
import { StabilityTable } from '@/components/StabilityTable';

export interface StabilityFeedProps {
  url?: string;
  intervalMs?: number;
  title?: string;
}

export function StabilityFeed({ url, intervalMs, title }: StabilityFeedProps) {
  const { data, error, loading, reload } = useStabilityFeed({ url, intervalMs });

  return (
    <section className="py-6">
      <div className="container">
        {loading && (
          <p className="text-gray-500 text-lg animate-pulse">加载中...</p>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-center justify-between">
            <span>数据加载失败：{error.message}</span>
            <Button variant="outline" size="sm" onClick={reload}>重试</Button>
          </div>
        )}

        {!loading && !error && data && (
          <StabilityTable items={data.items ?? []} title={title} />
        )}
      </div>
    </section>
  );
}
