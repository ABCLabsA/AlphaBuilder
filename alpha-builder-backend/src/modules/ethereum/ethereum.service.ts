import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JsonRpcProvider, Wallet, Contract, ZeroAddress, ZeroHash, TransactionReceipt } from "ethers";

import { WalletKind } from "./constants.js";

type HexString = `0x${string}`;

const EMAIL_AA_FACTORY_ABI = [
  "function createAccount(address owner,uint8 kind,address binanceWallet,bytes32 emailCommitment,address verifier,uint256 salt) returns (address)",
  "function getAddress(address owner,uint8 kind,address binanceWallet,bytes32 emailCommitment,address verifier,uint256 salt) view returns (address)"
];

const ZK_EMAIL_VERIFIER_ABI = [
  "function verifyProof(bytes proof,bytes32 emailCommitment,bytes32 nullifier,bytes32 userOpHash) view returns (bool)"
];

export interface PredictAccountParams {
  owner: string;
  kind: WalletKind;
  binanceWallet?: string;
  emailCommitment?: HexString;
  verifierOverride?: string;
  salt?: string;
}

export interface CreateAccountResult {
  accountAddress: string;
  receipt: TransactionReceipt;
}

@Injectable()
export class EthereumService {
  private readonly logger = new Logger(EthereumService.name);
  private readonly provider: JsonRpcProvider;
  private readonly signer?: Wallet;
  private readonly factoryAddress?: string;
  private readonly zkEmailVerifierAddress?: string;

  constructor(private readonly configService: ConfigService) {
    const rpcUrl = this.configService.get<string>("ETHEREUM_RPC_URL");
    if (!rpcUrl) {
      throw new Error("ETHEREUM_RPC_URL env var missing");
    }

    this.provider = new JsonRpcProvider(rpcUrl);
    this.factoryAddress = this.configService.get<string>("EMAIL_AA_FACTORY_ADDRESS");
    this.zkEmailVerifierAddress = this.configService.get<string>("ZK_EMAIL_VERIFIER_ADDRESS");

    const privateKey = this.configService.get<string>("ETHEREUM_OPERATOR_KEY");
    if (privateKey) {
      this.signer = new Wallet(privateKey, this.provider);
    } else {
      this.logger.warn("ETHEREUM_OPERATOR_KEY not configured; write operations disabled");
    }
  }

  async predictAccountAddress(params: PredictAccountParams): Promise<string> {
    this.assertFactoryConfigured();
    const factory = this.getFactoryContract();
    const salt = params.salt ? BigInt(params.salt) : BigInt(Date.now());
    const emailCommitment = params.emailCommitment ?? ZeroHash;
    const binanceWallet = params.binanceWallet ?? ZeroAddress;
    const verifier = params.verifierOverride ?? this.zkEmailVerifierAddress ?? ZeroAddress;
    return factory.getAddress(params.owner, params.kind, binanceWallet, emailCommitment, verifier, salt);
  }

  async createAccount(params: PredictAccountParams): Promise<CreateAccountResult> {
    this.assertSignerConfigured();
    const factory = this.getFactoryContract(true);
    const salt = params.salt ? BigInt(params.salt) : BigInt(Date.now());
    const commitment = params.emailCommitment ?? ZeroHash;
    const binanceWallet = params.binanceWallet ?? ZeroAddress;
    const verifier = params.verifierOverride ?? this.zkEmailVerifierAddress ?? ZeroAddress;

    const tx = await factory.createAccount(params.owner, params.kind, binanceWallet, commitment, verifier, salt);
    const receipt = await tx.wait();
    const accountAddress: string = await factory.getAddress(
      params.owner,
      params.kind,
      binanceWallet,
      commitment,
      verifier,
      salt
    );

    return { accountAddress, receipt };
  }

  async verifyEmailProof(
    proof: Uint8Array | string,
    emailCommitment: HexString,
    nullifier: HexString | string,
    userOpHash: HexString | string
  ): Promise<boolean> {
    if (!this.zkEmailVerifierAddress) {
      this.logger.warn("ZK_EMAIL_VERIFIER_ADDRESS not configured; allowing proof by default");
      return true;
    }

    const contract = new Contract(this.zkEmailVerifierAddress, ZK_EMAIL_VERIFIER_ABI, this.provider);
    return contract.verifyProof(proof, emailCommitment, nullifier, userOpHash);
  }

  private getFactoryContract(withSigner = false): Contract {
    this.assertFactoryConfigured();
    if (withSigner) {
      this.assertSignerConfigured();
    }

    const runner = withSigner ? this.signer : this.provider;
    return new Contract(this.factoryAddress as string, EMAIL_AA_FACTORY_ABI, runner);
  }

  private assertFactoryConfigured(): asserts this is this & { factoryAddress: string } {
    if (!this.factoryAddress) {
      throw new Error("EMAIL_AA_FACTORY_ADDRESS env var missing");
    }
  }

  private assertSignerConfigured(): asserts this is this & { signer: Wallet } {
    if (!this.signer) {
      throw new Error("ETHEREUM_OPERATOR_KEY not configured");
    }
  }
}
