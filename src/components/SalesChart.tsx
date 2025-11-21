/**
 * Sales Trend Chart Component
 * Displays daily sales trends using Chart.js
 */

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SalesChartProps {
  sales: any[];
  days?: number; // Number of days to show (default: 7)
}

export function SalesChart({ sales, days = 7 }: SalesChartProps) {
  const chartData = useMemo(() => {
    // Get last N days
    const today = new Date();
    const dates: string[] = [];
    const salesByDate: Record<string, number> = {};

    // Initialize last N days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      dates.push(dateStr);
      salesByDate[dateStr] = 0;
    }

    // Aggregate sales by date
    sales.forEach(sale => {
      const saleDate = new Date(sale.createdAt || sale.date);
      const dateStr = saleDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

      if (dateStr in salesByDate) {
        // Convert to Naira (from kobo)
        const amount = (sale.sellKobo || 0) * (sale.qty || 0) / 100;
        salesByDate[dateStr] += amount;
      }
    });

    // Prepare chart data
    const values = dates.map(date => salesByDate[date]);

    return {
      labels: dates,
      datasets: [
        {
          label: 'Daily Sales (₦)',
          data: values,
          borderColor: '#00894F',
          backgroundColor: 'rgba(0, 137, 79, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#00894F',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        },
      ],
    };
  }, [sales, days]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (context: any) => {
            return `₦${context.parsed.y.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => `₦${value.toLocaleString()}`,
          color: '#6b7280',
          font: {
            size: 11,
          },
        },
        grid: {
          color: '#f3f4f6',
          drawBorder: false,
        },
      },
      x: {
        ticks: {
          color: '#6b7280',
          font: {
            size: 11,
          },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  const totalSales = chartData.datasets[0].data.reduce((sum, val) => sum + val, 0);
  const avgDaily = totalSales / days;

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 700,
          color: '#1f2937',
          marginBottom: '4px'
        }}>
          Sales Trend
        </h3>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
          Last {days} days
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{
          padding: '12px',
          background: '#f9fafb',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
            Total Sales
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#00894F' }}>
            ₦{totalSales.toLocaleString()}
          </div>
        </div>
        <div style={{
          padding: '12px',
          background: '#f9fafb',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
            Daily Average
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#3b82f6' }}>
            ₦{Math.round(avgDaily).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: '200px' }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
