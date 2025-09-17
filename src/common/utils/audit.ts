import { PrismaClient } from '@prisma/client';

type AuditClient = PrismaClient | { auditLog: { create: (args: any) => Promise<any> } };

export async function createAuditLog(
  client: AuditClient,
  params: {
    userId: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    meta?: unknown;
  }
) {
  await client.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      meta: params.meta ?? null
    }
  });
}
