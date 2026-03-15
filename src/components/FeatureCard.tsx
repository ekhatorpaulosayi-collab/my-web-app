/**
 * FeatureCard Component
 *
 * Reusable card for promoting features on the dashboard
 */

import React from 'react';
import './FeatureCard.css';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  ctaText: string;
  ctaAction: () => void;
  badge?: string;
  badgeColor?: 'green' | 'blue' | 'purple' | 'gold';
  stats?: string;
  gradient?: 'green' | 'blue' | 'purple' | 'gold';
}

export function FeatureCard({
  title,
  description,
  icon,
  ctaText,
  ctaAction,
  badge,
  badgeColor = 'blue',
  stats,
  gradient = 'blue'
}: FeatureCardProps) {
  return (
    <div className={`feature-card feature-card--${gradient}`}>
      {badge && (
        <div className={`feature-card__badge feature-card__badge--${badgeColor}`}>
          {badge}
        </div>
      )}

      <div className="feature-card__icon">
        {icon}
      </div>

      <div className="feature-card__content">
        <h3 className="feature-card__title">{title}</h3>
        <p className="feature-card__description">{description}</p>

        {stats && (
          <p className="feature-card__stats">{stats}</p>
        )}
      </div>

      <button
        className="feature-card__cta"
        onClick={ctaAction}
      >
        {ctaText}
      </button>
    </div>
  );
}
