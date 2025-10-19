import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import jwt from "jsonwebtoken";

export interface AuthTokenPayload {
  sub: string;
  type: "BINANCE_SHADOW" | "NATIVE";
  aaWalletAddress: string;
}

@Injectable()
export class TokenService {
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    const secret = this.configService.get<string>("JWT_SECRET");
    if (!secret) {
      throw new Error("JWT_SECRET env var missing");
    }
    this.secret = secret;
  }

  issueToken(payload: AuthTokenPayload, expiresIn = "1h"): string {
    return jwt.sign(payload, this.secret, { expiresIn });
  }
}
