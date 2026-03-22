// WhatsApp Link Generator with Customer Verification
import React, { useState, useEffect } from 'react';
import { MessageCircle, Copy, CheckCircle, QrCode } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface WhatsAppLinkGeneratorProps {
  storeId: string;
  storeName: string;
  whatsappNumber: string;
  sessionId?: string;
}

export function WhatsAppLinkGenerator({
  storeId,
  storeName,
  whatsappNumber,
  sessionId
}: WhatsAppLinkGeneratorProps) {
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState('');

  useEffect(() => {
    generateVerificationCode();
  }, [sessionId]);

  const generateVerificationCode = async () => {
    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setVerificationCode(code);

    // Store in database for verification
    if (sessionId) {
      try {
        await supabase
          .from('whatsapp_verifications')
          .insert({
            verification_code: code,
            session_id: sessionId,
            store_id: storeId,
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
          });
      } catch (error) {
        console.error('Error storing verification code:', error);
      }
    }

    // Generate WhatsApp link with pre-filled message
    const message = encodeURIComponent(
      `Hi! I'm contacting from ${storeName}.\n\n` +
      `My verification code is: ${code}\n\n` +
      `I need help with...`
    );

    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    const link = `https://wa.me/${cleanNumber}?text=${message}`;
    setWhatsappLink(link);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(verificationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openWhatsApp = () => {
    window.open(whatsappLink, '_blank');
  };

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 text-green-700">
        <MessageCircle className="h-5 w-5" />
        <h3 className="font-semibold">Continue on WhatsApp</h3>
      </div>

      <div className="bg-white rounded-lg p-4 space-y-3">
        {/* Verification Code Display */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Your verification code:</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-mono font-bold text-green-600">
              {verificationCode}
            </span>
            <button
              onClick={copyCode}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Copy code"
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 text-gray-500" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Valid for 30 minutes
          </p>
        </div>

        {/* WhatsApp Button */}
        <button
          onClick={openWhatsApp}
          className="w-full flex items-center justify-center gap-2 px-4 py-3
                   bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg
                   transition-colors font-medium"
        >
          <MessageCircle className="h-5 w-5" />
          Open WhatsApp
        </button>

        {/* Instructions */}
        <div className="text-xs text-gray-600 space-y-1">
          <p>• Click the button above to open WhatsApp</p>
          <p>• The verification code will be automatically included</p>
          <p>• This links your chat history across both platforms</p>
        </div>
      </div>

      {/* QR Code Option (for desktop users) */}
      <div className="text-center">
        <button
          onClick={() => {
            // Generate QR code for the WhatsApp link
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(whatsappLink)}`;
            window.open(qrUrl, '_blank');
          }}
          className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700"
        >
          <QrCode className="h-4 w-4" />
          Show QR Code
        </button>
      </div>
    </div>
  );
}