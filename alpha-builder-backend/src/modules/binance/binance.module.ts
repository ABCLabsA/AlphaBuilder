import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";

import { BinanceService } from "./binance.service";

@Module({
  imports: [
    HttpModule.register({
      baseURL: "https://api.binance.com",
      timeout: 5000
    })
  ],
  providers: [BinanceService],
  exports: [BinanceService]
})
export class BinanceModule {}
