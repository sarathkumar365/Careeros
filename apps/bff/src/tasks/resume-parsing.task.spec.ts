import { ResumeParsingTask } from './resume-parsing.task';

describe('ResumeParsingTask', () => {
  it('merges deterministic contacts before persisting and broadcasting', async () => {
    const jobApplication = {
      updateParsedResume: jest.fn().mockResolvedValue(undefined),
      updateTailoredResume: jest.fn().mockResolvedValue(undefined),
      getExtractedContacts: jest.fn().mockResolvedValue({
        email: 'deterministic@example.com',
        github: 'https://github.com/deterministic',
      }),
      upsertProfileContactsByJob: jest.fn().mockResolvedValue(undefined),
    };

    const websocket = {
      broadcast: jest.fn(),
    };

    const enqueue = {
      enqueueResumeParsing: jest.fn().mockResolvedValue(undefined),
    };

    const task = new ResumeParsingTask(
      jobApplication as any,
      websocket as any,
      enqueue as any,
    );

    const event = {
      type: 'resume.parsing.completed' as const,
      jobId: 'job-1',
      timestamp: new Date().toISOString(),
      resumeStructure: {
        personalInfo: {
          email: '',
          github: '',
          linkedin: 'https://linkedin.com/in/from-ai',
        },
      },
    };

    const result = await task.onSuccess(event);

    expect(jobApplication.getExtractedContacts).toHaveBeenCalledWith('job-1');
    expect(jobApplication.updateParsedResume).toHaveBeenCalled();
    expect(jobApplication.updateTailoredResume).toHaveBeenCalled();
    expect(jobApplication.upsertProfileContactsByJob).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ email: 'deterministic@example.com' }),
    );

    expect(result.resumeStructure.personalInfo).toEqual({
      email: 'deterministic@example.com',
      github: 'https://github.com/deterministic',
      linkedin: 'https://linkedin.com/in/from-ai',
      personalSite: '',
      phone: '',
    });

    const broadcastCall = websocket.broadcast.mock.calls[0] as [
      string,
      { resumeStructure: { personalInfo: { email: string } } },
    ];
    expect(broadcastCall[0]).toBe('job-1');
    expect(broadcastCall[1].resumeStructure.personalInfo.email).toBe(
      'deterministic@example.com',
    );
  });
});
