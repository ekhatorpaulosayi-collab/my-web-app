/**
 * Share Instructions Modal
 * Enhanced UX for social media sharing with clear instructions
 */

import React from 'react';
import { X, Check, Copy } from 'lucide-react';
import './ShareInstructionsModal.css';

interface ShareInstructionsModalProps {
  platform: 'instagram' | 'tiktok' | 'whatsapp';
  caption: string;
  imageUrl?: string;
  productName?: string;
  onClose: () => void;
}

export const ShareInstructionsModal: React.FC<ShareInstructionsModalProps> = ({
  platform,
  caption,
  imageUrl,
  productName,
  onClose
}) => {
  const [captionCopied, setCaptionCopied] = React.useState(false);
  const [imageDownloaded, setImageDownloaded] = React.useState(false);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  const handleViewCaption = () => {
    navigator.clipboard.writeText(caption);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2000);
  };

  const handleDownloadImage = async () => {
    console.log('[ShareInstructionsModal] Download button clicked');
    console.log('[ShareInstructionsModal] Image URL:', imageUrl);
    console.log('[ShareInstructionsModal] Product Name:', productName);

    if (!imageUrl || !productName) {
      console.error('[ShareInstructionsModal] Missing imageUrl or productName');
      return;
    }

    try {
      console.log('[ShareInstructionsModal] Starting download...');
      // Import download function
      const { downloadProductImage } = await import('../utils/socialShare');
      const success = await downloadProductImage(imageUrl, productName);
      console.log('[ShareInstructionsModal] Download result:', success);
      if (success) {
        setImageDownloaded(true);
        console.log('[ShareInstructionsModal] Download complete!');
      }
    } catch (error) {
      console.error('[ShareInstructionsModal] Download error:', error);
    }
  };

  const getInstructions = () => {
    if (platform === 'instagram') {
      if (isMobile) {
        return [
          'Tap "Download Image" button below',
          'Open Instagram app',
          'Tap + button to create new post',
          'Select the downloaded image from your gallery',
          'Long-press the caption area and tap "Paste"',
          'Add hashtags and post!'
        ];
      } else {
        return [
          'Click "Download Image" button below',
          'Transfer the image to your phone (AirDrop/Google Photos)',
          'Open Instagram app on your phone',
          'Tap + button → Select the image',
          'Paste the caption and post!'
        ];
      }
    } else if (platform === 'whatsapp') {
      // WhatsApp Status
      if (isMobile) {
        return [
          'Tap "Download Image" button below',
          'Open WhatsApp',
          'Tap "Status" tab at the top',
          'Tap camera icon to create new Status',
          'Select the downloaded image from gallery',
          'Long-press text area and tap "Paste" to add caption',
          'Tap send to post to your Status!'
        ];
      } else {
        return [
          'Click "Download Image" button below',
          'Transfer the image to your phone',
          'Open WhatsApp on your phone',
          'Tap "Status" → Camera icon',
          'Select the image from gallery',
          'Long-press text area and paste caption',
          'Tap send to post to Status!'
        ];
      }
    } else {
      // TikTok
      if (isMobile) {
        return [
          'Create a new video in TikTok',
          'Record or select your product video',
          'Long-press the caption area',
          'Tap "Paste" to add your caption',
          'Post your video!'
        ];
      } else {
        return [
          'Open TikTok on your phone',
          'Tap the + button to create a video',
          'Record or select your product video',
          'Long-press caption area and tap "Paste"',
          'Post your TikTok!'
        ];
      }
    }
  };

  const getPlatformEmoji = () => {
    if (platform === 'whatsapp') return '💬';
    if (platform === 'instagram') return '📸';
    return '🎵';
  };

  const getPlatformName = () => {
    if (platform === 'whatsapp') return 'WhatsApp Status';
    if (platform === 'instagram') return 'Instagram';
    return 'TikTok';
  };

  const getStatusMessage = () => {
    const parts = [];
    parts.push('Caption copied to clipboard');
    if (imageDownloaded) {
      parts.push('Image downloaded');
    }
    return parts;
  };

  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Trap focus within modal (basic implementation)
  React.useEffect(() => {
    const modalContent = document.querySelector('.share-modal-content');
    const focusableElements = modalContent?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements && focusableElements.length > 0) {
      // Focus first element
      focusableElements[0]?.focus();
    }
  }, []);

  return (
    <div
      className="share-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div
        className="share-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {/* Header */}
        <div className="share-modal-header">
          <div className="share-modal-title" id="share-modal-title">
            <span className="share-modal-emoji" aria-hidden="true">{getPlatformEmoji()}</span>
            <span>{getPlatformName()} Ready!</span>
          </div>
          <button
            className="share-modal-close"
            onClick={onClose}
            aria-label={`Close ${getPlatformName()} sharing dialog`}
            type="button"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Status */}
        <div className="share-modal-status">
          {getStatusMessage().map((msg, idx) => (
            <div key={idx} className="share-status-item">
              <Check size={16} className="share-status-check" />
              <span>{msg}</span>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="share-modal-instructions">
          <div className="share-instructions-label">Next steps:</div>
          <ol className="share-instructions-list">
            {getInstructions().map((instruction, idx) => (
              <li key={idx}>{instruction}</li>
            ))}
          </ol>
        </div>

        {/* Actions */}
        <div className="share-modal-actions">
          {imageUrl && (
            <button
              className="share-modal-btn share-btn-primary"
              onClick={handleDownloadImage}
              disabled={imageDownloaded}
              type="button"
              aria-label={imageDownloaded ? 'Image downloaded successfully' : 'Download product image'}
              aria-disabled={imageDownloaded}
            >
              {imageDownloaded ? (
                <>
                  <Check size={16} aria-hidden="true" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <span role="img" aria-label="Download">📥</span>
                  <span>Download Image</span>
                </>
              )}
            </button>
          )}
          <button
            className="share-modal-btn share-btn-secondary"
            onClick={handleViewCaption}
            type="button"
            aria-label={captionCopied ? 'Caption copied to clipboard' : 'Copy caption to clipboard'}
          >
            {captionCopied ? (
              <>
                <Check size={16} aria-hidden="true" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={16} aria-hidden="true" />
                <span>View Caption</span>
              </>
            )}
          </button>
          <button
            className="share-modal-btn share-btn-secondary"
            onClick={onClose}
            type="button"
            aria-label="Close dialog and return to share menu"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
