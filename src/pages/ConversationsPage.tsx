// Conversations Page - Fixed Version with Deduplication and Owner Notifications
import React from 'react';
import ConversationsSimplifiedFixed from '../components/dashboard/ConversationsSimplifiedFixed';
import OwnerNotificationManager from '../components/dashboard/OwnerNotificationManager';

export default function ConversationsPage() {
  return (
    <>
      <OwnerNotificationManager />
      <ConversationsSimplifiedFixed />
    </>
  );
}