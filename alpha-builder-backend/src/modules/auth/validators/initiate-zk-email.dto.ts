import { IsEmail, IsEthereumAddress, IsOptional, IsString, Matches } from "class-validator";

export class InitiateZkEmailDto {
  @IsEmail()
  email!: string;

  @IsEthereumAddress()
  ownerAddress!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: "salt must be a numeric string" })
  salt?: string;
}
