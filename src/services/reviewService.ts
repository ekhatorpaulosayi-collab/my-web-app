/**
 * Product Review Service
 * Handles all review-related operations
 */

import { supabase } from '../lib/supabase';

export interface ProductReview {
  id: string;
  product_id: string;
  store_user_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  review_title?: string;
  review_text: string;
  is_verified_purchase: boolean;
  order_id?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  store_response?: string;
  store_response_date?: string;
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewStats {
  product_id: string;
  total_reviews: number;
  average_rating: number;
  rating_5_count: number;
  rating_4_count: number;
  rating_3_count: number;
  rating_2_count: number;
  rating_1_count: number;
  updated_at: string;
}

export interface SubmitReviewData {
  product_id: string;
  store_user_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  review_title?: string;
  review_text: string;
}

/**
 * Submit a new review
 */
export async function submitReview(reviewData: SubmitReviewData) {
  try {
    console.log('[ReviewService] Submitting review:', { product_id: reviewData.product_id, rating: reviewData.rating });

    // Validate review text length
    if (reviewData.review_text.length < 10) {
      return {
        success: false,
        error: 'Review must be at least 10 characters long'
      };
    }

    const { data, error } = await supabase
      .from('product_reviews')
      .insert({
        product_id: reviewData.product_id,
        store_user_id: reviewData.store_user_id,
        customer_name: reviewData.customer_name,
        customer_email: reviewData.customer_email,
        customer_phone: reviewData.customer_phone,
        rating: reviewData.rating,
        review_title: reviewData.review_title,
        review_text: reviewData.review_text,
        status: 'pending' // All reviews start as pending
      })
      .select()
      .single();

    if (error) {
      console.error('[ReviewService] Error submitting review:', error);
      return {
        success: false,
        error: error.message
      };
    }

    console.log('[ReviewService] Review submitted successfully');
    return {
      success: true,
      review: data as ProductReview
    };
  } catch (error: any) {
    console.error('[ReviewService] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'Failed to submit review'
    };
  }
}

/**
 * Get approved reviews for a product
 */
export async function getProductReviews(productId: string, options?: {
  limit?: number;
  offset?: number;
  sortBy?: 'recent' | 'helpful' | 'rating_high' | 'rating_low';
  rating?: 1 | 2 | 3 | 4 | 5;
}) {
  try {
    console.log('[ReviewService] Fetching reviews for product:', productId);

    let query = supabase
      .from('product_reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('status', 'approved');

    // Filter by rating if specified
    if (options?.rating) {
      query = query.eq('rating', options.rating);
    }

    // Sort
    switch (options?.sortBy) {
      case 'helpful':
        query = query.order('helpful_count', { ascending: false });
        break;
      case 'rating_high':
        query = query.order('rating', { ascending: false });
        break;
      case 'rating_low':
        query = query.order('rating', { ascending: true });
        break;
      case 'recent':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ReviewService] Error fetching reviews:', error);
      return {
        success: false,
        error: error.message,
        reviews: []
      };
    }

    console.log('[ReviewService] Fetched', data?.length || 0, 'reviews');
    return {
      success: true,
      reviews: (data || []) as ProductReview[]
    };
  } catch (error: any) {
    console.error('[ReviewService] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch reviews',
      reviews: []
    };
  }
}

/**
 * Get review statistics for a product
 */
export async function getProductReviewStats(productId: string) {
  // Temporarily disable review stats due to view access issues
  // Return default stats until the view is properly configured
  return {
    success: true,
    stats: {
      product_id: productId,
      total_reviews: 0,
      average_rating: 0,
      rating_5_count: 0,
      rating_4_count: 0,
      rating_3_count: 0,
      rating_2_count: 0,
      rating_1_count: 0
    } as ReviewStats
  };

  /* Temporarily disabled - uncomment when view is fixed
  try {
    const { data, error } = await supabase
      .from('product_review_stats')
      .select('*')
      .eq('product_id', productId)
      .single();

    if (error) {
      // Silently handle view access errors (406) or no data (PGRST116) - return defaults
      if (error.code === 'PGRST116' || error.code === 'PGRST301' || error.message?.includes('406')) {
        return {
          success: true,
          stats: {
            product_id: productId,
            total_reviews: 0,
            average_rating: 0,
            rating_5_count: 0,
            rating_4_count: 0,
            rating_3_count: 0,
            rating_2_count: 0,
            rating_1_count: 0
          } as ReviewStats
        };
      }

      // Only log unexpected errors (not 406)
      console.error('[ReviewService] Error fetching stats:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      stats: data as ReviewStats
    };
  } catch (error: any) {
    console.error('[ReviewService] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch review stats'
    };
  }
  */
}

/**
 * Vote on review helpfulness
 */
export async function voteOnReview(reviewId: string, voteType: 'helpful' | 'not_helpful', voterIdentifier: string) {
  try {
    console.log('[ReviewService] Voting on review:', reviewId, voteType);

    // Try to insert vote (will fail if already voted due to UNIQUE constraint)
    const { error } = await supabase
      .from('review_votes')
      .insert({
        review_id: reviewId,
        voter_identifier: voterIdentifier,
        vote_type: voteType
      });

    if (error) {
      // Duplicate vote error
      if (error.code === '23505') {
        return {
          success: false,
          error: 'You have already voted on this review'
        };
      }

      console.error('[ReviewService] Error voting:', error);
      return {
        success: false,
        error: error.message
      };
    }

    console.log('[ReviewService] Vote recorded successfully');
    return {
      success: true
    };
  } catch (error: any) {
    console.error('[ReviewService] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'Failed to record vote'
    };
  }
}

/**
 * Get all reviews for store owner (including pending)
 */
export async function getStoreReviews(storeUserId: string, status?: 'pending' | 'approved' | 'rejected') {
  try {
    console.log('[ReviewService] Fetching store reviews for:', storeUserId);

    let query = supabase
      .from('product_reviews')
      .select('*, products(name, image_url)')
      .eq('store_user_id', storeUserId);

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('[ReviewService] Error fetching store reviews:', error);
      return {
        success: false,
        error: error.message,
        reviews: []
      };
    }

    return {
      success: true,
      reviews: data || []
    };
  } catch (error: any) {
    console.error('[ReviewService] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch store reviews',
      reviews: []
    };
  }
}

/**
 * Approve a review (store owner only)
 */
export async function approveReview(reviewId: string) {
  try {
    const { error } = await supabase
      .from('product_reviews')
      .update({ status: 'approved' })
      .eq('id', reviewId);

    if (error) {
      console.error('[ReviewService] Error approving review:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to approve review'
    };
  }
}

/**
 * Reject a review (store owner only)
 */
export async function rejectReview(reviewId: string, reason?: string) {
  try {
    const { error } = await supabase
      .from('product_reviews')
      .update({
        status: 'rejected',
        rejection_reason: reason
      })
      .eq('id', reviewId);

    if (error) {
      console.error('[ReviewService] Error rejecting review:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to reject review'
    };
  }
}

/**
 * Add store response to a review (store owner only)
 */
export async function respondToReview(reviewId: string, response: string) {
  try {
    const { error } = await supabase
      .from('product_reviews')
      .update({
        store_response: response,
        store_response_date: new Date().toISOString()
      })
      .eq('id', reviewId);

    if (error) {
      console.error('[ReviewService] Error responding to review:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to respond to review'
    };
  }
}

/**
 * Generate a simple identifier for voting (based on browser fingerprint)
 */
export function getVoterIdentifier(): string {
  // Use a combination of factors to create a simple fingerprint
  const nav = window.navigator;
  const screen = window.screen;

  const fingerprint = [
    nav.userAgent,
    nav.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset()
  ].join('|');

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return 'voter_' + Math.abs(hash).toString(36);
}
