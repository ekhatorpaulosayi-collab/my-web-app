#!/bin/bash

# Chat Widget Snapshot Script
# Creates a timestamped backup of the working chat widget files

SNAPSHOT_DIR="chat-snapshots"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Create snapshot directory if it doesn't exist
mkdir -p $SNAPSHOT_DIR

# Files to snapshot
echo "📸 Creating snapshot of chat widget files..."

# Core chat widget file
cp src/components/AIChatWidget.tsx "$SNAPSHOT_DIR/AIChatWidget-$TIMESTAMP.tsx"
echo "✅ Saved AIChatWidget.tsx"

# WhatsApp fallback timer
cp src/components/chat/WhatsAppFallbackTimer.tsx "$SNAPSHOT_DIR/WhatsAppFallbackTimer-$TIMESTAMP.tsx" 2>/dev/null && echo "✅ Saved WhatsAppFallbackTimer.tsx"

# Owner notification components
cp src/components/dashboard/OwnerNotificationManager.tsx "$SNAPSHOT_DIR/OwnerNotificationManager-$TIMESTAMP.tsx" 2>/dev/null && echo "✅ Saved OwnerNotificationManager.tsx"
cp src/services/ownerNotificationService.ts "$SNAPSHOT_DIR/ownerNotificationService-$TIMESTAMP.ts" 2>/dev/null && echo "✅ Saved ownerNotificationService.ts"

# Edge function
cp supabase/functions/ai-chat/index.ts "$SNAPSHOT_DIR/ai-chat-edge-function-$TIMESTAMP.ts" 2>/dev/null && echo "✅ Saved edge function"

# Create a manifest file
cat > "$SNAPSHOT_DIR/snapshot-$TIMESTAMP.txt" <<EOF
Chat Widget Snapshot
Created: $(date)
Version: Production-ready (debug code removed)

Files included:
- AIChatWidget.tsx
- WhatsAppFallbackTimer.tsx (if exists)
- OwnerNotificationManager.tsx (if exists)
- ownerNotificationService.ts (if exists)
- ai-chat edge function (if exists)

Features in this snapshot:
- Polling-based message fetching (3s interval)
- Message deduplication with UUID
- Mobile clock skew handling
- WhatsApp fallback timer
- Owner notification system
- Business hours awareness
- Human takeover flow
- Debug code removed

To restore from this snapshot:
cp $SNAPSHOT_DIR/AIChatWidget-$TIMESTAMP.tsx src/components/AIChatWidget.tsx
# Restore other files as needed
EOF

echo "📝 Created manifest: snapshot-$TIMESTAMP.txt"
echo ""
echo "🎉 Snapshot complete! Files saved to $SNAPSHOT_DIR/"
echo "📂 Snapshot ID: $TIMESTAMP"