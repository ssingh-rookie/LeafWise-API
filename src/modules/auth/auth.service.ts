// ============================================================================
// Authentication Service
// ============================================================================

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

export interface TokenPayload {
  sub: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabase: any = null;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getSupabaseClient() {
    if (!this.supabase) {
      this.supabase = createClient(
        this.config.get<string>('database.supabase.url')!,
        this.config.get<string>('database.supabase.anonKey')!,
      );
    }
    return this.supabase;
  }

  async signUp(email: string, password: string, name: string) {
    // Create user in Supabase Auth
    const supabase = this.getSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      this.logger.error('Supabase signup failed', authError);
      throw new UnauthorizedException(authError.message);
    }

    if (!authData.user) {
      throw new UnauthorizedException('Failed to create user');
    }

    // Create user in our database
    const user = await this.prisma.client.user.create({
      data: {
        id: authData.user.id,
        email,
        name,
      },
    });

    // Generate our JWT tokens
    const tokens = this.generateTokens({ sub: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      session: tokens,
    };
  }

  async signIn(email: string, password: string) {
    // Authenticate with Supabase
    const supabase = this.getSupabaseClient();
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      this.logger.error('Supabase signin failed', authError);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!authData.user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get user from our database
    const user = await this.prisma.client.user.findUnique({
      where: { id: authData.user.id },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate our JWT tokens
    const tokens = this.generateTokens({ sub: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      session: tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<TokenPayload>(refreshToken);
      const tokens = this.generateTokens({ sub: payload.sub, email: payload.email });
      return { session: tokens };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private generateTokens(payload: TokenPayload): AuthTokens {
    const tokenPayload = { sub: payload.sub, email: payload.email };
    const accessToken = this.jwtService.sign(tokenPayload);
    const refreshToken = this.jwtService.sign(tokenPayload, { expiresIn: '30d' });
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    return {
      accessToken,
      refreshToken,
      expiresAt,
    };
  }
}
