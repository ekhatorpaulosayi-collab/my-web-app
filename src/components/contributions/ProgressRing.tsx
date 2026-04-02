import React from 'react';

interface ProgressRingProps {
  progress: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  amountCollected?: string;
  totalAmount?: string;
  showLabel?: boolean;
  membersPaid?: number;
  totalMembers?: number;
  isComplete?: boolean;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 8,
  amountCollected,
  totalAmount,
  showLabel = true,
  membersPaid,
  totalMembers,
  isComplete = false
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const centerX = size / 2;
  const centerY = size / 2;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative'
    }}>
      {/* SVG Progress Ring */}
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background Circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          stroke="#f3f4f6"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress Circle with Gradient */}
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isComplete ? "#f59e0b" : "#10b981"} />
            <stop offset="100%" stopColor={isComplete ? "#dc2626" : "#059669"} />
          </linearGradient>
        </defs>

        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          stroke={isComplete ? "#fbbf24" : "url(#progressGradient)"}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 0.6s ease-out, stroke 0.3s ease',
            filter: isComplete ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))' : 'none',
            animation: isComplete ? 'pulseGlow 2s ease-in-out infinite' : 'none'
          }}
        />
      </svg>

      {/* Center Text */}
      {(amountCollected || totalAmount) && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          {amountCollected && (
            <div style={{
              fontSize: size > 100 ? '20px' : '16px',
              fontWeight: 700,
              color: '#1f2937',
              fontFeatureSettings: '"tnum"',
              fontVariantNumeric: 'tabular-nums'
            }}>
              {amountCollected}
            </div>
          )}
          {totalAmount && (
            <div style={{
              fontSize: size > 100 ? '14px' : '12px',
              color: '#6b7280',
              marginTop: '2px'
            }}>
              of {totalAmount}
            </div>
          )}
        </div>
      )}

      {/* Label Below */}
      {showLabel && membersPaid !== undefined && totalMembers !== undefined && (
        <div style={{
          marginTop: '8px',
          fontSize: '13px',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          {membersPaid} of {totalMembers} members paid
        </div>
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes pulseGlow {
          0% {
            filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.4));
          }
          50% {
            filter: drop-shadow(0 0 16px rgba(251, 191, 36, 0.6));
          }
          100% {
            filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.4));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.001s !important;
            transition-duration: 0.001s !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ProgressRing;