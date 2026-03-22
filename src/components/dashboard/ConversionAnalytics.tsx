import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  MessageCircle,
  Zap,
  Target,
  Award
} from 'lucide-react';

interface ConversionMetrics {
  totalUsers: number;
  freeUsers: number;
  paidUsers: number;
  conversionRate: number;
  monthlyRevenue: number;
  averageRevenuePerUser: number;
  chatUsageRate: number;
  upgradesByTier: {
    starter: number;
    pro: number;
    business: number;
    enterprise: number;
  };
  dailyStats: Array<{
    date: string;
    signups: number;
    upgrades: number;
    chats: number;
    revenue: number;
  }>;
  cachePerformance: {
    totalCached: number;
    cacheHitRate: number;
    monthlySavings: number;
  };
}

export default function ConversionAnalytics() {
  const [metrics, setMetrics] = useState<ConversionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadMetrics();
  }, [timeRange]);

  const loadMetrics = async () => {
    try {
      setLoading(true);

      // Get user metrics
      const { data: userStats } = await supabase.rpc('get_conversion_metrics', {
        p_time_range: timeRange
      });

      // Get cache performance
      const { data: cacheStats } = await supabase
        .from('cache_performance')
        .select('*')
        .single();

      // Calculate metrics
      const totalUsers = userStats?.total_users || 0;
      const freeUsers = userStats?.free_users || 0;
      const paidUsers = userStats?.paid_users || 0;
      const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;

      // Calculate monthly revenue based on tier distribution
      const starterRevenue = (userStats?.starter_users || 0) * 5000;
      const proRevenue = (userStats?.pro_users || 0) * 10000;
      const businessRevenue = (userStats?.business_users || 0) * 20000;
      const enterpriseRevenue = (userStats?.enterprise_users || 0) * 50000;
      const monthlyRevenue = starterRevenue + proRevenue + businessRevenue + enterpriseRevenue;

      const averageRevenuePerUser = paidUsers > 0 ? monthlyRevenue / paidUsers : 0;

      // Calculate cache savings (40% of what would have been spent)
      const totalChats = userStats?.total_chats || 0;
      const cachedChats = cacheStats?.total_hits || 0;
      const costPerChat = 0.02; // Approximate cost per GPT-4o-mini chat
      const monthlySavings = cachedChats * costPerChat;

      setMetrics({
        totalUsers,
        freeUsers,
        paidUsers,
        conversionRate,
        monthlyRevenue,
        averageRevenuePerUser,
        chatUsageRate: userStats?.chat_usage_rate || 0,
        upgradesByTier: {
          starter: userStats?.starter_users || 0,
          pro: userStats?.pro_users || 0,
          business: userStats?.business_users || 0,
          enterprise: userStats?.enterprise_users || 0,
        },
        dailyStats: userStats?.daily_stats || [],
        cachePerformance: {
          totalCached: cacheStats?.total_cached || 0,
          cacheHitRate: cacheStats?.avg_hits_per_query || 0,
          monthlySavings,
        },
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const tierData = [
    { name: 'Free', value: metrics.freeUsers, color: '#94a3b8' },
    { name: 'Starter', value: metrics.upgradesByTier.starter, color: '#10b981' },
    { name: 'Pro', value: metrics.upgradesByTier.pro, color: '#3b82f6' },
    { name: 'Business', value: metrics.upgradesByTier.business, color: '#8b5cf6' },
    { name: 'Enterprise', value: metrics.upgradesByTier.enterprise, color: '#f59e0b' },
  ];

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Conversion Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Track user upgrades and revenue performance</p>
        </div>

        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map(range => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className={timeRange === range ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
            <div className="text-sm text-gray-600">
              {metrics.paidUsers} paid ({metrics.conversionRate.toFixed(1)}% conversion)
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Monthly Revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.monthlyRevenue)}</div>
            <div className="text-sm text-gray-600">
              ARPU: {formatCurrency(metrics.averageRevenuePerUser)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              AI Chat Usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.chatUsageRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">
              Active chat users
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Cache Savings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.cachePerformance.monthlySavings)}</div>
            <div className="text-sm text-gray-600">
              {metrics.cachePerformance.cacheHitRate.toFixed(1)}% hit rate
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Distribution by Tier</CardTitle>
            <CardDescription>Current subscription breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tierData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tierData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Activity Trends</CardTitle>
            <CardDescription>Signups, upgrades, and chat usage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="signups" stroke="#10b981" name="Signups" />
                <Line type="monotone" dataKey="upgrades" stroke="#3b82f6" name="Upgrades" />
                <Line type="monotone" dataKey="chats" stroke="#f59e0b" name="Chats" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Tier</CardTitle>
          <CardDescription>Monthly revenue contribution from each subscription tier</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={[
                { tier: 'Starter', revenue: metrics.upgradesByTier.starter * 5000, users: metrics.upgradesByTier.starter },
                { tier: 'Pro', revenue: metrics.upgradesByTier.pro * 10000, users: metrics.upgradesByTier.pro },
                { tier: 'Business', revenue: metrics.upgradesByTier.business * 20000, users: metrics.upgradesByTier.business },
                { tier: 'Enterprise', revenue: metrics.upgradesByTier.enterprise * 50000, users: metrics.upgradesByTier.enterprise },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tier" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" name="Revenue (₦)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>User journey from free to paid tiers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Visitors → Free Users</span>
                <span className="text-sm text-gray-600">100%</span>
              </div>
              <Progress value={100} className="h-3 bg-gray-200" />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Free Users → Active Chat Users</span>
                <span className="text-sm text-gray-600">{metrics.chatUsageRate.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.chatUsageRate} className="h-3 bg-gray-200" />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Active Chat → Paid Users</span>
                <span className="text-sm text-gray-600">{metrics.conversionRate.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.conversionRate} className="h-3 bg-gray-200" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Optimization Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {metrics.conversionRate < 5 && (
            <div className="flex items-start gap-3">
              <Award className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium">Improve Conversion Rate</p>
                <p className="text-sm text-gray-600">
                  Current rate is {metrics.conversionRate.toFixed(1)}%. Target 5-10% by:
                  • Adding more value to free tier (attract more users)
                  • Clearer upgrade CTAs in chat responses
                  • Time-limited upgrade offers
                </p>
              </div>
            </div>
          )}

          {metrics.cachePerformance.cacheHitRate < 40 && (
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Increase Cache Hit Rate</p>
                <p className="text-sm text-gray-600">
                  Current hit rate is {metrics.cachePerformance.cacheHitRate.toFixed(1)}%.
                  Pre-populate more common queries to reach 40%+ hit rate.
                </p>
              </div>
            </div>
          )}

          {metrics.chatUsageRate < 30 && (
            <div className="flex items-start gap-3">
              <MessageCircle className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <p className="font-medium">Boost AI Chat Engagement</p>
                <p className="text-sm text-gray-600">
                  Only {metrics.chatUsageRate.toFixed(1)}% of users use AI chat.
                  Add more prominent chat widget placement and proactive help offers.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}