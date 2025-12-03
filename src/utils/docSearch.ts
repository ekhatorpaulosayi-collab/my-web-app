/**
 * Document Search Utility
 * Intelligent search and ranking for documentation
 */

import { Documentation, DocSearchResult, AppContext } from '../types/documentation';
import { DOCUMENTATION } from '../data/documentation';

/**
 * Calculate similarity score between query and doc keywords
 */
function calculateKeywordScore(query: string, keywords: string[]): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  let score = 0;
  const matchedKeywords: string[] = [];

  keywords.forEach(keyword => {
    const keywordWords = keyword.toLowerCase().split(/\s+/);

    // Exact match: highest score
    if (query.toLowerCase() === keyword.toLowerCase()) {
      score += 100;
      matchedKeywords.push(keyword);
      return;
    }

    // Partial match: Check if query contains keyword or vice versa
    if (query.toLowerCase().includes(keyword.toLowerCase())) {
      score += 50;
      matchedKeywords.push(keyword);
      return;
    }

    if (keyword.toLowerCase().includes(query.toLowerCase())) {
      score += 40;
      matchedKeywords.push(keyword);
      return;
    }

    // Word-by-word matching
    let wordMatches = 0;
    queryWords.forEach(queryWord => {
      if (keywordWords.some(kw => kw.includes(queryWord) || queryWord.includes(kw))) {
        wordMatches++;
      }
    });

    if (wordMatches > 0) {
      score += wordMatches * 10;
      matchedKeywords.push(keyword);
    }
  });

  return score;
}

/**
 * Calculate relevance based on app context
 */
function calculateContextBoost(doc: Documentation, context?: AppContext): number {
  if (!context) return 0;

  let boost = 0;

  // New users get onboarding docs boosted
  if (context.isNewUser && doc.category === 'getting-started') {
    boost += 30;
  }

  // Users with no products get product docs boosted
  if (!context.hasProducts && doc.id === 'add-first-product') {
    boost += 50;
  }

  // Users with products but no sales get sales docs boosted
  if (context.hasProducts && !context.hasSales && doc.category === 'sales') {
    boost += 30;
  }

  // Recent errors boost troubleshooting docs
  if (context.recentErrors && context.recentErrors.length > 0 && doc.category === 'troubleshooting') {
    boost += 40;
  }

  // Priority boost for high-priority docs
  if (doc.priority && doc.priority > 70) {
    boost += 10;
  }

  return boost;
}

/**
 * Search documentation with intelligent ranking
 */
export function searchDocumentation(
  query: string,
  context?: AppContext,
  limit: number = 5
): DocSearchResult[] {
  if (!query || query.trim().length === 0) {
    // Return high-priority onboarding docs if no query
    return DOCUMENTATION
      .filter(doc => (doc.priority || 0) >= 70)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, limit)
      .map(doc => ({
        doc,
        score: doc.priority || 0,
        matchedKeywords: [],
      }));
  }

  const results: DocSearchResult[] = [];

  DOCUMENTATION.forEach(doc => {
    const keywordScore = calculateKeywordScore(query, doc.keywords);
    const contextBoost = calculateContextBoost(doc, context);
    const totalScore = keywordScore + contextBoost;

    if (totalScore > 0) {
      // Find which keywords matched
      const matchedKeywords = doc.keywords.filter(keyword => {
        const keywordLower = keyword.toLowerCase();
        const queryLower = query.toLowerCase();
        return keywordLower.includes(queryLower) || queryLower.includes(keywordLower);
      });

      results.push({
        doc,
        score: totalScore,
        matchedKeywords,
      });
    }
  });

  // Sort by score (highest first) and return top N
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get suggested questions based on context
 */
export function getSuggestedQuestions(context?: AppContext): string[] {
  if (!context) {
    return [
      "How do I add my first product?",
      "How do I record a sale?",
      "What's the difference between cash and credit?",
    ];
  }

  const suggestions: string[] = [];

  // New user suggestions
  if (context.isNewUser) {
    suggestions.push("How do I add my first product?");
    suggestions.push("How do I set up my business information?");
  }

  // No products yet
  if (!context.hasProducts) {
    suggestions.push("How do I add products to my inventory?");
    suggestions.push("Can I import products from Excel?");
  }

  // Has products but no sales
  if (context.hasProducts && !context.hasSales) {
    suggestions.push("How do I record my first sale?");
    suggestions.push("What's the difference between cash and credit sales?");
  }

  // Has sales
  if (context.hasSales) {
    suggestions.push("How do I view my daily profit?");
    suggestions.push("How do I export my sales data?");
  }

  // No staff added
  if (!context.hasStaff) {
    suggestions.push("How do I add staff members?");
    suggestions.push("What are staff permissions?");
  }

  // Always include common questions
  suggestions.push("Why can't I see the edit button?");
  suggestions.push("How do I add payment methods like OPay?");

  // Return up to 6 suggestions
  return suggestions.slice(0, 6);
}

/**
 * Get a single documentation by ID
 */
export function getDocById(docId: string): Documentation | undefined {
  return DOCUMENTATION.find(doc => doc.id === docId);
}

/**
 * Find related documentation
 */
export function getRelatedDocs(currentDocId: string, limit: number = 3): Documentation[] {
  const currentDoc = DOCUMENTATION.find(doc => doc.id === currentDocId);
  if (!currentDoc) return [];

  const relatedDocs = currentDoc.relatedDocs
    .map(id => DOCUMENTATION.find(doc => doc.id === id))
    .filter(Boolean) as Documentation[];

  return relatedDocs.slice(0, limit);
}

/**
 * Extract key information from user question
 */
export function extractQuestionIntent(query: string): {
  intent: 'how-to' | 'what-is' | 'troubleshoot' | 'general';
  keywords: string[];
} {
  const queryLower = query.toLowerCase();

  let intent: 'how-to' | 'what-is' | 'troubleshoot' | 'general' = 'general';

  if (queryLower.match(/how (do|to|can)/)) {
    intent = 'how-to';
  } else if (queryLower.match(/what (is|are|does)/)) {
    intent = 'what-is';
  } else if (queryLower.match(/(fix|error|problem|issue|not working|can't|cannot|missing)/)) {
    intent = 'troubleshoot';
  }

  // Extract keywords (remove stop words)
  const stopWords = ['how', 'do', 'i', 'to', 'the', 'a', 'an', 'is', 'are', 'can', 'what', 'why', 'when'];
  const keywords = queryLower
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));

  return { intent, keywords };
}
