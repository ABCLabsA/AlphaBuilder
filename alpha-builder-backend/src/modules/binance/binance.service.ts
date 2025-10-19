import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AxiosResponse } from "axios";
import { createHmac } from "crypto";
import { lastValueFrom } from "rxjs";

interface BinanceBalance {
  asset: string;
  free: string;
  locked: string;
}

interface BinanceAccountResponse {
  balances: BinanceBalance[];
}

export interface BinanceWalletSummary {
  balances: Array<{
    asset: string;
    available: number;
    locked: number;
  }>;
  fetchedAt: Date;
}

@Injectable()
export class BinanceService {
  private readonly logger = new Logger(BinanceService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.baseUrl = this.configService.get<string>("BINANCE_API_URL", "https://api.binance.com");
  }

  async fetchWalletSummary(apiKey: string, apiSecret: string): Promise<BinanceWalletSummary> {
    const query = this.buildSignedQuery({}, apiSecret);
    const url = `${this.baseUrl}/sapi/v3/account?${query}`;

    const response: AxiosResponse<BinanceAccountResponse> = await lastValueFrom(
      this.httpService.get(url, {
        headers: { "X-MBX-APIKEY": apiKey }
      })
    );

    const balances = (response.data?.balances ?? [])
      .filter((balance) => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0)
      .map((balance) => ({
        asset: balance.asset,
        available: parseFloat(balance.free),
        locked: parseFloat(balance.locked)
      }));

    this.logger.debug(`Fetched ${balances.length} Binance balances`);

    return {
      balances,
      fetchedAt: new Date()
    };
  }

  private buildSignedQuery(params: Record<string, string | number>, secret: string): string {
    const timestamp = Date.now();
    const query = new URLSearchParams({
      recvWindow: "5000",
      timestamp: timestamp.toString(),
      ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, value.toString()]))
    });

    const signature = createHmac("sha256", secret).update(query.toString()).digest("hex");
    query.append("signature", signature);
    return query.toString();
  }
}
