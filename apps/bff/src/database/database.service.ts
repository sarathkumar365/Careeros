import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async getApplicationMatchPercentage(jobId: string): Promise<number | null> {
    const jobApplication = await this.jobApplication.findUnique({
      where: { id: jobId },
      select: { matchPercentage: true },
    });

    return jobApplication?.matchPercentage ?? null;
  }
}
