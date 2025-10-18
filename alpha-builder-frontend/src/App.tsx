import { useEffect, useState } from 'react';

function App() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/stability/stability_feed_v2.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((json) => setData(json))
      .catch((err) => console.error('Fetch error:', err));
  }, []);

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        {data ? (
          <div className="w-full max-w-5xl bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <h2 className="text-3xl font-extrabold mb-6 text-center text-gray-800">
              币种稳定性列表
            </h2>
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
                  {data.items.map((item: any, index: number) => {
                    const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                    let statusText = '';
                    let statusColor = '';

                    if (item.st.includes('green')) {
                      statusText = '稳定';
                      statusColor = 'text-green-600';
                    } else if (item.st.includes('yellow')) {
                      statusText = '一般';
                      statusColor = 'text-yellow-500';
                    } else {
                      statusText = '不稳定';
                      statusColor = 'text-red-600';
                    }

                    return (
                      <tr
                        key={item.n}
                        className={`${rowBg} border-b border-gray-100 hover:bg-blue-50 transition-colors`}
                      >
                        <td className="p-3 font-medium text-gray-800">{item.n}</td>
                        <td className="p-3 text-right">{item.p.toFixed(6)}</td>
                        <td className="p-3 text-right">{item.spr}</td>
                        <td className="p-3 text-right">{item.md * 4}</td>
                        <td className={`p-3 text-center font-semibold ${statusColor}`}>
                          {statusText}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-lg animate-pulse">加载中...</p>
        )}
      </div>
    </>
  );
}

export default App;
