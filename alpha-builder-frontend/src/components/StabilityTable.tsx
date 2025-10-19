import type { StabilityItem } from '@/hooks/useStabilityFeed';

interface StabilityTableProps {
  items: StabilityItem[];
  title?: string;
}

function toNumber(value: number | string): number | null {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

export function StabilityTable({ items, title = '币种稳定性列表' }: StabilityTableProps) {
  return (
    <div className="w-full bg-white shadow-lg rounded-xl border border-gray-200">
      <div className="p-6">
        <h2 className="text-2xl font-extrabold mb-4 text-gray-800">{title}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-700 border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="p-3 text-left font-semibold uppercase tracking-wide">币种</th>
                <th className="p-3 text-right font-semibold uppercase tracking-wide">价格 (USDT)</th>
                <th className="p-3 text-right font-semibold uppercase tracking-wide">价差基点</th>
                <th className="p-3 text-right font-semibold uppercase tracking-wide">4倍天数</th>
                <th className="p-3 text-center font-semibold uppercase tracking-wide">稳定性</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

                let statusText = '不稳定';
                let statusColor = 'text-red-600';
                const st = (item.st || '').toString();
                if (st.includes('green')) {
                  statusText = '稳定';
                  statusColor = 'text-green-600';
                } else if (st.includes('yellow')) {
                  statusText = '一般';
                  statusColor = 'text-yellow-500';
                }

                const price = toNumber(item.p);
                const md = toNumber(item.md);

                return (
                  <tr
                    key={`${item.n}-${index}`}
                    className={`${rowBg} border-b border-gray-100 hover:bg-blue-50 transition-colors`}
                  >
                    <td className="p-3 font-medium text-gray-800">{item.n}</td>
                    <td className="p-3 text-right">{price !== null ? price.toFixed(6) : String(item.p)}</td>
                    <td className="p-3 text-right">{item.spr}</td>
                    <td className="p-3 text-right">{md !== null ? md * 4 : String(item.md)}</td>
                    <td className={`p-3 text-center font-semibold ${statusColor}`}>{statusText}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
