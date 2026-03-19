/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { NotFoundException } from '@nestjs/common';
import { requireAccessibleJobApplication } from './job-validation';

describe('requireAccessibleJobApplication', () => {
  it('uses findFirst ownership lookup for USER', async () => {
    const database = {
      jobApplication: {
        findUnique: jest.fn(),
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'job-1', userId: 'user-1' }),
      },
    } as any;

    const result = await requireAccessibleJobApplication(database, 'job-1', {
      id: 'user-1',
      email: 'u@e.com',
      role: 'USER',
    });

    expect(database.jobApplication.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'job-1',
          userId: 'user-1',
        },
      }),
    );
    expect(result.id).toBe('job-1');
  });

  it('uses findUnique for ADMIN', async () => {
    const database = {
      jobApplication: {
        findUnique: jest.fn().mockResolvedValue({ id: 'job-1', userId: null }),
        findFirst: jest.fn(),
      },
    } as any;

    const result = await requireAccessibleJobApplication(database, 'job-1', {
      id: 'admin-1',
      email: 'admin@e.com',
      role: 'ADMIN',
    });

    expect(database.jobApplication.findUnique).toHaveBeenCalled();
    expect(result.id).toBe('job-1');
  });

  it('throws not found when user does not own job', async () => {
    const database = {
      jobApplication: {
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as any;

    await expect(
      requireAccessibleJobApplication(database, 'job-2', {
        id: 'user-1',
        email: 'u@e.com',
        role: 'USER',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
