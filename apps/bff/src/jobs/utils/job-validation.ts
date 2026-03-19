import { NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { DatabaseService } from '../../database/database.service';
import type { AuthenticatedUser } from '../../auth/types/auth.types';

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

export async function requireAccessibleJobApplication<
  Select extends Prisma.JobApplicationSelect | undefined = undefined,
  Include extends Prisma.JobApplicationInclude | undefined = undefined,
>(
  database: DatabaseService,
  id: string,
  user: AuthenticatedUser,
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
  if (user.role === 'ADMIN') {
    return requireJobApplication(database, id, args);
  }

  const jobApplication = await database.jobApplication.findFirst({
    where: {
      id,
      userId: user.id,
    },
    ...(args ?? {}),
  } as Prisma.JobApplicationFindFirstArgs);

  if (!jobApplication) {
    throw new NotFoundException(`Job application with ID ${id} not found`);
  }

  return jobApplication as Prisma.JobApplicationGetPayload<{
    select: Select;
    include: Include;
  }>;
}
