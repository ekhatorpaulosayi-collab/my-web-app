import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { TestimonialForm } from '../components/TestimonialForm';

export default function SubmitTestimonial() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #F0F7FF 0%, #FFFFFF 100%)',
      padding: '2rem 1rem'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/landing')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            color: '#2063F0',
            fontSize: '1rem',
            cursor: 'pointer',
            marginBottom: '2rem',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#F0F7FF'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          <ArrowLeft size={20} />
          Back to Home
        </button>

        <TestimonialForm />
      </div>
    </div>
  );
}
