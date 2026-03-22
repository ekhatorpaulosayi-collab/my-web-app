// Agent Takeover Button for Chat Widget
import React, { useState } from 'react';
import { Users, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AgentTakeoverButtonProps {
  conversationId: string;
  onAgentRequested?: () => void;
}

export function AgentTakeoverButton({ conversationId, onAgentRequested }: AgentTakeoverButtonProps) {
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  const requestAgent = async () => {
    setRequesting(true);
    try {
      const { data, error } = await supabase
        .rpc('request_agent_takeover', {
          p_conversation_id: conversationId,
          p_customer_message: 'Customer requested to speak with an agent'
        });

      if (error) throw error;

      setRequested(true);
      onAgentRequested?.();

      // Show success for 3 seconds
      setTimeout(() => setRequested(false), 3000);
    } catch (error) {
      console.error('Failed to request agent:', error);
    } finally {
      setRequesting(false);
    }
  };

  if (requested) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600
                   rounded-lg text-sm font-medium cursor-not-allowed"
      >
        <CheckCircle className="h-4 w-4" />
        Agent Notified
      </button>
    );
  }

  return (
    <button
      onClick={requestAgent}
      disabled={requesting}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600
                 text-white rounded-lg hover:from-green-700 hover:to-emerald-700
                 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {requesting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Requesting...
        </>
      ) : (
        <>
          <Users className="h-4 w-4" />
          Talk to Agent
        </>
      )}
    </button>
  );
}