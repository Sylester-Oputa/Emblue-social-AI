import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ConnectIntegrationDto } from "./dto/connect-integration.dto";
import * as crypto from "crypto";

@Injectable()
export class IntegrationsService {
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {
    const keyString = this.config.get<string>("platform.encryptionKey", "");
    if (!keyString || keyString.length < 64) {
      throw new Error(
        "ENCRYPTION_KEY must be set as a 64-character hex string (32 bytes). Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }
    this.encryptionKey = Buffer.from(keyString.substring(0, 64), "hex");
  }

  async connect(
    workspaceId: string,
    dto: ConnectIntegrationDto,
    user: any,
    ipAddress?: string,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: user.sub, workspaceId } },
    });

    if (
      !membership ||
      !["TENANT_ADMIN", "WORKSPACE_ADMIN"].includes(membership.role)
    ) {
      throw new BadRequestException(
        "Insufficient permissions to connect integrations",
      );
    }

    const encryptedData = this.encrypt({
      accessToken: dto.accessToken,
      refreshToken: dto.refreshToken,
      accountId: dto.accountId,
    });

    const connection = await this.prisma.$transaction(async (tx) => {
      let conn = await tx.platformConnection.findFirst({
        where: {
          workspaceId,
          platform: dto.platform,
          accountId: dto.accountId,
        },
      });

      if (conn) {
        conn = await tx.platformConnection.update({
          where: { id: conn.id },
          data: {
            accountName: dto.accountName,
            status: "ACTIVE",
            lastHealthAt: new Date(),
            scopes: {
              deleteMany: {},
              create: dto.scopes.map((s) => ({ scope: s })),
            },
          },
        });
      } else {
        conn = await tx.platformConnection.create({
          data: {
            workspaceId,
            platform: dto.platform,
            accountId: dto.accountId,
            accountName: dto.accountName,
            status: "ACTIVE",
            scopes: { create: dto.scopes.map((s) => ({ scope: s })) },
          },
        });
      }

      let cred = await tx.platformCredential.findFirst({
        where: { connectionId: conn.id },
      });

      if (cred) {
        await tx.platformCredential.update({
          where: { id: cred.id },
          data: {
            encryptedToken: encryptedData,
            expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          },
        });
      } else {
        await tx.platformCredential.create({
          data: {
            connectionId: conn.id,
            encryptedToken: encryptedData,
            tokenType: "Bearer",
            expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          },
        });
      }

      return conn;
    });

    await this.audit.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: "integration.connected",
      resourceType: "platform_connection",
      resourceId: connection.id,
      context: { platform: dto.platform, accountId: dto.accountId },
      ipAddress,
    });

    return connection;
  }

  async list(workspaceId: string, user: any) {
    return this.prisma.platformConnection.findMany({
      where: { workspaceId },
      include: {
        credentials: {
          select: { expiresAt: true, tokenType: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async disconnect(
    workspaceId: string,
    connectionId: string,
    user: any,
    ipAddress?: string,
  ) {
    const conn = await this.prisma.platformConnection.findFirst({
      where: { id: connectionId, workspaceId },
    });

    if (!conn) {
      throw new NotFoundException("Connection not found");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.platformCredential.deleteMany({ where: { connectionId } });
      await tx.platformConnection.delete({ where: { id: connectionId } });
    });

    await this.audit.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: "integration.disconnected",
      resourceType: "platform_connection",
      resourceId: connectionId,
      ipAddress,
    });

    return { success: true };
  }

  async getDecryptedCredentials(connectionId: string) {
    const creds = await this.prisma.platformCredential.findFirst({
      where: { connectionId },
    });

    if (!creds || !creds.encryptedToken) {
      throw new NotFoundException("Credentials not found");
    }

    return this.decrypt(creds.encryptedToken);
  }

  private encrypt(data: any): string {
    const text = JSON.stringify(data);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.encryptionKey, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  }

  private decrypt(encryptedText: string): any {
    const parts = encryptedText.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }
    const [ivHex, authTagHex, encryptedData] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      this.encryptionKey,
      iv,
    );
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted);
  }

  /** Encrypt OAuth state string (used by controller for OAuth initiation) */
  encryptState(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.encryptionKey, iv);
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  }

  /** Decrypt OAuth state string (used by controller for OAuth callback) */
  decryptState(encryptedState: string): string {
    const parts = encryptedState.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid state format");
    }
    const [ivHex, authTagHex, encryptedData] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      this.encryptionKey,
      iv,
    );
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
}
