const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    ...options
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export interface InitZkEmailResponse {
  sessionId: string;
  emailCommitment: `0x${string}`;
  salt: string;
}

export interface VerifyZkEmailResponse {
  aaWalletAddress: string;
  emailCommitment: `0x${string}`;
  token: string;
  userId: string;
}

export interface OnboardBinanceResponse {
  aaWalletAddress: string;
  binanceWalletAddress: string;
  balances: Array<{
    asset: string;
    available: number;
    locked: number;
  }>;
  token: string;
  userId: string;
}

export const api = {
  initZkEmail: (payload: { email: string; ownerAddress: string; salt?: string }) =>
    request<InitZkEmailResponse>("/auth/zk-email/init", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  verifyZkEmail: (payload: { sessionId: string; proof: `0x${string}`; nullifier: `0x${string}`; userOpHash: `0x${string}` }) =>
    request<VerifyZkEmailResponse>("/auth/zk-email/verify", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  onboardBinance: (payload: {
    apiKey: string;
    apiSecret: string;
    binanceWalletAddress: string;
    ownerAddress: string;
    salt?: string;
  }) =>
    request<OnboardBinanceResponse>("/auth/binance/onboard", {
      method: "POST",
      body: JSON.stringify(payload)
    })
};
