/**
 * Documentation Types
 * Type definitions for Storehouse documentation system
 */

export interface DocStep {
  step: number;
  instruction: string;
  screenshot?: string;
  tip?: string;
  code?: string;
}

export interface CommonIssue {
  issue: string;
  solution: string;
}

export interface Documentation {
  id: string;
  category: 'getting-started' | 'products' | 'sales' | 'staff' | 'reports' | 'settings' | 'troubleshooting' | 'advanced';
  title: string;
  subtitle: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  description: string;
  steps?: DocStep[];
  content?: string; // For non-step-based docs
  commonIssues?: CommonIssue[];
  relatedDocs: string[];
  keywords: string[];
  videoUrl?: string;
  lastUpdated: string;
  priority?: number; // Higher = shown first for new users
}

export interface DocSearchResult {
  doc: Documentation;
  score: number;
  matchedKeywords: string[];
}

export interface AppContext {
  currentPage: string;
  hasProducts: boolean;
  productCount: number;
  hasSales: boolean;
  salesCount: number;
  hasStaff: boolean;
  staffCount: number;
  userPlan: 'FREE' | 'STARTER' | 'BUSINESS';
  accountAge: number; // in days
  isNewUser: boolean; // < 7 days
  hasCompletedOnboarding: boolean;
  recentErrors?: string[];
}
