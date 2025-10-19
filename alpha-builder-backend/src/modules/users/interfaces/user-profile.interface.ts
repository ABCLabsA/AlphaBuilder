export type UserType = "BINANCE_SHADOW" | "NATIVE";

export interface UserProfile {
  id: string;
  type: UserType;
  emailCommitment?: `0x${string}`;
  binanceWallet?: string;
  aaWalletAddress?: string;
  ownerAddress: string;
  salt: string;
  createdAt: Date;
  updatedAt: Date;
}
