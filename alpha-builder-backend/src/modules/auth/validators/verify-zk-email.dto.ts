import { IsHexadecimal, IsString, IsUUID, Length, Matches } from "class-validator";

export class VerifyZkEmailDto {
  @IsUUID()
  sessionId!: string;

  @IsString()
  @Matches(/^0x[0-9a-fA-F]+$/, { message: "proof must be hex string" })
  proof!: `0x${string}`;

  @IsHexadecimal()
  @Length(66, 66)
  nullifier!: `0x${string}`;

  @IsHexadecimal()
  @Length(66, 66)
  userOpHash!: `0x${string}`;
}
