import { Global, Module } from "@nestjs/common";

import { EthereumService } from "./ethereum.service.js";

@Global()
@Module({
  providers: [EthereumService],
  exports: [EthereumService]
})
export class EthereumModule {}
