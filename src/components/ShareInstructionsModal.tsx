/**
 * Share Instructions Modal
 * Enhanced UX for social media sharing with clear instructions
 */

import React from 'react';
import { X, Check, Copy } from 'lucide-react';
import './ShareInstructionsModal.css';

interface ShareInstructionsModalProps {
  platform: 'instagram' | 'tiktok';
  caption: string;
  imageDownloaded?: boolean;
  onClose: () => void;
}

export const ShareInstructionsModal: React.FC<ShareInstructionsModalProps> = ({
  platform,
  caption,
  imageDownloaded = false,
  onClose
}) => {
  const [captionCopied, setCaptionCopied] = React.useState(false);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  const handleViewCaption = () => {
    navigator.clipboard.writeText(caption);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2000);
  };

  const getInstructions = () => {
    if (platform === 'instagram') {
      if (isMobile) {
        return imageDownloaded
          ? [
              'Select the downloaded image from your gallery',
              'Tap "Next"',
              'Long-press the caption area and tap "Paste"',
              'Add hashtags and post!'
            ]
          : [
              'Select your product photo',
              'Tap "Next"',
              'Long-press the caption area and tap "Paste"',
              'Add hashtags and post!'
            ];
      } else {
        return imageDownloaded
          ? [
              'Transfer the downloaded image to your phone (AirDrop/Google Photos)',
              'Open Instagram app on your phone',
              'Tap + button → Select the image',
              'Paste the caption and post!'
            ]
          : [
              'Save your product photo to your phone',
              'Open Instagram app',
              'Tap + button → Select the photo',
              'Long-press caption area and paste',
              'Add hashtags and post!'
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
    return platform === 'instagram' ? '📸' : '🎵';
  };

  const getPlatformName = () => {
    return platform === 'instagram' ? 'Instagram' : 'TikTok';
  };

  const getStatusMessage = () => {
    const parts = [];
    parts.push('Caption copied to clipboard');
    if (imageDownloaded) {
      parts.push('Image downloaded');
    }
    if (isMobile) {
      parts.push(`${getPlatformName()} opening...`);
    }
    return parts;
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="share-modal-header">
          <div className="share-modal-title">
            <span className="share-modal-emoji">{getPlatformEmoji()}</span>
            <span>{getPlatformName()} Ready!</span>
          </div>
          <button className="share-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
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
          <button
            className="share-modal-btn share-btn-secondary"
            onClick={handleViewCaption}
          >
            {captionCopied ? (
              <>
                <Check size={16} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>View Caption</span>
              </>
            )}
          </button>
          <button className="share-modal-btn share-btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
