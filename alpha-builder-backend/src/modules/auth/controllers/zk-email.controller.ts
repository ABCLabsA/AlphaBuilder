import { Body, Controller, Post } from "@nestjs/common";

import { ZkEmailService } from "../services/zk-email.service";
import { InitiateZkEmailDto } from "../validators/initiate-zk-email.dto";
import { VerifyZkEmailDto } from "../validators/verify-zk-email.dto";

@Controller("auth/zk-email")
export class ZkEmailController {
  constructor(private readonly zkEmailService: ZkEmailService) {}

  @Post("init")
  init(@Body() dto: InitiateZkEmailDto) {
    return this.zkEmailService.initiateSession(dto);
  }

  @Post("verify")
  verify(@Body() dto: VerifyZkEmailDto) {
    return this.zkEmailService.verifySession(dto);
  }
}
