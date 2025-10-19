import { Injectable, NotFoundException } from "@nestjs/common";
import { v4 as uuid } from "uuid";

import { UserProfile, UserType } from "./interfaces/user-profile.interface";

@Injectable()
export class UsersService {
  private readonly store = new Map<string, UserProfile>();

  createProfile(data: Omit<UserProfile, "id" | "createdAt" | "updatedAt">): UserProfile {
    const id = uuid();
    const now = new Date();
    const profile: UserProfile = { id, createdAt: now, updatedAt: now, ...data };
    this.store.set(id, profile);
    return profile;
  }

  updateProfile(id: string, changes: Partial<UserProfile>): UserProfile {
    const existing = this.store.get(id);
    if (!existing) {
      throw new NotFoundException(`User ${id} not found`);
    }
    const updated: UserProfile = { ...existing, ...changes, updatedAt: new Date() };
    this.store.set(id, updated);
    return updated;
  }

  findById(id: string): UserProfile {
    const profile = this.store.get(id);
    if (!profile) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return profile;
  }

  findByAAWallet(address: string): UserProfile | undefined {
    return Array.from(this.store.values()).find((profile) => profile.aaWalletAddress === address);
  }

  findManyByType(type: UserType): UserProfile[] {
    return Array.from(this.store.values()).filter((profile) => profile.type === type);
  }
}
