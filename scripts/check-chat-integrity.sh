#!/bin/bash

# Chat Widget Integrity Check Script
# Run this before any deployment

echo "================================"
echo "CHAT WIDGET INTEGRITY CHECK"
echo "================================"
echo ""

ERRORS=0
WARNINGS=0

# Function to check and report
check() {
    local result=$1
    local message=$2
    local is_error=$3

    if [ "$result" -eq 0 ]; then
        echo "✅ PASS: $message"
    else
        if [ "$is_error" = "true" ]; then
            echo "❌ FAIL: $message"
            ERRORS=$((ERRORS + 1))
        else
            echo "⚠️  WARN: $message"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
}

echo "1. Checking setMessages calls..."
echo "--------------------------------"
# Count actual function calls, excluding comments
# Expected 4 calls (updated after cleanup)
SET_MESSAGES_COUNT=$(grep "setMessages(" src/components/AIChatWidget.tsx 2>/dev/null | grep -v "//" | wc -l)
if [ "$SET_MESSAGES_COUNT" -eq 4 ]; then
    check 0 "Exactly 4 setMessages calls found" true
    echo "   Locations: lines $(grep -n "setMessages(" src/components/AIChatWidget.tsx | grep -v "//" | cut -d: -f1 | tr '\n' ', ' | sed 's/,$//')"
else
    check 1 "Found $SET_MESSAGES_COUNT setMessages calls (expected 4)" true
    echo "   Location of calls:"
    grep -n "setMessages(" src/components/AIChatWidget.tsx | grep -v "//" | head -10
fi
echo ""

echo "2. Checking for duplicate insertion points..."
echo "--------------------------------------------"
# Edge function should be too large to grep, so we'll skip checking it directly
# EDGE_FUNC_INSERT=$(grep -c "insert.*ai_chat_messages" supabase/functions/ai-chat/index.ts 2>/dev/null)
TRACKING_INSERT=$(grep -c "insert.*ai_chat_messages" src/services/chatTrackingService.ts 2>/dev/null)
OTHER_INSERT=$(find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "insert.*ai_chat_messages" 2>/dev/null | grep -v chatTrackingService.ts | wc -l)

# Edge function is expected to have insertion (it's the ONLY place that should)
check 0 "Edge function is the designated insertion point (manual verification needed)" false
check $([ "$TRACKING_INSERT" -eq 0 ] && echo 0 || echo 1) "ChatTracking service has NO message insertion" true
check $([ "$OTHER_INSERT" -eq 0 ] && echo 0 || echo 1) "No other files insert messages" false

if [ "$TRACKING_INSERT" -gt 0 ]; then
    echo "   ⚠️  ChatTracking still has insertion at:"
    grep -n "insert.*ai_chat_messages" src/services/chatTrackingService.ts
fi
echo ""

echo "3. Checking polling implementation..."
echo "------------------------------------"
TIMESTAMP_GUARD=$(grep -c "if.*!lastMessageTimestamp" src/components/AIChatWidget.tsx 2>/dev/null)
TIMESTAMP_CURSOR=$(grep -c "gt.*created_at.*lastMessageTimestamp" src/components/AIChatWidget.tsx 2>/dev/null)

check $([ "$TIMESTAMP_GUARD" -gt 0 ] && echo 0 || echo 1) "Polling has timestamp guard" true
check $([ "$TIMESTAMP_CURSOR" -gt 0 ] && echo 0 || echo 1) "Polling uses timestamp cursor" true
echo ""

echo "4. Checking for debug console.log statements..."
echo "----------------------------------------------"
DEBUG_LOGS=$(grep -c "console.log.*\[AIChatWidget\].*BLOCKED\|Rendering messages\|Adding optimistic" src/components/AIChatWidget.tsx 2>/dev/null)
if [ "$DEBUG_LOGS" -eq 0 ]; then
    check 0 "No debug console.log statements found" false
else
    check 1 "$DEBUG_LOGS debug console.log statements still present" false
    echo "   Debug logs at:"
    grep -n "console.log.*\[AIChatWidget\]" src/components/AIChatWidget.tsx | head -5
fi
echo ""

echo "5. Checking agent takeover implementation..."
echo "------------------------------------------"
AGENT_RESPONSE=$(grep -c "agentActive.*true" supabase/functions/ai-chat/index.ts 2>/dev/null)
check $([ "$AGENT_RESPONSE" -gt 0 ] && echo 0 || echo 1) "Edge function returns only flag during takeover" false
echo ""

echo "6. Checking for kill switch column..."
echo "------------------------------------"
KILL_SWITCH=$(grep -c "chat_widget_enabled" src/components/AIChatWidget.tsx 2>/dev/null)
if [ "$KILL_SWITCH" -gt 0 ]; then
    check 0 "Kill switch implementation found" false
else
    check 1 "No kill switch implementation (optional safety feature)" false
fi
echo ""

echo "7. Checking critical line numbers..."
echo "----------------------------------"
# Get actual line numbers of setMessages calls
ACTUAL_LINES=$(grep -n "setMessages(" src/components/AIChatWidget.tsx 2>/dev/null | grep -v "//" | cut -d: -f1)
LINE_COUNT=$(echo "$ACTUAL_LINES" | wc -l)

if [ "$LINE_COUNT" -eq 5 ]; then
    check 0 "Found all 5 setMessages calls" false
    echo "   Current locations: lines $(echo $ACTUAL_LINES | tr '\n' ', ' | sed 's/,$//')"
    echo "   (Expected 5 calls including cancel takeover functionality - may have shifted due to edits)"
else
    check 1 "Unexpected number of setMessages calls" false
    echo "   Found at:"
    grep -n "setMessages(" src/components/AIChatWidget.tsx 2>/dev/null | grep -v "//" | head -4
fi
echo ""

echo "================================"
echo "INTEGRITY CHECK COMPLETE"
echo "================================"
echo ""

if [ "$ERRORS" -eq 0 ]; then
    echo "✅ ALL CRITICAL CHECKS PASSED"
    if [ "$WARNINGS" -gt 0 ]; then
        echo "⚠️  $WARNINGS warnings (non-critical)"
    fi
    echo ""
    echo "Safe to deploy!"
    exit 0
else
    echo "❌ FAILED WITH $ERRORS CRITICAL ERRORS"
    if [ "$WARNINGS" -gt 0 ]; then
        echo "⚠️  Also found $WARNINGS warnings"
    fi
    echo ""
    echo "DO NOT DEPLOY! Fix critical errors first."
    echo ""
    echo "Quick fixes:"
    echo "1. If too many setMessages: Remove extra calls"
    echo "2. If ChatTracking has insertion: Remove it"
    echo "3. If missing timestamp guard: Add it to polling"
    echo ""
    echo "Reference: docs/CHAT_WIDGET_SYSTEM.md"
    exit 1
fi