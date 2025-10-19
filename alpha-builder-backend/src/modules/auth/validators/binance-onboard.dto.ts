import { IsOptional, IsString, Matches } from "class-validator";
import { IsEthereumAddress } from "class-validator";

export class BinanceOnboardDto {
  @IsString()
  apiKey!: string;

  @IsString()
  apiSecret!: string;

  @IsEthereumAddress()
  binanceWalletAddress!: string;

  @IsEthereumAddress()
  ownerAddress!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: "salt must be numeric string" })
  salt?: string;
}
