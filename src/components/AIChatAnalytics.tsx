import React, { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  Zap,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface UsageData {
  chatCount: number;
  tierLimit: number;
  tierName: string;
  remaining: number;
  percentageUsed: number;
}

interface DailyStats {
  date: string;
  totalChats: number;
  uniqueUsers: number;
  cacheHits: number;
  cacheHitRate: number;
}

interface TierBreakdown {
  tierName: string;
  userCount: number;
  totalChats: number;
  avgChatsPerUser: number;
}

export function AIChatAnalytics() {
  const [loading, setLoading] = useState(true);
  const [currentUsage, setCurrentUsage] = useState<UsageData | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [tierBreakdown, setTierBreakdown] = useState<TierBreakdown[]>([]);
  const [totalMonthlyChats, setTotalMonthlyChats] = useState(0);
  const [totalUniqueUsers, setTotalUniqueUsers] = useState(0);
  const [avgResponseTime, setAvgResponseTime] = useState(0);
  const [cacheEfficiency, setCacheEfficiency] = useState(0);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error('No user found');
        return;
      }

      // Fetch current user's usage
      const { data: usage } = await supabase
        .rpc('get_ai_chat_usage', { p_user_id: user.id });

      if (usage && usage.length > 0) {
        setCurrentUsage({
          chatCount: usage[0].chat_count,
          tierLimit: usage[0].tier_limit,
          tierName: 'Current',
          remaining: usage[0].remaining,
          percentageUsed: usage[0].percentage_used
        });
      }

      // Fetch daily stats for the current month
      const startDate = startOfMonth(new Date());
      const endDate = endOfMonth(new Date());

      const { data: stats } = await supabase
        .from('ai_chat_daily_stats')
        .select('*')
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .order('date', { ascending: false });

      if (stats) {
        setDailyStats(stats);

        // Calculate totals
        const totalChats = stats.reduce((sum, day) => sum + day.total_chats, 0);
        setTotalMonthlyChats(totalChats);

        const uniqueUsers = new Set(stats.map(s => s.unique_users)).size;
        setTotalUniqueUsers(uniqueUsers);

        const avgCacheRate = stats.reduce((sum, day) => sum + (day.cache_hit_rate || 0), 0) / stats.length;
        setCacheEfficiency(avgCacheRate);
      }

      // Fetch tier breakdown
      const { data: tierData } = await supabase
        .from('ai_chat_usage')
        .select('tier_name, chat_count, user_id')
        .gte('period_start', startDate.toISOString());

      if (tierData) {
        const breakdown = tierData.reduce((acc: any, item) => {
          const tier = item.tier_name;
          if (!acc[tier]) {
            acc[tier] = { tierName: tier, userCount: 0, totalChats: 0, users: new Set() };
          }
          acc[tier].users.add(item.user_id);
          acc[tier].totalChats += item.chat_count;
          return acc;
        }, {});

        const processedBreakdown = Object.values(breakdown).map((tier: any) => ({
          tierName: tier.tierName,
          userCount: tier.users.size,
          totalChats: tier.totalChats,
          avgChatsPerUser: Math.round(tier.totalChats / tier.users.size)
        }));

        setTierBreakdown(processedBreakdown);
      }

      // Fetch average response time
      const { data: responseData } = await supabase
        .from('ai_chat_analytics')
        .select('response_time_ms')
        .eq('event_type', 'chat_completion')
        .gte('created_at', startDate.toISOString());

      if (responseData && responseData.length > 0) {
        const avgTime = responseData.reduce((sum, r) => sum + (r.response_time_ms || 0), 0) / responseData.length;
        setAvgResponseTime(Math.round(avgTime));
      }

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">AI Chat Analytics</h2>
        <p className="text-muted-foreground">Monitor usage, performance, and trends</p>
      </div>

      {/* Current Usage Card */}
      {currentUsage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Your Monthly Usage
            </CardTitle>
            <CardDescription>
              {format(new Date(), 'MMMM yyyy')} - {currentUsage.tierName} Tier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">
                    {currentUsage.chatCount} / {currentUsage.tierLimit} chats used
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {currentUsage.remaining} remaining
                  </span>
                </div>
                <Progress value={currentUsage.percentageUsed} className="h-2" />
              </div>
              {currentUsage.percentageUsed > 80 && (
                <div className="flex items-center gap-2 text-warning">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    You've used {currentUsage.percentageUsed}% of your monthly limit
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Chats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMonthlyChats}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUniqueUsers}</div>
            <p className="text-xs text-muted-foreground">Active this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">Average speed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cache Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cacheEfficiency.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Hit rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Daily Trends</TabsTrigger>
          <TabsTrigger value="tiers">Tier Breakdown</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Daily Usage Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dailyStats.slice(0, 7).map((day) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {format(new Date(day.date), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {day.uniqueUsers} users
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{day.totalChats} chats</div>
                      <div className="text-xs text-muted-foreground">
                        {day.cacheHitRate.toFixed(1)}% cached
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Usage by Tier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tierBreakdown.map((tier) => (
                  <div key={tier.tierName} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{tier.tierName}</span>
                      <span className="text-sm text-muted-foreground">
                        {tier.userCount} users
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total: {tier.totalChats} chats</span>
                      <span>Avg: {tier.avgChatsPerUser} per user</span>
                    </div>
                    <Progress
                      value={(tier.totalChats / totalMonthlyChats) * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Response Time</div>
                    <div className="text-xl font-semibold">{avgResponseTime}ms</div>
                    <div className="text-xs text-green-600">
                      {avgResponseTime < 1000 ? 'Excellent' : avgResponseTime < 2000 ? 'Good' : 'Needs Optimization'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Cache Hit Rate</div>
                    <div className="text-xl font-semibold">{cacheEfficiency.toFixed(1)}%</div>
                    <div className="text-xs text-green-600">
                      {cacheEfficiency > 30 ? 'Great' : 'Can Improve'}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Cost Savings from Caching</h4>
                  <div className="text-2xl font-bold text-green-600">
                    ₦{((totalMonthlyChats * (cacheEfficiency / 100)) * 0.89).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Saved this month by serving cached responses
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Optimization Tips</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {avgResponseTime > 2000 && (
                      <li>• Consider implementing more aggressive caching</li>
                    )}
                    {cacheEfficiency < 20 && (
                      <li>• Many unique queries - consider FAQ detection</li>
                    )}
                    {totalMonthlyChats > 1000 && (
                      <li>• High volume - monitor costs closely</li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}