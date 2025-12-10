/**
 * Review Submission Form
 * Clean, professional form for customers to leave reviews
 */

import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { submitReview, type SubmitReviewData } from '../services/reviewService';

interface ReviewFormProps {
  productId: string;
  productName: string;
  storeUserId: string;
  onClose: () => void;
  onSubmitSuccess?: () => void;
}

export default function ReviewForm({
  productId,
  productName,
  storeUserId,
  onClose,
  onSubmitSuccess
}: ReviewFormProps) {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const characterCount = reviewText.length;
  const minCharacters = 10;
  const isValid = characterCount >= minCharacters && customerName.trim().length > 0 && rating > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError('');

    const reviewData: SubmitReviewData = {
      product_id: productId,
      store_user_id: storeUserId,
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim() || undefined,
      customer_phone: customerPhone.trim() || undefined,
      rating,
      review_title: reviewTitle.trim() || undefined,
      review_text: reviewText.trim()
    };

    const result = await submitReview(reviewData);

    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => {
        onSubmitSuccess?.();
        onClose();
      }, 2000);
    } else {
      setError(result.error || 'Failed to submit review. Please try again.');
      setSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '1rem'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '3rem 2rem',
          maxWidth: '400px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#d1fae5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            fontSize: '2rem'
          }}>
            ✓
          </div>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: '0.75rem'
          }}>
            Review Submitted!
          </h2>
          <p style={{
            color: '#64748b',
            fontSize: '1rem',
            margin: 0
          }}>
            Thank you for your feedback. Your review will be published after approval.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '1rem',
        overflowY: 'auto'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#1e293b',
              margin: '0 0 0.25rem'
            }}>
              Write a Review
            </h2>
            <p style={{
              fontSize: '0.875rem',
              color: '#64748b',
              margin: 0
            }}>
              {productName}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '2px solid #e2e8f0',
              background: '#ffffff',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.color = '#1e293b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#475569';
            }}
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{
          padding: '1.5rem',
          overflowY: 'auto',
          flex: 1
        }}>
          {/* Rating */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '0.75rem'
            }}>
              Your Rating <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center'
            }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star as 1 | 2 | 3 | 4 | 5)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    transition: 'transform 0.2s'
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.9)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <Star
                    size={32}
                    fill={(hoverRating || rating) >= star ? '#fbbf24' : 'none'}
                    color={(hoverRating || rating) >= star ? '#fbbf24' : '#d1d5db'}
                    strokeWidth={2}
                  />
                </button>
              ))}
              <span style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#1e293b',
                marginLeft: '0.5rem'
              }}>
                {rating === 5 && '✨ Excellent!'}
                {rating === 4 && '👍 Great!'}
                {rating === 3 && '😊 Good'}
                {rating === 2 && '😐 Fair'}
                {rating === 1 && '😞 Poor'}
              </span>
            </div>
          </div>

          {/* Review Title (Optional) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Review Title (Optional)
            </label>
            <input
              type="text"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder="Sum up your experience in a few words"
              maxLength={100}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
            />
          </div>

          {/* Review Text */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Your Review <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience with this product..."
              rows={5}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: characterCount < minCharacters ? '#ef4444' : '#64748b'
            }}>
              <span>Minimum {minCharacters} characters</span>
              <span>{characterCount} / 500</span>
            </div>
          </div>

          {/* Customer Info */}
          <div style={{
            background: '#f9fafb',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '1rem'
            }}>
              Your Information
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: '#6b7280',
                marginBottom: '0.5rem'
              }}>
                Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Your name"
                required
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  background: 'white'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: '#6b7280',
                marginBottom: '0.5rem'
              }}>
                Email (Optional)
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="your@email.com"
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  background: 'white'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: '#6b7280',
                marginBottom: '0.5rem'
              }}>
                Phone (Optional)
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="080 1234 5678"
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  background: 'white'
                }}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isValid || submitting}
            style={{
              width: '100%',
              padding: '1rem',
              background: isValid && !submitting
                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isValid && !submitting ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {submitting ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite'
                }} />
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
