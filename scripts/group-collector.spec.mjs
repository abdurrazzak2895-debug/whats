import assert from 'node:assert/strict';
import test from 'node:test';
import { groupMemberRows, membersCsv } from '../src/modules/group/group-collector.util.ts';

test('export preserves phone digits and does not misidentify LIDs', () => {
  const rows = groupMemberRows({
    id: '1@g.us',
    name: 'Test',
    participants: [
      { id: '8801700000000@c.us', number: '8801700000000', isAdmin: true, isSuperAdmin: false },
      { id: '999@lid', number: '999', isAdmin: false, isSuperAdmin: true },
    ],
  });
  assert.equal(rows[0].phone, '8801700000000');
  assert.equal(rows[0].role, 'admin');
  assert.equal(rows[1].phone, '');
  assert.equal(rows[1].id, '999@lid');
  assert.equal(rows[1].role, 'super_admin');
});

test('CSV escapes each cell and protects spreadsheet formulas', () => {
  const rows = groupMemberRows({
    id: '1@g.us',
    name: 'Team, "A"\nNext',
    participants: [{ id: '123@c.us', number: '123', name: '=1+1', isAdmin: false, isSuperAdmin: false }],
  });
  const csv = membersCsv(rows);
  assert.ok(csv.includes('"Team, ""A""\nNext"'));
  assert.ok(csv.includes("'=1+1"));
  assert.ok(csv.endsWith('\r\n'));
  for (const name of ['+cmd', '-cmd', '@cmd', '\tcmd', '\rcmd', '\ncmd', '  =1+1']) {
    assert.ok(membersCsv([{ ...rows[0], name }]).includes(`'${name}`));
  }
});

test('empty exports contain a valid header', () => {
  assert.equal(membersCsv([]), 'groupId,groupName,id,phone,name,isAdmin,isSuperAdmin,role\r\n');
});
