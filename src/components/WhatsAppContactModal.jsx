import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

/**
 * WhatsApp Contact Modal
 * Collects customer info before opening WhatsApp
 * This hides the business number until customer is already engaged
 */
export const WhatsAppContactModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    message: ''
  });

  const SUPPORT_NUMBER = '447345014588'; // Your UK number (hidden from UI)

  const handleSubmit = (e) => {
    e.preventDefault();

    // Create personalized WhatsApp message
    const whatsappMessage = `Hi! I'm ${formData.name}.\n\n${formData.message}`;
    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://wa.me/${SUPPORT_NUMBER}?text=${encodedMessage}`;

    // Open WhatsApp
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

    // Reset form and close modal
    setFormData({ name: '', message: '' });
    onClose();
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center">
              <MessageCircle size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Contact Support</h2>
              <p className="text-sm text-gray-600">We'll respond on WhatsApp</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Name field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Message field */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                How can we help? *
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows="4"
                placeholder="Describe your question or issue..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Privacy note */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800">
              <span className="font-semibold">Privacy:</span> We'll connect you via WhatsApp. Your contact information is never shared.
            </p>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!formData.name || !formData.message}
            className="w-full mt-6 bg-[#25D366] hover:bg-[#20BA5A] text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MessageCircle size={20} />
            Continue to WhatsApp
          </button>
        </form>
      </div>
    </div>
  );
};

export default WhatsAppContactModal;
