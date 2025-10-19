import { Injectable, Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { v4 as uuid } from "uuid";
import { keccak256, toUtf8Bytes } from "ethers";

import { EthereumService, PredictAccountParams } from "../../ethereum/ethereum.service";
import { WalletKind } from "../../ethereum/constants";
import { UsersService } from "../../users/users.service";
import { UserProfile } from "../../users/interfaces/user-profile.interface";
import { TokenService } from "../token.service";
import { InitiateZkEmailDto } from "../validators/initiate-zk-email.dto";
import { VerifyZkEmailDto } from "../validators/verify-zk-email.dto";

interface PendingSession {
  id: string;
  ownerAddress: string;
  email: string;
  emailCommitment: `0x${string}`;
  salt: string;
  createdAt: Date;
}

@Injectable()
export class ZkEmailService {
  private readonly logger = new Logger(ZkEmailService.name);
  private readonly sessions = new Map<string, PendingSession>();

  constructor(
    private readonly ethereumService: EthereumService,
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService
  ) {}

  initiateSession(dto: InitiateZkEmailDto) {
    const sessionId = uuid();
    const salt = dto.salt ?? Date.now().toString();
    const commitment = keccak256(toUtf8Bytes(`${dto.email}:${sessionId}:${salt}`)) as `0x${string}`;
    const session: PendingSession = {
      id: sessionId,
      ownerAddress: dto.ownerAddress,
      email: dto.email,
      emailCommitment: commitment,
      salt,
      createdAt: new Date()
    };
    this.sessions.set(sessionId, session);

    return {
      sessionId,
      emailCommitment: commitment,
      salt
    };
  }

  async verifySession(dto: VerifyZkEmailDto) {
    const pending = this.sessions.get(dto.sessionId);
    if (!pending) {
      throw new NotFoundException("Session not found or expired");
    }

    const proofIsValid = await this.ethereumService.verifyEmailProof(
      dto.proof,
      pending.emailCommitment,
      dto.nullifier,
      dto.userOpHash
    );
    if (!proofIsValid) {
      throw new UnauthorizedException("Invalid zk-email proof");
    }

    const params: PredictAccountParams = {
      owner: pending.ownerAddress,
      kind: WalletKind.NATIVE,
      emailCommitment: pending.emailCommitment,
      salt: pending.salt
    };

    let aaWalletAddress: string;
    try {
      const { accountAddress } = await this.ethereumService.createAccount(params);
      aaWalletAddress = accountAddress;
    } catch (error) {
      this.logger.warn(`createAccount failed, falling back to deterministic address: ${(error as Error).message}`);
      aaWalletAddress = await this.ethereumService.predictAccountAddress(params);
    }

    const user: UserProfile = this.usersService.createProfile({
      type: "NATIVE",
      emailCommitment: pending.emailCommitment,
      binanceWallet: undefined,
      aaWalletAddress,
      ownerAddress: pending.ownerAddress,
      salt: pending.salt
    });

    const token = this.tokenService.issueToken({
      sub: user.id,
      type: user.type,
      aaWalletAddress
    });

    this.sessions.delete(dto.sessionId);

    return {
      aaWalletAddress,
      emailCommitment: pending.emailCommitment,
      token,
      userId: user.id
    };
  }
}
