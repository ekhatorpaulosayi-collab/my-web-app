import React, { useState } from 'react';
import { Star, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TestimonialFormProps {
  onClose?: () => void;
  embedded?: boolean;
}

export function TestimonialForm({ onClose, embedded = false }: TestimonialFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    location: '',
    rating: 5,
    testimonial: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.businessName || !formData.location || !formData.testimonial) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.testimonial.length < 20) {
      setError('Please write at least 20 characters in your testimonial');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: submitError } = await supabase
        .from('testimonials')
        .insert([
          {
            name: formData.name,
            business_name: formData.businessName,
            location: formData.location,
            rating: formData.rating,
            testimonial: formData.testimonial,
            email: formData.email || null,
            phone: formData.phone || null,
            approved: false // Will be reviewed by admin
          }
        ]);

      if (submitError) throw submitError;

      setSuccess(true);

      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({
          name: '',
          businessName: '',
          location: '',
          rating: 5,
          testimonial: '',
          email: '',
          phone: ''
        });
        setSuccess(false);
        if (onClose) onClose();
      }, 3000);
    } catch (err: any) {
      console.error('Error submitting testimonial:', err);
      setError(err.message || 'Failed to submit testimonial. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="testimonial-success">
        <CheckCircle size={48} className="success-icon" />
        <h3>Thank You!</h3>
        <p>Your testimonial has been submitted and will be reviewed shortly.</p>
      </div>
    );
  }

  return (
    <div className={`testimonial-form ${embedded ? 'embedded' : ''}`}>
      <div className="form-header">
        <h2>Share Your Experience</h2>
        <p>Help others discover Storehouse by sharing your story</p>
      </div>

      {error && (
        <div className="form-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="name">Your Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="businessName">Business Name *</label>
            <input
              id="businessName"
              type="text"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              placeholder="John's Store"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="location">Location *</label>
          <input
            id="location"
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Lagos, Nigeria"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Rating *</label>
          <div className="rating-selector">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFormData({ ...formData, rating: star })}
                className={`star-btn ${star <= formData.rating ? 'active' : ''}`}
                disabled={loading}
              >
                <Star size={32} fill={star <= formData.rating ? '#FCD34D' : 'none'} />
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="testimonial">Your Experience *</label>
          <textarea
            id="testimonial"
            value={formData.testimonial}
            onChange={(e) => setFormData({ ...formData, testimonial: e.target.value })}
            placeholder="Tell us how Storehouse helped your business..."
            rows={5}
            required
            disabled={loading}
            minLength={20}
          />
          <small>{formData.testimonial.length}/500 characters</small>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="email">Email (Optional)</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone (Optional)</label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+234 800 000 0000"
              disabled={loading}
            />
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Testimonial'}
        </button>

        <p className="form-note">
          * Your testimonial will be reviewed before appearing on our website
        </p>
      </form>

      <style>{`
        .testimonial-form {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .testimonial-form.embedded {
          box-shadow: none;
          padding: 1rem;
        }

        .form-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .form-header h2 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.5rem 0;
        }

        .form-header p {
          color: #64748b;
          margin: 0;
        }

        .form-error {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          margin-bottom: 1.5rem;
          color: #dc2626;
          font-size: 0.875rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #2063F0;
        }

        .form-group input:disabled,
        .form-group textarea:disabled {
          background: #f9fafb;
          cursor: not-allowed;
        }

        .form-group small {
          color: #64748b;
          font-size: 0.75rem;
        }

        .rating-selector {
          display: flex;
          gap: 0.5rem;
        }

        .star-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: transform 0.2s;
        }

        .star-btn:hover {
          transform: scale(1.1);
        }

        .star-btn:disabled {
          cursor: not-allowed;
        }

        .star-btn.active svg {
          stroke: #FCD34D;
        }

        .submit-btn {
          width: 100%;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #2063F0 0%, #1850C9 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(32, 99, 240, 0.3);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .form-note {
          text-align: center;
          color: #64748b;
          font-size: 0.875rem;
          margin: 1rem 0 0 0;
        }

        .testimonial-success {
          text-align: center;
          padding: 3rem 2rem;
        }

        .success-icon {
          color: #10b981;
          margin-bottom: 1rem;
        }

        .testimonial-success h3 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.5rem 0;
        }

        .testimonial-success p {
          color: #64748b;
          margin: 0;
        }

        @media (max-width: 640px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .testimonial-form {
            padding: 1.5rem;
          }

          .form-header h2 {
            font-size: 1.5rem;
          }

          .rating-selector {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
