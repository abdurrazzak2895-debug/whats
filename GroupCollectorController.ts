import { Controller, Get, Param, Query, HeaderCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('groups-phone-numbers')
@Controller('sessions/:sessionId/groups/numbers')
export class GroupCollectorController {
  constructor(
    private readonly groupService: GroupService,
    private readonly sessionService: SessionService,
  ) {}

  @Get('collect')
  @ApiOperation({ summary: 'Collect all groups with member counts' })
  @ApiResponse({ status: 200, type: [Object] })
  async collectGroups(@Param('sessionId') sessionId: string) {
    const groups = await this.groupService.getGroups(sessionId);
    const result = await Promise.all(
      groups.map(async (g: any) => {
        try {
          const info = await this.groupService.getGroupInfo(sessionId, g.id);
          return {
            groupId: g.id,
            groupName: g.name,
            memberCount: info.participants?.length || 0,
            admins: info.participants?.filter((p: any) => p.isAdmin || p.isSuperAdmin).length || 0,
            phones: info.participants?.map((p: any) => p.id) || [],
          };
        } catch (e) {
          return { groupId: g.id, groupName: g.name, error: 'unavailable' };
        }
      })
    );
    return result.filter((r: any) => r.error === undefined);
  }

  @Get(':groupId/phone-numbers')
  @ApiOperation({ summary: 'Get group members with CSV/JSON export' })
  @ApiResponse({ status: 200, type: [Object] })
  async getGroupMembers(
    @Param('sessionId') sessionId: string,
    @Param('groupId') groupId: string,
    @Query('format') format: 'json' | 'csv' | 'xlsx' = 'json',
    @Query('columns') columns: string = 'id,number,name,isAdmin,isSuperAdmin',
  ) {
    const group = await this.groupService.getGroupInfo(sessionId, groupId);
    const participants = group?.participants || [];
    const phones = participants.map((p: any) => ({
      phone: p.id,
      msisdn: p.number,
      name: p.name || '',
      isAdmin: p.isAdmin ? '1' : '0',
      isSuperAdmin: p.isSuperAdmin ? '1' : '0',
      role: p.isSuperAdmin ? 'super_admin' : (p.isAdmin ? 'admin' : 'member'),
    }));

    if (format === 'csv') {
      const headers = ['id', 'phone', 'msisdn', 'name', 'isAdmin', 'isSuperAdmin', 'role'];
      const rows = phones.map((p: any) => headers.map((h: string) => p[h] ?? '').join(','));
      const csv = [headers.join(','), ...rows.map(r => '"' + r + '"')].join('\n');
      return this.res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="group_members.csv"',
      }).end(csv);
    }

    if (format === 'xlsx') {
      return {
        format: 'xlsx',
        downloadUrl: '/download/xlsx',
        note: 'XLSX requires exceljs library installation'
      };
    }

    return phones;
  }

  @Get('export')
  @ApiOperation({ summary: 'Export ALL groups to CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportAllGroups(@Param('sessionId') sessionId: string) {
    const groups = await this.groupService.getGroups(sessionId);
    const allMembers: any[] = [];
    const groupSummaries = [];

    for (const g of groups) {
      try {
        const info = await this.groupService.getGroupInfo(sessionId, g.id);
        const members = info?.participants || [];
        for (const p of members) {
          allMembers.push({
            groupId: g.id,
            groupName: g.name,
            phone: p.id,
            msisdn: p.number,
            name: p.name || '',
            isAdmin: p.isAdmin ? '1' : '0',
            isSuperAdmin: p.isSuperAdmin ? '1' : '0',
            role: p.isSuperAdmin ? 'super_admin' : (p.isAdmin ? 'admin' : 'member'),
          });
        }
        groupSummaries.push({
          groupId: g.id,
          groupName: g.name,
          memberCount: members.length,
        });
      } catch (e) {
        // skip groups that failed
      }
    }

    const headers = ['groupId', 'groupName', 'phone', 'msisdn', 'name', 'isAdmin', 'isSuperAdmin', 'role'];
    const csvLines = [
      headers.join(','),
      ...allMembers.map((p: any) =>
        headers.map((h: string) => '"' + (p[h] ?? '') + '"').join(',')
      )
    ];
    const csv = csvLines.join('\n');

    return this.res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="openwa-groups-members.csv"',
    }).end(csv);
  }
}
