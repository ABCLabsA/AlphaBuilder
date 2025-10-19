import { Body, Controller, Post } from "@nestjs/common";

import { BinanceAuthService } from "../services/binance-auth.service";
import { BinanceOnboardDto } from "../validators/binance-onboard.dto";

@Controller("auth/binance")
export class BinanceAuthController {
  constructor(private readonly binanceAuthService: BinanceAuthService) {}

  @Post("onboard")
  onboard(@Body() dto: BinanceOnboardDto) {
    return this.binanceAuthService.onboard(dto);
  }
}
