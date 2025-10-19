interface BaseResult {
  aaWalletAddress: string;
  token: string;
  userId: string;
}

interface NativeResult extends BaseResult {
  flow: "native";
  emailCommitment: `0x${string}`;
}

interface BinanceResult extends BaseResult {
  flow: "binance";
  binanceWalletAddress: string;
  balances: Array<{
    asset: string;
    available: number;
    locked: number;
  }>;
}

type Props = {
  result: NativeResult | BinanceResult;
};

export function ResultPanel({ result }: Props) {
  return (
    <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-6 text-sm text-emerald-50 backdrop-blur">
      <h3 className="text-lg font-semibold text-emerald-200">AA Wallet Ready</h3>
      <p className="mt-2 break-all">
        <span className="font-medium text-emerald-300">Address:</span> {result.aaWalletAddress}
      </p>
      <p className="break-all">
        <span className="font-medium text-emerald-300">User ID:</span> {result.userId}
      </p>
      <p className="mt-2 break-all text-xs">
        <span className="font-medium text-emerald-300">Bearer Token:</span> {result.token}
      </p>

      {result.flow === "native" ? (
        <p className="mt-4 break-all text-xs">
          <span className="font-medium text-emerald-300">Email Commitment:</span>{" "}
          {result.emailCommitment}
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          <p className="break-all">
            <span className="font-medium text-emerald-300">Binance Wallet:</span>{" "}
            {result.binanceWalletAddress}
          </p>
          <div>
            <p className="font-medium text-emerald-300">Synced Balances</p>
            <ul className="mt-1 space-y-1 text-xs">
              {result.balances.map((balance) => (
                <li key={balance.asset} className="flex justify-between">
                  <span>{balance.asset}</span>
                  <span>
                    {balance.available.toFixed(4)} free / {balance.locked.toFixed(4)} locked
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
