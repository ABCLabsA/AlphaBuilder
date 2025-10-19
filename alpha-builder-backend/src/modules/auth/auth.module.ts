import { Module } from "@nestjs/common";

import { BinanceModule } from "../binance/binance.module.js";
import { EthereumModule } from "../ethereum/ethereum.module.js";
import { UsersModule } from "../users/users.module.js";
import { BinanceAuthController } from "./controllers/binance-auth.controller.js";
import { ZkEmailController } from "./controllers/zk-email.controller.js";
import { BinanceAuthService } from "./services/binance-auth.service.js";
import { ZkEmailService } from "./services/zk-email.service.js";
import { TokenService } from "./token.service.js";

@Module({
  imports: [EthereumModule, UsersModule, BinanceModule],
  controllers: [ZkEmailController, BinanceAuthController],
  providers: [ZkEmailService, BinanceAuthService, TokenService]
})
export class AuthModule {}
