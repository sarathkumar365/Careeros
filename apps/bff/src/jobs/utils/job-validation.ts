import { NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { DatabaseService } from '../../database/database.service';

export async function requireJobApplication<
  Select extends Prisma.JobApplicationSelect | undefined = undefined,
  Include extends Prisma.JobApplicationInclude | undefined = undefined,
>(
  database: DatabaseService,
  id: string,
  args?: {
    select?: Select;
    include?: Include;
  },
): Promise<
  Prisma.JobApplicationGetPayload<{
    select: Select;
    include: Include;
  }>
> {
  const jobApplication = await database.jobApplication.findUnique({
    where: { id },
    ...(args ?? {}),
  } as Prisma.JobApplicationFindUniqueArgs);

  if (!jobApplication) {
    throw new NotFoundException(`Job application with ID ${id} not found`);
  }

  return jobApplication as Prisma.JobApplicationGetPayload<{
    select: Select;
    include: Include;
  }>;
}
