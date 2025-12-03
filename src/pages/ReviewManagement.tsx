/**
 * Review Management Page
 * Store owners can approve, reject, and respond to customer reviews
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, CheckCircle, XCircle, MessageSquare, Eye, Clock, ArrowLeft, Filter } from 'lucide-react';
import { getStoreReviews, approveReview, rejectReview, respondToReview, ProductReview } from '../services/reviewService';
import { useAuth } from '../contexts/AuthContext';
import '../styles/ReviewManagement.css';

export default function ReviewManagement() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [userId, statusFilter]);

  const loadReviews = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError('');

      const result = await getStoreReviews(
        userId,
        statusFilter === 'all' ? undefined : statusFilter
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      setReviews(result.reviews || []);
    } catch (err: any) {
      console.error('[ReviewManagement] Error loading reviews:', err);
      setError(err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId: string) => {
    setActionLoading(true);
    const result = await approveReview(reviewId);

    if (result.success) {
      await loadReviews();
    } else {
      alert('Failed to approve review: ' + result.error);
    }
    setActionLoading(false);
  };

  const handleReject = async (reviewId: string) => {
    const reason = window.prompt('Reason for rejection (optional):');
    setActionLoading(true);

    const result = await rejectReview(reviewId, reason || undefined);

    if (result.success) {
      await loadReviews();
    } else {
      alert('Failed to reject review: ' + result.error);
    }
    setActionLoading(false);
  };

  const handleRespond = (review: any) => {
    setSelectedReview(review);
    setResponseText(review.store_response || '');
    setShowResponseModal(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedReview || !responseText.trim()) return;

    setActionLoading(true);
    const result = await respondToReview(selectedReview.id, responseText.trim());

    if (result.success) {
      setShowResponseModal(false);
      setSelectedReview(null);
      setResponseText('');
      await loadReviews();
    } else {
      alert('Failed to submit response: ' + result.error);
    }
    setActionLoading(false);
  };

  const renderStars = (rating: number) => {
    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            fill={star <= rating ? '#fbbf24' : 'none'}
            color={star <= rating ? '#fbbf24' : '#d1d5db'}
            strokeWidth={2}
          />
        ))}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="status-badge status-pending">
            <Clock size={14} />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="status-badge status-approved">
            <CheckCircle size={14} />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="status-badge status-rejected">
            <XCircle size={14} />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const stats = {
    total: reviews.length,
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    rejected: reviews.filter(r => r.status === 'rejected').length,
  };

  return (
    <div className="review-management-page">
      {/* Header */}
      <div className="page-header">
        <button
          className="back-button"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
        <h1>Review Management</h1>
        <p className="page-subtitle">Moderate and respond to customer reviews</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Reviews</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card stat-pending">
          <div className="stat-label">Pending</div>
          <div className="stat-value">{stats.pending}</div>
        </div>
        <div className="stat-card stat-approved">
          <div className="stat-label">Approved</div>
          <div className="stat-value">{stats.approved}</div>
        </div>
        <div className="stat-card stat-rejected">
          <div className="stat-label">Rejected</div>
          <div className="stat-value">{stats.rejected}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-label">
          <Filter size={16} />
          Filter by status:
        </div>
        <div className="filter-buttons">
          <button
            className={statusFilter === 'all' ? 'active' : ''}
            onClick={() => setStatusFilter('all')}
          >
            All ({stats.total})
          </button>
          <button
            className={statusFilter === 'pending' ? 'active' : ''}
            onClick={() => setStatusFilter('pending')}
          >
            Pending ({stats.pending})
          </button>
          <button
            className={statusFilter === 'approved' ? 'active' : ''}
            onClick={() => setStatusFilter('approved')}
          >
            Approved ({stats.approved})
          </button>
          <button
            className={statusFilter === 'rejected' ? 'active' : ''}
            onClick={() => setStatusFilter('rejected')}
          >
            Rejected ({stats.rejected})
          </button>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading reviews...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p>{error}</p>
          <button onClick={loadReviews}>Try Again</button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="empty-state">
          <Star size={48} color="#d1d5db" />
          <h3>No reviews yet</h3>
          <p>
            {statusFilter === 'all'
              ? 'Customer reviews will appear here once submitted'
              : `No ${statusFilter} reviews found`}
          </p>
        </div>
      ) : (
        <div className="reviews-list">
          {reviews.map((review) => (
            <div key={review.id} className="review-card">
              {/* Product Info */}
              <div className="review-product-info">
                {review.products?.image_url && (
                  <img
                    src={review.products.image_url}
                    alt={review.products.name}
                    className="product-thumbnail"
                  />
                )}
                <div>
                  <div className="product-name">{review.products?.name || 'Unknown Product'}</div>
                  <div className="review-date">
                    {new Date(review.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                {getStatusBadge(review.status)}
              </div>

              {/* Review Content */}
              <div className="review-content">
                <div className="review-header">
                  {renderStars(review.rating)}
                  {review.review_title && (
                    <h3 className="review-title">{review.review_title}</h3>
                  )}
                </div>
                <p className="review-text">{review.review_text}</p>
                <div className="review-customer">
                  By {review.customer_name}
                  {review.customer_email && ` (${review.customer_email})`}
                </div>
              </div>

              {/* Store Response */}
              {review.store_response && (
                <div className="store-response">
                  <div className="response-header">
                    <MessageSquare size={16} />
                    Your Response
                  </div>
                  <p>{review.store_response}</p>
                </div>
              )}

              {/* Actions */}
              <div className="review-actions">
                {review.status === 'pending' && (
                  <>
                    <button
                      className="action-btn approve-btn"
                      onClick={() => handleApprove(review.id)}
                      disabled={actionLoading}
                    >
                      <CheckCircle size={16} />
                      Approve
                    </button>
                    <button
                      className="action-btn reject-btn"
                      onClick={() => handleReject(review.id)}
                      disabled={actionLoading}
                    >
                      <XCircle size={16} />
                      Reject
                    </button>
                  </>
                )}
                {review.status === 'approved' && (
                  <button
                    className="action-btn respond-btn"
                    onClick={() => handleRespond(review)}
                    disabled={actionLoading}
                  >
                    <MessageSquare size={16} />
                    {review.store_response ? 'Edit Response' : 'Respond'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Response Modal */}
      {showResponseModal && selectedReview && (
        <div className="modal-overlay" onClick={() => setShowResponseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Respond to Review</h2>
              <button
                className="modal-close"
                onClick={() => setShowResponseModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="review-preview">
                {renderStars(selectedReview.rating)}
                <p className="review-preview-text">{selectedReview.review_text}</p>
                <div className="review-preview-author">- {selectedReview.customer_name}</div>
              </div>
              <div className="form-group">
                <label>Your Response</label>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Thank you for your feedback..."
                  rows={4}
                  className="response-textarea"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowResponseModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSubmitResponse}
                disabled={!responseText.trim() || actionLoading}
              >
                {actionLoading ? 'Submitting...' : 'Submit Response'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
