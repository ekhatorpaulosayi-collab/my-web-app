import React from 'react';
import { AIChatAnalytics } from '@/components/AIChatAnalytics';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';

export default function AIChatAnalyticsPage() {
  const navigate = useNavigate();

  const handleExport = async () => {
    // Export analytics data to CSV
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch data and create CSV
      const startDate = new Date();
      startDate.setDate(1);

      const { data: analytics } = await supabase
        .from('ai_chat_analytics')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (analytics) {
        const csv = [
          ['Date', 'Event Type', 'Context', 'Response Time (ms)', 'Tokens Used', 'Cache Hit'],
          ...analytics.map(row => [
            new Date(row.created_at).toLocaleString(),
            row.event_type,
            row.context_type,
            row.response_time_ms || 0,
            row.tokens_used || 0,
            row.cache_hit ? 'Yes' : 'No'
          ])
        ].map(row => row.join(',')).join('\n');

        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-chat-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Analytics Component */}
        <AIChatAnalytics />

        {/* Footer Info */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">Understanding Your AI Analytics</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <strong>Usage Tracking:</strong> Monitor how many AI chats are being used across all tiers.
            </div>
            <div>
              <strong>Cache Efficiency:</strong> Higher cache rates mean lower costs and faster responses.
            </div>
            <div>
              <strong>Response Times:</strong> Track performance to ensure users get quick responses.
            </div>
            <div>
              <strong>Cost Optimization:</strong> Each cached response saves ₦0.89 in OpenAI costs.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}