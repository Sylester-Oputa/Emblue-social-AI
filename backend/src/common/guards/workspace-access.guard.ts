import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

/**
 * WorkspaceAccessGuard
 *
 * Validates that the authenticated user has access to the requested workspace.
 * Should be used on all workspace-scoped endpoints to prevent unauthorized access.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, RolesGuard, WorkspaceAccessGuard)
 * @Get('/workspaces/:workspaceId/signals')
 * async findSignals(@Param('workspaceId') workspaceId: string) { ... }
 *
 * Security:
 * - Verifies workspace exists
 * - Checks user has membership in workspace
 * - Validates tenant ownership (prevents cross-tenant access)
 * - Allows SUPER_ADMIN to access all workspaces
 */
@Injectable()
export class WorkspaceAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Authentication required");
    }

    // Extract workspaceId from route params
    const workspaceId = request.params?.workspaceId || request.params?.id;

    if (!workspaceId) {
      // No workspace param in route - skip validation
      return true;
    }

    // SUPER_ADMIN can access all workspaces
    if (user.role === "SUPER_ADMIN") {
      return true;
    }

    // Verify workspace exists and user has access
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        tenantId: true,
        memberships: {
          where: { userId: user.userId },
          select: { userId: true },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace ${workspaceId} not found`);
    }

    // Verify user's tenant matches workspace tenant
    if (workspace.tenantId !== user.tenantId) {
      throw new ForbiddenException(
        "Access denied: workspace belongs to different tenant",
      );
    }

    // Verify user is a member of the workspace
    if (workspace.memberships.length === 0) {
      throw new ForbiddenException(
        "Access denied: you are not a member of this workspace",
      );
    }

    return true;
  }
}
