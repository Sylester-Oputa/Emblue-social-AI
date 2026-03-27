import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../database/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.companyName || `${dto.firstName}'s Organization`,
          slug: this.generateSlug(dto.companyName || dto.email),
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          tenantId: tenant.id,
          name: "Default Workspace",
          slug: "default",
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: "TENANT_ADMIN",
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: "TENANT_ADMIN",
        },
      });

      await tx.approvalQueue.create({
        data: {
          workspaceId: workspace.id,
          name: "Default Queue",
          isDefault: true,
          slaHours: 24,
        },
      });

      return { tenant, workspace, user };
    });

    const tokens = await this.generateTokens(
      result.user.id,
      result.user.role,
      result.user.tenantId,
    );

    return {
      ...tokens,
      user: this.sanitizeUser(result.user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Account is deactivated");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.role, user.tenantId);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>("auth.jwtRefreshSecret"),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException("Invalid refresh token");
      }

      const tokens = await this.generateTokens(
        user.id,
        user.role,
        user.tenantId,
      );
      return tokens;
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            workspace: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return this.sanitizeUser(user);
  }

  private async generateTokens(userId: string, role: string, tenantId: string) {
    const payload = { sub: userId, role, tenantId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>("auth.jwtSecret"),
        expiresIn: this.config.get<string>("auth.jwtAccessExpiry", "15m"),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>("auth.jwtRefreshSecret"),
        expiresIn: this.config.get<string>("auth.jwtRefreshExpiry", "7d"),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      tenantId: user.tenantId,
      createdAt: user.createdAt,
      memberships: user.memberships,
    };
  }

  private generateSlug(input: string): string {
    return (
      input
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 50) +
      "-" +
      Date.now().toString(36)
    );
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user)
      return { message: "If that email exists, a reset link has been sent." };

    const resetToken = await this.jwt.signAsync(
      { sub: user.id, purpose: "password-reset" },
      {
        secret: this.config.get<string>("auth.jwtSecret"),
        expiresIn: "1h",
      },
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // TODO: Integrate email service to send password reset link
    // Security: Token removed from logs to prevent credential leakage

    return { message: "If that email exists, a reset link has been sent." };
  }

  async resetPassword(token: string, newPassword: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(token, {
        secret: this.config.get<string>("auth.jwtSecret"),
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired reset token");
    }

    if (payload.purpose !== "password-reset") {
      throw new UnauthorizedException("Invalid token purpose");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (
      !user ||
      user.passwordResetToken !== token ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt < new Date()
    ) {
      throw new UnauthorizedException("Invalid or expired reset token");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });

    return { message: "Password has been reset successfully." };
  }
}
