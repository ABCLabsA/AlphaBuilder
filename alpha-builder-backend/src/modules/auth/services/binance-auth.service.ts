import { Injectable, Logger } from "@nestjs/common";

import { BinanceService } from "../../binance/binance.service.js";
import { WalletKind } from "../../ethereum/constants.js";
import { EthereumService, PredictAccountParams } from "../../ethereum/ethereum.service.js";
import { UsersService } from "../../users/users.service.js";
import { TokenService } from "../token.service.js";
import { BinanceOnboardDto } from "../validators/binance-onboard.dto.js";

@Injectable()
export class BinanceAuthService {
  private readonly logger = new Logger(BinanceAuthService.name);

  constructor(
    private readonly binanceService: BinanceService,
    private readonly ethereumService: EthereumService,
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService
  ) {}

  async onboard(dto: BinanceOnboardDto) {
    const summary = await this.binanceService.fetchWalletSummary(dto.apiKey, dto.apiSecret);
    const salt = dto.salt ?? Date.now().toString();
    const params: PredictAccountParams = {
      owner: dto.ownerAddress,
      kind: WalletKind.BINANCE_SHADOW,
      binanceWallet: dto.binanceWalletAddress,
      salt
    };

    let aaWalletAddress: string;
    try {
      const { accountAddress } = await this.ethereumService.createAccount(params);
      aaWalletAddress = accountAddress;
    } catch (error) {
      this.logger.warn(`createAccount failed, fallback to prediction: ${(error as Error).message}`);
      aaWalletAddress = await this.ethereumService.predictAccountAddress(params);
    }

    const user = await this.usersService.createProfile({
      type: "BINANCE_SHADOW",
      emailCommitment: undefined,
      binanceWallet: dto.binanceWalletAddress,
      aaWalletAddress,
      ownerAddress: dto.ownerAddress,
      salt
    });

    const token = this.tokenService.issueToken({
      sub: user.id,
      type: user.type,
      aaWalletAddress
    });

    return {
      aaWalletAddress,
      binanceWalletAddress: dto.binanceWalletAddress,
      balances: summary.balances,
      token,
      userId: user.id
    };
  }
}
