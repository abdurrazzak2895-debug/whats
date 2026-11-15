import { BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { GroupCollectorController } from './group-collector.controller';
import { GroupService } from './group.service';
import { ChatScopeService } from '../auth/chat-scope.service';
import { ApiKey } from '../auth/entities/api-key.entity';

describe('GroupCollectorController', () => {
  const group = {
    id: '1@g.us',
    name: 'Visible',
    participants: [{ id: '123@c.us', number: '123', isAdmin: true, isSuperAdmin: false }],
  };
  const service = {
    listGroups: jest.fn(),
    getGroupInfo: jest.fn(),
  };
  const response = { setHeader: jest.fn() };
  const controller = new GroupCollectorController(service as unknown as GroupService, new ChatScopeService());
  const key = { allowedChats: ['1@g.us'] } as ApiKey;

  beforeEach(() => {
    jest.clearAllMocks();
    service.listGroups.mockResolvedValue([group, { id: '2@g.us', name: 'Hidden' }]);
    service.getGroupInfo.mockResolvedValue(group);
  });

  it('filters groups before requesting participant metadata', async () => {
    expect(await controller.collectGroups('session', key)).toEqual([
      { groupId: '1@g.us', groupName: 'Visible', memberCount: 1, admins: 1 },
    ]);
    expect(service.getGroupInfo.mock.calls).toEqual([['session', '1@g.us']]);
  });

  it('exports only allowed groups with download headers', async () => {
    const csv = await controller.exportAllGroups('session', response as unknown as Response, key);
    expect(csv).toContain('1@g.us,Visible,123@c.us,123');
    expect(service.getGroupInfo.mock.calls).toEqual([['session', '1@g.us']]);
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });

  it('rejects unsupported formats before reading metadata', async () => {
    await expect(
      controller.getGroupMembers('session', group.id, response as unknown as Response, 'xlsx'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.getGroupInfo).not.toHaveBeenCalled();
  });

  it('propagates metadata failures rather than downloading incomplete data', async () => {
    service.getGroupInfo.mockRejectedValue(new Error('Unavailable'));
    await expect(controller.exportAllGroups('session', response as unknown as Response, key)).rejects.toThrow(
      'Unavailable',
    );
    expect(response.setHeader).not.toHaveBeenCalled();
  });
});
