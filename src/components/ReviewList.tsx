/**
 * Review List Component
 * Displays product reviews with filtering, sorting, and helpfulness voting
 */

import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, MessageSquare, ChevronDown } from 'lucide-react';
import {
  getProductReviews,
  getProductReviewStats,
  voteOnReview,
  getVoterIdentifier,
  type ProductReview,
  type ReviewStats
} from '../services/reviewService';

interface ReviewListProps {
  productId: string;
  onWriteReview?: () => void;
}

export default function ReviewList({ productId, onWriteReview }: ReviewListProps) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating_high' | 'rating_low'>('recent');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [votedReviews, setVotedReviews] = useState<Set<string>>(new Set());
  const [votingReviewId, setVotingReviewId] = useState<string | null>(null);

  const voterIdentifier = getVoterIdentifier();

  useEffect(() => {
    loadReviews();
    loadStats();
  }, [productId, sortBy, filterRating]);

  const loadReviews = async () => {
    setLoading(true);
    const result = await getProductReviews(productId, {
      sortBy,
      rating: filterRating as any,
      limit: 50
    });

    if (result.success) {
      setReviews(result.reviews);
    }
    setLoading(false);
  };

  const loadStats = async () => {
    const result = await getProductReviewStats(productId);
    if (result.success && result.stats) {
      setStats(result.stats);
    }
  };

  const handleVote = async (reviewId: string, voteType: 'helpful' | 'not_helpful') => {
    if (votedReviews.has(reviewId) || votingReviewId) return;

    setVotingReviewId(reviewId);
    const result = await voteOnReview(reviewId, voteType, voterIdentifier);

    if (result.success) {
      setVotedReviews(prev => new Set(prev).add(reviewId));
      // Reload reviews to get updated counts
      await loadReviews();
    }
    setVotingReviewId(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number, size: number = 16) => {
    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            fill={star <= rating ? '#fbbf24' : 'none'}
            color={star <= rating ? '#fbbf24' : '#d1d5db'}
            strokeWidth={2}
          />
        ))}
      </div>
    );
  };

  const ratingPercentage = (count: number) => {
    if (!stats || stats.total_reviews === 0) return 0;
    return Math.round((count / stats.total_reviews) * 100);
  };

  if (!stats || stats.total_reviews === 0) {
    return (
      <div style={{
        padding: '3rem 1.5rem',
        textAlign: 'center',
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb'
      }}>
        <Star size={48} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: '#1e293b',
          marginBottom: '0.5rem'
        }}>
          No Reviews Yet
        </h3>
        <p style={{
          color: '#64748b',
          marginBottom: '1.5rem'
        }}>
          Be the first to share your experience with this product!
        </p>
        {onWriteReview && (
          <button
            onClick={onWriteReview}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)'
            }}
          >
            Write a Review
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      {/* Rating Summary */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '2rem',
        marginBottom: '1.5rem',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#1e293b',
          marginBottom: '1.5rem'
        }}>
          Customer Reviews
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '2rem',
          alignItems: 'center'
        }}>
          {/* Overall Rating */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '3rem',
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: '0.5rem'
            }}>
              {stats.average_rating.toFixed(1)}
            </div>
            {renderStars(Math.round(stats.average_rating), 20)}
            <div style={{
              fontSize: '0.875rem',
              color: '#64748b',
              marginTop: '0.5rem'
            }}>
              Based on {stats.total_reviews} {stats.total_reviews === 1 ? 'review' : 'reviews'}
            </div>
          </div>

          {/* Rating Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats[`rating_${rating}_count` as keyof ReviewStats] as number;
              const percentage = ratingPercentage(count);

              return (
                <button
                  key={rating}
                  onClick={() => setFilterRating(filterRating === rating ? null : rating)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr 50px',
                    gap: '0.75rem',
                    alignItems: 'center',
                    padding: '0.5rem',
                    border: 'none',
                    background: filterRating === rating ? '#eff6ff' : 'transparent',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (filterRating !== rating) {
                      e.currentTarget.style.background = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = filterRating === rating ? '#eff6ff' : 'transparent';
                  }}
                >
                  <span style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'left' }}>
                    {rating} star
                  </span>
                  <div style={{
                    height: '8px',
                    background: '#e5e7eb',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${percentage}%`,
                      background: '#fbbf24',
                      borderRadius: '4px',
                      transition: 'width 0.3s'
                    }} />
                  </div>
                  <span style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'right' }}>
                    {percentage}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Write Review Button */}
        {onWriteReview && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <button
              onClick={onWriteReview}
              style={{
                padding: '0.875rem 2rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)'
              }}
            >
              Write a Review
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '0.5rem 2rem 0.5rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#1e293b',
              cursor: 'pointer',
              background: 'white',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.5rem center'
            }}
          >
            <option value="recent">Most Recent</option>
            <option value="helpful">Most Helpful</option>
            <option value="rating_high">Highest Rating</option>
            <option value="rating_low">Lowest Rating</option>
          </select>
        </div>

        {filterRating && (
          <button
            onClick={() => setFilterRating(null)}
            style={{
              padding: '0.5rem 1rem',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Reviews List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e7eb',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
            margin: '0 auto'
          }} />
        </div>
      ) : reviews.length === 0 ? (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <p style={{ color: '#64748b' }}>
            No reviews match your filter. Try adjusting your selection.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reviews.map((review) => (
            <div
              key={review.id}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '1px solid #e5e7eb',
                transition: 'box-shadow 0.2s'
              }}
            >
              {/* Review Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1rem'
              }}>
                <div>
                  {renderStars(review.rating, 18)}
                  {review.review_title && (
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      color: '#1e293b',
                      marginTop: '0.5rem',
                      marginBottom: '0.25rem'
                    }}>
                      {review.review_title}
                    </h3>
                  )}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#64748b'
                  }}>
                    <span style={{ fontWeight: 500 }}>{review.customer_name}</span>
                    {review.is_verified_purchase && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.125rem 0.5rem',
                        background: '#dcfce7',
                        color: '#166534',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        ✓ Verified Purchase
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    {formatDate(review.created_at)}
                  </div>
                </div>
              </div>

              {/* Review Text */}
              <p style={{
                fontSize: '0.9375rem',
                lineHeight: 1.7,
                color: '#475569',
                marginBottom: '1rem',
                whiteSpace: 'pre-wrap'
              }}>
                {review.review_text}
              </p>

              {/* Store Response */}
              {review.store_response && (
                <div style={{
                  padding: '1rem',
                  background: '#f9fafb',
                  borderLeft: '3px solid #3b82f6',
                  borderRadius: '6px',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem'
                  }}>
                    <MessageSquare size={16} color="#3b82f6" />
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#3b82f6'
                    }}>
                      Store Response
                    </span>
                  </div>
                  <p style={{
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    color: '#475569',
                    margin: 0,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {review.store_response}
                  </p>
                </div>
              )}

              {/* Helpfulness */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <button
                  onClick={() => handleVote(review.id, 'helpful')}
                  disabled={votedReviews.has(review.id) || votingReviewId === review.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: votedReviews.has(review.id) ? '#eff6ff' : 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    color: '#475569',
                    cursor: votedReviews.has(review.id) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!votedReviews.has(review.id)) {
                      e.currentTarget.style.background = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = votedReviews.has(review.id) ? '#eff6ff' : 'white';
                  }}
                >
                  <ThumbsUp size={16} />
                  <span>Helpful ({review.helpful_count})</span>
                </button>
                {votedReviews.has(review.id) && (
                  <span style={{ fontSize: '0.875rem', color: '#10b981' }}>
                    ✓ Thank you for your feedback
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
