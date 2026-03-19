// Conversations Page - View all customer chats from storefront
import React from 'react';
// Use the safe version that won't crash
import { ConversationsViewerSafe } from '../components/dashboard/ConversationsViewerSafe';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ConversationsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold">Customer Conversations</h1>
                <p className="text-sm text-gray-600">View and manage chats from your online store</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conversations Viewer - Using safe version */}
      <div className="h-[calc(100vh-64px)]">
        <ConversationsViewerSafe />
      </div>
    </div>
  );
}