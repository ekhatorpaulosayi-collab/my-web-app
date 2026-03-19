// Simple Conversations Viewer - Works without database views
import React from 'react';
import { MessageCircle, AlertCircle, Settings } from 'lucide-react';

export function ConversationsViewerSimple() {
  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Icon */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full">
              <MessageCircle className="h-10 w-10 text-blue-600" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold mb-4">Customer Conversations</h2>

          {/* Status Message */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-left">
                <p className="text-amber-800 font-medium mb-2">Setup Required</p>
                <p className="text-amber-700 text-sm">
                  To enable customer chat tracking, you need to run a database migration.
                  This will allow you to see all conversations from your online store visitors.
                </p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 rounded-lg p-6 text-left mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              How to Enable Chat Tracking:
            </h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="font-semibold">1.</span>
                <span>Go to your Supabase dashboard</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">2.</span>
                <span>Navigate to SQL Editor</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">3.</span>
                <span>Run the migration script from: <code className="bg-gray-200 px-1 rounded">fix-storefront-visibility.sql</code></span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">4.</span>
                <span>Update your Edge Function with the fixed chat handler</span>
              </li>
            </ol>
          </div>

          {/* Benefits */}
          <div className="border-t pt-6">
            <p className="text-sm text-gray-600 mb-3">Once enabled, you'll be able to:</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <span className="text-green-500">✓</span>
                <span>See all visitor conversations</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span className="text-green-500">✓</span>
                <span>Track customer inquiries</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span className="text-green-500">✓</span>
                <span>Get real-time notifications</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span className="text-green-500">✓</span>
                <span>Improve sales conversion</span>
              </div>
            </div>
          </div>

          {/* Temporary Message */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>Coming Soon:</strong> This feature is being rolled out. Your conversations will appear here automatically once the database is updated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}