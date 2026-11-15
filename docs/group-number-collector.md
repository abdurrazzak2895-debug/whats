# Group member collection and CSV export

The collector is registered through the existing GroupModule. All endpoints use
the normal API authentication and session scope. Lists and bulk exports filter
groups through the calling key's chat scope; single-group reads use the group fence.

Under the normal `/api` prefix:

- `GET /api/sessions/:sessionId/groups/numbers/collect`: accessible group names,
  participant counts, and administrator counts.
- `GET /api/sessions/:sessionId/groups/numbers/:groupId/phone-numbers`: JSON members.
- Add `?format=csv` to that endpoint for a CSV attachment.
- `GET /api/sessions/:sessionId/groups/numbers/export`: CSV members of all accessible groups.

CSV columns: groupId, groupName, id, phone, name, isAdmin, isSuperAdmin, role.
Each row represents one participant in one group; members in several groups have
several rows. Empty groups contribute no member rows. A privacy ID (`@lid`) is kept
in `id` and has an empty `phone`: its digits are not a phone number. This module
does not attempt to resolve hidden phone numbers. Names depend on engine metadata.

CSV uses CRLF records, standard quote escaping, and apostrophe prefixes for formula
cells. Downloads use a fixed safe filename and `Cache-Control: no-store`.
Unsupported formats return 400. Metadata failures abort the operation rather than
silently returning a partial export. Large exports require memory proportional to
the participant count and perform metadata calls sequentially.

Run the focused serialization tests using Node 22.19+:

```sh
node --experimental-strip-types --test scripts/group-collector.spec.mjs
```

Validation in the editing environment: backend build passed; three serialization
tests, four controller tests, and fourteen existing authorization checks passed.
Live WhatsApp integration was not verified.
The two legacy root-level GroupCollectorController draft files are not used.
