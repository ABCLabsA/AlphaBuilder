import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthModule } from "./modules/auth/auth.module";
import { BinanceModule } from "./modules/binance/binance.module";
import { EthereumModule } from "./modules/ethereum/ethereum.module";
import { UsersModule } from "./modules/users/users.module";

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
