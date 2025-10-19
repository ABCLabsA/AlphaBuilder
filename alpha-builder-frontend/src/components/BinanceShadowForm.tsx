import { FormEvent, useState } from "react";

import { api, OnboardBinanceResponse } from "../api/client";

interface Props {
  onComplete: (result: OnboardBinanceResponse) => void;
}

export function BinanceShadowForm({ onComplete }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [binanceWalletAddress, setBinanceWalletAddress] = useState("");
  const [salt, setSalt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await api.onboardBinance({
        apiKey,
        apiSecret,
        ownerAddress,
        binanceWalletAddress,
        salt: salt || undefined
      });
      onComplete(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="form-label">Binance API Key</label>
        <input
          className="form-input"
          type="text"
          autoComplete="off"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="Your Binance API key"
          required
        />
      </div>
      <div>
        <label className="form-label">Binance API Secret</label>
        <input
          className="form-input"
          type="password"
          autoComplete="off"
          value={apiSecret}
          onChange={(event) => setApiSecret(event.target.value)}
          placeholder="Your Binance API secret"
          required
        />
      </div>
      <div>
        <label className="form-label">Original Binance Wallet</label>
        <input
          className="form-input"
          type="text"
          value={binanceWalletAddress}
          onChange={(event) => setBinanceWalletAddress(event.target.value)}
          placeholder="0x..."
          pattern="^0x[a-fA-F0-9]{40}$"
          required
        />
      </div>
      <div>
        <label className="form-label">Owner EOA for Smart Account</label>
        <input
          className="form-input"
          type="text"
          value={ownerAddress}
          onChange={(event) => setOwnerAddress(event.target.value)}
          placeholder="0x..."
          pattern="^0x[a-fA-F0-9]{40}$"
          required
        />
      </div>
      <div>
        <label className="form-label">
          Deterministic Salt <span className="text-xs text-slate-400">(optional)</span>
        </label>
        <input
          className="form-input"
          value={salt}
          onChange={(event) => setSalt(event.target.value)}
          placeholder="Defaults to current timestamp"
        />
      </div>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <button
        className="btn-primary"
        type="submit"
        disabled={isLoading}
      >
        {isLoading ? "Deploying Smart Account..." : "Link Binance & Deploy"}
      </button>
    </form>
  );
}
