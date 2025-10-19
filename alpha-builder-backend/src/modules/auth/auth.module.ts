import { Module } from "@nestjs/common";

import { BinanceModule } from "../binance/binance.module";
import { EthereumModule } from "../ethereum/ethereum.module";
import { UsersModule } from "../users/users.module";
import { BinanceAuthController } from "./controllers/binance-auth.controller";
import { ZkEmailController } from "./controllers/zk-email.controller";
import { BinanceAuthService } from "./services/binance-auth.service";
import { ZkEmailService } from "./services/zk-email.service";
import { TokenService } from "./token.service";

@Module({
  imports: [EthereumModule, UsersModule, BinanceModule],
  controllers: [ZkEmailController, BinanceAuthController],
  providers: [ZkEmailService, BinanceAuthService, TokenService]
})
export class AuthModule {}
