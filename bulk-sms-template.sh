#!/bin/bash
# OpenWA Bulk SMS Sender with Template Support
API="https://app.choice-pc-sv.xyz"
API_KEY="owa_k1_f1bd7dbf4bc5f23236d7becaa755f78f94653debac4f37bb0c52e1bf9d9b9ef3"
SESSION_ID="0d913303-1724-4b4c-be39-402cfd302c61"

echo "=== Session Check ==="
STATUS=$(curl -s -H "Authorization: Bearer $API_KEY" "$API/api/sessions/$SESSION_ID" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null)
echo "Status: $STATUS"
if [ "$STATUS" != "ready" ]; then
    echo "ERROR: Session not ready. Scan QR code first."
    exit 1
fi
echo "Session READY"
echo ""

# ============================================================================
# BULK SMS WITH TEMPLATE VARIABLES
# ============================================================================
TEMPLATE="Hello {{name}}! Your verification code is {{code}}. Sent from OpenWA Bangladesh."
echo "Template: $TEMPLATE"

# Recipients: phone|name|code (max 100 per batch)
RECIPIENTS="8801616303097|Rahman|1234
8801778300054|Admin|5678"

echo "Recipients:"
IFS=$'\n'
LINE_NUM=0
for LINE in $RECIPIENTS; do
    [ -z "$LINE" ] && continue
    LINE_NUM=$((LINE_NUM + 1))
    PHONE=$(echo "$LINE" | cut -d'|' -f1 | xargs)
    NAME=$(echo "$LINE" | cut -d'|' -f2 | xargs)
    CODE=$(echo "$LINE" | cut -d'|' -f3 | xargs)
    RENDERED=$(echo "$TEMPLATE" | sed "s/{{name}}/$NAME/g; s/{{code}}/$CODE/g")
    echo "  $LINE_NUM) $PHONE | $NAME | $CODE -> $RENDERED"
done
echo ""

# Build JSON payload using Python
BATCH_ID="bulk_$(date +%s)"

python3 << PYEOF
import json

items = []
for LINE in """$RECIPIENTS""".strip().split('\\n'):
    if not LINE.strip():
        continue
    PHONE, NAME, CODE = [x.strip() for x in LINE.split('|')]
    RENDERED = """$TEMPLATE""".replace('{{name}}', NAME).replace('{{code}}', CODE)
    item = {
        'chatId': f'{PHONE}@c.us',
        'type': 'text',
        'content': {'text': RENDERED},
        'variables': {'name': NAME, 'code': CODE}
    }
    items.append(item)

payload = {
    'batchId': '$BATCH_ID',
    'messages': items
}

with open('/tmp/bulk_payload.json', 'w') as f:
    json.dump(payload, f, indent=2)
print('Payload written.')
PYEOF

echo ""
echo "Payload preview:"
cat /tmp/bulk_payload.json | python3 -m json.tool

echo ""
echo "Sending batch..."
BULK_RESP=$(curl -s -X POST "$API/api/sessions/$SESSION_ID/messages/send-bulk" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  --data @/tmp/bulk_payload.json)

echo "$BULK_RESP" | python3 -m json.tool 2>/dev/null || echo "$BULK_RESP"

BATCH_ID_RETURNED=$(echo "$BULK_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('batchId',''))" 2>/dev/null)
echo ""
echo "Batch ID: $BATCH_ID_RETURNED"
echo ""
echo "Status URL: $API/api/sessions/$SESSION_ID/messages/batch/$BATCH_ID_RETURNED"
