import { BadRequestException, Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ChatScoped, CurrentApiKey } from '../auth/decorators/auth.decorators';
import type { ApiKey } from '../auth/entities/api-key.entity';
import { ChatScopeService } from '../auth/chat-scope.service';
import { GroupService } from './group.service';
import { groupMemberRows, membersCsv } from './group-collector.util';

@ApiTags('groups-phone-numbers')
@Controller('sessions/:sessionId/groups/numbers')
export class GroupCollectorController {
  constructor(
    private readonly groupService: GroupService,
    private readonly chatScope: ChatScopeService,
  ) {}

  private async visibleGroups(sessionId: string, apiKey?: ApiKey) {
    return this.chatScope.filter(apiKey, await this.groupService.listGroups(sessionId), group => group.id);
  }

  @Get('collect')
  @ChatScoped('filtered')
  @ApiOperation({ summary: 'List accessible groups and their member counts' })
  async collectGroups(@Param('sessionId') sessionId: string, @CurrentApiKey() apiKey?: ApiKey) {
    const result = [];
    for (const group of await this.visibleGroups(sessionId, apiKey)) {
      const info = await this.groupService.getGroupInfo(sessionId, group.id);
      result.push({
        groupId: info.id,
        groupName: info.name,
        memberCount: info.participants.length,
        admins: info.participants.filter(p => p.isAdmin || p.isSuperAdmin).length,
      });
    }
    return result;
  }

  @Get('export')
  @ChatScoped('filtered')
  @ApiOperation({ summary: 'Export members of all accessible groups as CSV' })
  @ApiProduces('text/csv')
  async exportAllGroups(
    @Param('sessionId') sessionId: string,
    @Res({ passthrough: true }) response: Response,
    @CurrentApiKey() apiKey?: ApiKey,
  ) {
    const rows: ReturnType<typeof groupMemberRows> = [];
    // Sequential calls avoid a burst of metadata requests. Any failure aborts the export,
    // rather than silently delivering an incomplete contact list.
    for (const group of await this.visibleGroups(sessionId, apiKey)) {
      rows.push(...groupMemberRows(await this.groupService.getGroupInfo(sessionId, group.id)));
    }
    return this.csv(response, rows);
  }

  @Get(':groupId/phone-numbers')
  @ChatScoped('fenced')
  @ApiOperation({ summary: 'Read group members as JSON or download CSV' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  async getGroupMembers(
    @Param('sessionId') sessionId: string,
    @Param('groupId') groupId: string,
    @Res({ passthrough: true }) response: Response,
    @Query('format') format: string = 'json',
  ) {
    if (format !== 'json' && format !== 'csv') {
      throw new BadRequestException('format must be json or csv');
    }
    const rows = groupMemberRows(await this.groupService.getGroupInfo(sessionId, groupId));
    if (format === 'csv') return this.csv(response, rows);
    response.setHeader('Cache-Control', 'no-store');
    return rows;
  }

  private csv(response: Response, rows: ReturnType<typeof groupMemberRows>) {
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="group-members.csv"');
    response.setHeader('Cache-Control', 'no-store');
    return membersCsv(rows);
  }
}
