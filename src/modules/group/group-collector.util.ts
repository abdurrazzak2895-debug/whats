import type { GroupInfo } from '../../engine/interfaces/whatsapp-engine.interface';

export function groupMemberRows(group: GroupInfo) {
  return group.participants.map(p => ({
    groupId: group.id,
    groupName: group.name,
    id: p.id,
    // LID digits are opaque identifiers, never an MSISDN.
    phone: /^(\d+)@(?:c\.us|s\.whatsapp\.net)$/.exec(p.id)?.[1] ?? '',
    name: p.name ?? '',
    isAdmin: p.isAdmin,
    isSuperAdmin: p.isSuperAdmin,
    role: p.isSuperAdmin ? 'super_admin' : p.isAdmin ? 'admin' : 'member',
  }));
}

export function membersCsv(rows: ReturnType<typeof groupMemberRows>): string {
  const headers = ['groupId', 'groupName', 'id', 'phone', 'name', 'isAdmin', 'isSuperAdmin', 'role'] as const;
  const cell = (value: string | boolean): string => {
    let text = String(value ?? '');
    if (/^[\s]*[=+\-@]|^[\t\r\n]/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.join(','), ...rows.map(row => headers.map(h => cell(row[h])).join(','))].join('\r\n') + '\r\n';
}
