/**
 * Collapsible Card Component
 * Used for grouping widgets in calm mode
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { usePreferences } from '../../contexts/PreferencesContext';
import './CollapseCard.css';

interface CollapseCardProps {
  title: string;
  id: string;
  defaultCollapsed?: boolean;
  rightAdornment?: React.ReactNode;
  children: React.ReactNode;
  onToggle?: (isCollapsed: boolean) => void;
}

export const CollapseCard: React.FC<CollapseCardProps> = ({
  title,
  id,
  defaultCollapsed = false,
  rightAdornment,
  children,
  onToggle
}) => {
  const { calmMode, collapsed, setCollapsed } = usePreferences();
  const [isCollapsed, setIsCollapsed] = useState(
    collapsed[id] ?? defaultCollapsed
  );

  useEffect(() => {
    const shouldCollapse = calmMode &&
      collapsed[id] === undefined ? true :
      collapsed[id] ?? defaultCollapsed;
    setIsCollapsed(shouldCollapse);
  }, [calmMode, collapsed, id, defaultCollapsed]);

  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    setCollapsed(id, newState);
    onToggle?.(newState);
  };

  return (
    <div className="collapseCard">
      <div
        className="collapseHeader"
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        <div className="collapseHeaderLeft">
          <span className="chevron">
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
          </span>
          <h3>{title}</h3>
        </div>
        {rightAdornment && <div className="collapseHeaderRight">{rightAdornment}</div>}
      </div>
      <div className={`collapseBody ${isCollapsed ? 'collapsed' : ''}`}>
        {children}
      </div>
    </div>
  );
};
