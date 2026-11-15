#!/bin/bash
# ============================================================================
# OpenWA Bulk SMS Sender
# ============================================================================
# Prerequisites:
#   1. Scan the QR code (whatsapp-session-qr-code.png) with WhatsApp
#   2. Wait for session status to become "connected"
# ============================================================================

API="https://app.choice-pc-sv.xyz"
API_KEY="owa_k1_f1bd7dbf4bc5f23236d7becaa755f78f94653debac4f37bb0c52e1bf9d9b9ef3"
SESSION_ID="977586df-b7cd-4ef3-bf5b-3b51379485fa"

# ----------------------------------------------------------------------------
# CONFIGURATION - Edit these values
# ----------------------------------------------------------------------------
# Comma-separated list of phone numbers (international format, no +, no spaces)
# Example: "14155550100,14155550101,14155550102"
RECIPIENTS="1234567890,1234567891,1234567892"

# Message to send
MESSAGE="Hello from OpenWA! This is a bulk SMS test message."

# Delay between messages (seconds) - WhatsApp rate limits, so don't go too fast
DELAY=3

# ----------------------------------------------------------------------------
# CHECK SESSION STATUS
# ----------------------------------------------------------------------------
echo "=== Checking session status ==="
STATUS=$(curl -s -H "Authorization: Bearer $API_KEY" "$API/api/sessions/$SESSION_ID" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null)

if [ "$STATUS" != "connected" ]; then
    echo "ERROR: Session is not connected (status: $STATUS)"
    echo ""
    echo "Please scan the QR code (whatsapp-session-qr-code.png) with WhatsApp:"
    echo "  WhatsApp -> Settings -> Linked Devices -> Link a Device"
    echo ""
    echo "Then re-run this script."
    exit 1
fi

echo "Session is CONNECTED. Proceeding with bulk send..."
echo ""

# ----------------------------------------------------------------------------
# SEND BULK MESSAGES
# ----------------------------------------------------------------------------
SUCCESS=0
FAILED=0

IFS=',' read -ra NUMBERS <<< "$RECIPIENTS"
TOTAL=${#NUMBERS[@]}

echo "Sending to $TOTAL recipient(s)..."
echo ""

for i in "${!NUMBERS[@]}"; do
    NUM="${NUMBERS[$i]}"
    # Trim whitespace
    NUM=$(echo "$NUM" | xargs)
    
    # Format: add @c.us suffix if not present
    if [[ "$NUM" != *"@c.us" ]]; then
        TO="${NUM}@c.us"
    else
        TO="$NUM"
    fi
    
    CURRENT=$((i + 1))
    echo "[$CURRENT/$TOTAL] Sending to $TO..."
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API/api/sessions/$SESSION_ID/messages" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"to\":\"$TO\",\"body\":\"$MESSAGE\"}")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        echo "  ✅ Sent successfully"
        SUCCESS=$((SUCCESS + 1))
    else
        echo "  ❌ Failed (HTTP $HTTP_CODE): $BODY"
        FAILED=$((FAILED + 1))
    fi
    
    # Delay between messages (skip delay on last message)
    if [ $CURRENT -lt $TOTAL ]; then
        echo "  Waiting ${DELAY}s..."
        sleep $DELAY
    fi
    echo ""
done

# ----------------------------------------------------------------------------
# SUMMARY
# ----------------------------------------------------------------------------
echo "=========================================="
echo "BULK SMS COMPLETE"
echo "=========================================="
echo "Total:   $TOTAL"
echo "Success: $SUCCESS"
echo "Failed:  $FAILED"
echo "=========================================="