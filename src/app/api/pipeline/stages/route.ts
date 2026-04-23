import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';
import { DEFAULT_PIPELINE_STAGES, PipelineStageConfig } from '@/lib/defaultPipelineStages';

async function resolveScope(request: NextRequest, userId: string) {
  const companyId = request.headers.get('X-Company-Id');
  if (companyId) {
    const membership = await prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (membership) return { companyId, userId: null };
  }
  return { companyId: null, userId };
}

export async function GET(request: NextRequest) {
  const auth = await requireRole('employee');
  if (!auth.authorized) return auth.response;

  const scope = await resolveScope(request, auth.userId!);

  const where = scope.companyId
    ? { companyId: scope.companyId }
    : { userId: scope.userId, companyId: null };

  const stages = await prisma.pipelineStage.findMany({
    where,
    orderBy: { order: 'asc' },
  });

  if (stages.length === 0) {
    return NextResponse.json({ stages: DEFAULT_PIPELINE_STAGES, isCustom: false });
  }

  return NextResponse.json({ stages, isCustom: true });
}

export async function PUT(request: NextRequest) {
  const auth = await requireRole('employee');
  if (!auth.authorized) return auth.response;

  const scope = await resolveScope(request, auth.userId!);
  const body = await request.json() as { stages: PipelineStageConfig[] };

  const where = scope.companyId
    ? { companyId: scope.companyId }
    : { userId: scope.userId, companyId: null };

  await prisma.pipelineStage.deleteMany({ where });

  if (body.stages && body.stages.length > 0) {
    await prisma.pipelineStage.createMany({
      data: body.stages.map((s, i) => ({
        key: s.key,
        label: s.label,
        color: s.color ?? '#6366f1',
        order: i,
        isWon: s.isWon ?? false,
        isLost: s.isLost ?? false,
        companyId: scope.companyId,
        userId: scope.userId,
      })),
    });
  }

  return NextResponse.json({ ok: true });
}
