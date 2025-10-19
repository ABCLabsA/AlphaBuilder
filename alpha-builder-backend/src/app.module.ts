import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthModule } from "./modules/auth/auth.module.js";
import { BinanceModule } from "./modules/binance/binance.module.js";
import { EthereumModule } from "./modules/ethereum/ethereum.module.js";
import { UsersModule } from "./modules/users/users.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.local"]
    }),
    EthereumModule,
    UsersModule,
    BinanceModule,
    AuthModule
  ]
})
export class AppModule {}
