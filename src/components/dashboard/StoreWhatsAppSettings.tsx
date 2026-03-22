// Simple WhatsApp Settings for Store
import React, { useState, useEffect } from 'react';
import { Phone, Save, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StoreWhatsAppSettingsProps {
  storeId: string;
}

export function StoreWhatsAppSettings({ storeId }: StoreWhatsAppSettingsProps) {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadStoreSettings();
  }, [storeId]);

  const loadStoreSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('whatsapp_number')
        .eq('id', storeId)
        .single();

      if (data?.whatsapp_number) {
        setWhatsappNumber(data.whatsapp_number);
      }
    } catch (error) {
      console.error('Error loading WhatsApp number:', error);
    }
  };

  const saveWhatsAppNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappNumber.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({ whatsapp_number: whatsappNumber })
        .eq('id', storeId);

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving WhatsApp number:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-green-100 rounded-lg">
          <Phone className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">WhatsApp Settings</h3>
          <p className="text-sm text-gray-600">
            Add your WhatsApp number for customer support
          </p>
        </div>
      </div>

      <form onSubmit={saveWhatsAppNumber} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            WhatsApp Number
          </label>
          <input
            type="tel"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="+234 800 000 0000"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none
                     focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Include country code (e.g., +234 for Nigeria)
          </p>
        </div>

        <button
          type="submit"
          disabled={saving || !whatsappNumber.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600
                   text-white rounded-lg hover:from-green-700 hover:to-emerald-700
                   transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saved ? (
            <>
              <Check className="h-4 w-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Number'}
            </>
          )}
        </button>
      </form>

      {whatsappNumber && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-700">
            ✓ Customers can now reach you on WhatsApp at{' '}
            <strong>{whatsappNumber}</strong>
          </p>
        </div>
      )}
    </div>
  );
}