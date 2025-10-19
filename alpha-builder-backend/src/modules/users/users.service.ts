import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, User as PrismaUser, UserType as PrismaUserType } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service.js";
import { UserProfile, UserType } from "./interfaces/user-profile.interface.js";

type CreateProfileInput = Omit<UserProfile, "id" | "createdAt" | "updatedAt">;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createProfile(data: CreateProfileInput): Promise<UserProfile> {
    const user = await this.prisma.user.create({
      data: {
        type: data.type as PrismaUserType,
        emailCommitment: data.emailCommitment ?? null,
        binanceWallet: data.binanceWallet ?? null,
        aaWalletAddress: data.aaWalletAddress,
        ownerAddress: data.ownerAddress,
        salt: data.salt
      }
    });
    return this.toProfile(user);
  }

  async updateProfile(id: string, changes: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: this.buildUpdateData(changes)
      });
      return this.toProfile(user);
    } catch (error) {
      if (this.isRecordNotFound(error)) {
        throw new NotFoundException(`User ${id} not found`);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return this.toProfile(user);
  }

  async findByAAWallet(address: string): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({ where: { aaWalletAddress: address } });
    return user ? this.toProfile(user) : null;
  }

  async findManyByType(type: UserType): Promise<UserProfile[]> {
    const users = await this.prisma.user.findMany({
      where: { type: type as PrismaUserType },
      orderBy: { createdAt: "desc" }
    });
    return users.map((user) => this.toProfile(user));
  }

  private toProfile(user: PrismaUser): UserProfile {
    return {
      id: user.id,
      type: user.type as UserType,
      emailCommitment: user.emailCommitment ?? undefined,
      binanceWallet: user.binanceWallet ?? undefined,
      aaWalletAddress: user.aaWalletAddress,
      ownerAddress: user.ownerAddress,
      salt: user.salt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  private buildUpdateData(changes: Partial<UserProfile>): Prisma.UserUpdateInput {
    const data: Prisma.UserUpdateInput = {};
    if (changes.type) {
      data.type = changes.type as PrismaUserType;
    }
    if (changes.emailCommitment !== undefined) {
      data.emailCommitment = changes.emailCommitment ?? null;
    }
    if (changes.binanceWallet !== undefined) {
      data.binanceWallet = changes.binanceWallet ?? null;
    }
    if (changes.aaWalletAddress) {
      data.aaWalletAddress = changes.aaWalletAddress;
    }
    if (changes.ownerAddress) {
      data.ownerAddress = changes.ownerAddress;
    }
    if (changes.salt) {
      data.salt = changes.salt;
    }
    return data;
  }

  private isRecordNotFound(error: unknown): boolean {
    if (typeof error !== "object" || error === null) {
      return false;
    }
    return (error as { code?: string }).code === "P2025";
  }
}
