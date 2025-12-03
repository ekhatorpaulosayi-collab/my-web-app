/**
 * Documentation Viewer Component
 * Displays full documentation in a beautiful modal interface
 */

import React, { useState } from 'react';
import { Documentation } from '../types/documentation';
import { getRelatedDocs } from '../utils/docSearch';
import { ArrowLeft, Share2, ThumbsUp, ThumbsDown, MessageCircle, X } from 'lucide-react';

interface DocViewerProps {
  doc: Documentation;
  onClose: () => void;
  onSwitchDoc?: (docId: string) => void;
  onContactSupport?: () => void;
}

export default function DocViewer({
  doc,
  onClose,
  onSwitchDoc,
  onContactSupport,
}: DocViewerProps) {
  const [feedback, setFeedback] = useState<'helpful' | 'not-helpful' | null>(null);

  const relatedDocs = getRelatedDocs(doc.id);

  const handleFeedback = (type: 'helpful' | 'not-helpful') => {
    setFeedback(type);
    // TODO: Send feedback to analytics
    console.log('[DocViewer] Feedback:', { docId, type });

    // If not helpful, show support option
    if (type === 'not-helpful') {
      setTimeout(() => {
        const shouldContact = window.confirm('Sorry this wasn\'t helpful. Would you like to contact support?');
        if (shouldContact && onContactSupport) {
          onContactSupport();
        }
      }, 500);
    }
  };

  const handleShare = () => {
    const shareText = `${doc.title} - Storehouse Help\n\n${doc.description}\n\nLearn more: https://docs.storehouse.ng/${docId}`;

    if (navigator.share) {
      navigator.share({
        title: doc.title,
        text: shareText,
      }).catch(() => {
        // Fallback: Copy to clipboard
        navigator.clipboard?.writeText(shareText);
        alert('Link copied to clipboard!');
      });
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard?.writeText(shareText);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <>
      <div className="doc-viewer-overlay" onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}>
      <div className="doc-viewer-content">
        {/* Header */}
        <div className="doc-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={onClose}
              className="doc-back-button"
              aria-label="Close documentation"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="doc-title">{doc.title}</h1>
              <p className="doc-subtitle">{doc.subtitle}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleShare} className="doc-icon-button" aria-label="Share">
              <Share2 size={20} />
            </button>
            <button onClick={onClose} className="doc-close-button" aria-label="Close">
              ×
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="doc-metadata">
            <span className="doc-badge">{doc.difficulty}</span>
            <span className="doc-meta-item">⏱️ {doc.estimatedTime}</span>
            <span className="doc-meta-item">📂 {doc.category.replace('-', ' ')}</span>
          </div>

          {/* Content */}
          <div className="doc-body">
          <p className="doc-description">{doc.description}</p>

          {/* Steps (if available) */}
          {doc.steps && doc.steps.length > 0 && (
            <div className="doc-steps">
              <h3>Steps:</h3>
              {doc.steps.map((step, index) => (
                <div key={index} className="doc-step">
                  <div className="doc-step-number">{step.step}</div>
                  <div className="doc-step-content">
                    <p className="doc-step-instruction">{step.instruction}</p>
                    {step.tip && <div className="doc-step-tip">💡 {step.tip}</div>}
                    {step.code && (
                      <pre className="doc-code">
                        <code>{step.code}</code>
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Content (if available) */}
          {doc.content && (
            <div className="doc-content-text">
              {doc.content.split('\n\n').map((paragraph, idx) => {
                // Handle code blocks
                if (paragraph.startsWith('```')) {
                  const code = paragraph.replace(/```\w*\n?/g, '').trim();
                  return (
                    <pre key={idx} className="doc-code">
                      <code>{code}</code>
                    </pre>
                  );
                }

                // Handle headers
                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  return <h3 key={idx} className="doc-section-title">{paragraph.replace(/\*\*/g, '')}</h3>;
                }

                return <p key={idx} dangerouslySetInnerHTML={{ __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />;
              })}
            </div>
          )}

          {/* Common Issues */}
          {doc.commonIssues && doc.commonIssues.length > 0 && (
            <div className="doc-common-issues">
              <h3>Common Issues & Solutions:</h3>
              {doc.commonIssues.map((issue, index) => (
                <div key={index} className="doc-issue">
                  <p className="doc-issue-title">❓ {issue.issue}</p>
                  <p className="doc-issue-solution">✅ {issue.solution}</p>
                </div>
              ))}
            </div>
          )}

          {/* Video (if available) */}
          {doc.videoUrl && (
            <div className="doc-video">
              <h3>Video Tutorial:</h3>
              <video controls style={{ width: '100%', borderRadius: '12px' }}>
                <source src={doc.videoUrl} type="video/mp4" />
                Your browser does not support video playback.
              </video>
            </div>
          )}
        </div>

        {/* Related Docs */}
        {relatedDocs.length > 0 && (
          <div className="doc-related">
            <h3>Related Guides:</h3>
            <div className="doc-related-grid">
              {relatedDocs.map(relatedDoc => (
                <button
                  key={relatedDoc.id}
                  className="doc-related-card"
                  onClick={() => onSwitchDoc?.(relatedDoc.id)}
                >
                  <div className="doc-related-title">{relatedDoc.title}</div>
                  <div className="doc-related-subtitle">{relatedDoc.subtitle}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Feedback */}
        <div className="doc-footer">
          {feedback === null ? (
            <>
              <p style={{ fontSize: '0.9375rem', color: '#374151', marginBottom: '12px' }}>
                Was this guide helpful?
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => handleFeedback('helpful')}
                  className="doc-feedback-button"
                >
                  <ThumbsUp size={18} /> Yes, helpful
                </button>
                <button
                  onClick={() => handleFeedback('not-helpful')}
                  className="doc-feedback-button"
                >
                  <ThumbsDown size={18} /> Not helpful
                </button>
              </div>
            </>
          ) : feedback === 'helpful' ? (
            <div className="doc-feedback-thanks">
              ✅ Thanks for your feedback! Glad we could help.
            </div>
          ) : (
            <div className="doc-feedback-sorry">
              We're sorry this wasn't helpful. Our support team is here to assist you!
            </div>
          )}

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              onClick={onContactSupport}
              className="doc-support-button"
            >
              <MessageCircle size={18} /> Still need help? Contact Support
            </button>
          </div>
        </div>
      </div>
      </div>

      <style>{`
        .doc-viewer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 20px;
        }

        .doc-viewer-content {
          background: white;
          border-radius: 16px;
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto !important;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          margin: auto;
          position: relative;
          overscroll-behavior: contain;
          touch-action: pan-y;
        }

        .doc-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-radius: 16px 16px 0 0;
          z-index: 2;
        }

        .doc-back-button, .doc-icon-button {
          background: white;
          border: none;
          color: #667eea;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          cursor: pointer !important;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          flex-shrink: 0;
          -webkit-tap-highlight-color: transparent;
          pointer-events: auto !important;
          position: relative;
          z-index: 10;
        }

        .doc-back-button:hover, .doc-icon-button:hover {
          background: #f8f9fa;
          transform: scale(1.05);
        }

        .doc-back-button:active, .doc-icon-button:active {
          transform: scale(0.95);
        }

        .doc-close-button {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          cursor: pointer !important;
          font-size: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          -webkit-tap-highlight-color: transparent;
          pointer-events: auto !important;
          position: relative;
          z-index: 10;
          transition: all 0.2s;
        }

        .doc-close-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .doc-close-button:active {
          transform: scale(0.95);
        }

        .doc-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .doc-subtitle {
          margin: 4px 0 0 0;
          font-size: 0.9375rem;
          opacity: 0.9;
        }

        .doc-metadata {
          display: flex;
          gap: 16px;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
          flex-wrap: wrap;
        }

        .doc-badge {
          background: #667eea;
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.8125rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .doc-meta-item {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .doc-body {
          padding: 24px;
        }

        .doc-description {
          font-size: 1.0625rem;
          color: #374151;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .doc-steps {
          margin: 24px 0;
        }

        .doc-steps h3 {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 16px;
        }

        .doc-step {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
        }

        .doc-step-number {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.125rem;
        }

        .doc-step-content {
          flex: 1;
        }

        .doc-step-instruction {
          font-size: 0.9375rem;
          color: #1f2937;
          margin: 0 0 8px 0;
          font-weight: 500;
        }

        .doc-step-tip {
          background: #fff7ed;
          border-left: 3px solid #f59e0b;
          padding: 8px 12px;
          font-size: 0.875rem;
          color: #92400e;
          border-radius: 4px;
          margin-top: 8px;
        }

        .doc-code {
          background: #1f2937;
          color: #f3f4f6;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 0.8125rem;
          margin: 12px 0;
        }

        .doc-content-text {
          font-size: 0.9375rem;
          color: #374151;
          line-height: 1.7;
        }

        .doc-content-text p {
          margin: 12px 0;
        }

        .doc-section-title {
          font-size: 1.0625rem;
          font-weight: 700;
          color: #1f2937;
          margin: 24px 0 12px 0;
        }

        .doc-common-issues {
          background: #fef3c7;
          border: 1px solid #fde68a;
          border-radius: 12px;
          padding: 20px;
          margin: 24px 0;
        }

        .doc-common-issues h3 {
          margin: 0 0 16px 0;
          font-size: 1.0625rem;
          color: #78350f;
        }

        .doc-issue {
          margin-bottom: 16px;
        }

        .doc-issue:last-child {
          margin-bottom: 0;
        }

        .doc-issue-title {
          font-weight: 600;
          color: #92400e;
          margin: 0 0 6px 0;
          font-size: 0.9375rem;
        }

        .doc-issue-solution {
          color: #78350f;
          margin: 0;
          font-size: 0.9375rem;
        }

        .doc-related {
          border-top: 1px solid #e5e7eb;
          padding: 24px;
          background: #f9fafb;
        }

        .doc-related h3 {
          margin: 0 0 16px 0;
          font-size: 1.0625rem;
          color: #1f2937;
        }

        .doc-related-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .doc-related-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          text-align: left;
          cursor: pointer !important;
          transition: all 0.2s;
          pointer-events: auto !important;
        }

        .doc-related-card:hover {
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
          transform: translateY(-2px);
        }

        .doc-related-card:active {
          transform: translateY(0);
        }

        .doc-related-title {
          font-weight: 600;
          color: #1f2937;
          font-size: 0.9375rem;
          margin-bottom: 4px;
        }

        .doc-related-subtitle {
          font-size: 0.8125rem;
          color: #6b7280;
        }

        .doc-footer {
          border-top: 1px solid #e5e7eb;
          padding: 24px;
          text-align: center;
        }

        .doc-feedback-button {
          background: white;
          border: 2px solid #e5e7eb;
          color: #374151;
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer !important;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          pointer-events: auto !important;
        }

        .doc-feedback-button:hover {
          border-color: #667eea;
          background: #f5f7ff;
        }

        .doc-feedback-button:active {
          transform: scale(0.95);
        }

        .doc-feedback-thanks {
          background: #d1fae5;
          color: #065f46;
          padding: 12px 20px;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 600;
        }

        .doc-feedback-sorry {
          background: #fee2e2;
          color: #991b1b;
          padding: 12px 20px;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 600;
        }

        .doc-support-button {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer !important;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          pointer-events: auto !important;
        }

        .doc-support-button:hover {
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
          transform: translateY(-2px);
        }

        .doc-support-button:active {
          transform: translateY(0);
        }

        @media (max-width: 768px) {
          .doc-viewer-overlay {
            padding: 0;
            align-items: stretch;
          }

          .doc-viewer-content {
            height: 100vh;
            max-height: 100vh;
            margin: 0;
            border-radius: 0;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            overscroll-behavior: contain !important;
            touch-action: pan-y !important;
          }

          .doc-header {
            padding: 16px;
            border-radius: 0;
          }

          .doc-title {
            font-size: 1.25rem;
          }

          .doc-subtitle {
            font-size: 0.8125rem;
          }

          .doc-body {
            padding: 16px;
          }

          .doc-related-grid {
            grid-template-columns: 1fr;
          }

          .doc-close-button {
            width: 40px;
            height: 40px;
            font-size: 1.75rem;
          }

          .doc-back-button, .doc-icon-button {
            width: 40px;
            height: 40px;
          }
        }
      `}</style>
    </>
  );
}
