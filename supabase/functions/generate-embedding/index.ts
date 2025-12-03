// Generate OpenAI Embedding for Text
// Used by hybrid search for real-time query embeddings
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface EmbeddingRequest {
  text: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Parse request
    const body: EmbeddingRequest = await req.json();
    const { text } = body;

    // Validation
    if (!text || text.trim().length === 0) {
      return jsonResponse({ error: 'Text is required' }, 400);
    }

    if (text.length > 8000) {
      return jsonResponse({ error: 'Text too long (max 8000 characters)' }, 400);
    }

    if (!OPENAI_API_KEY) {
      return jsonResponse({ error: 'OpenAI API key not configured' }, 500);
    }

    // Generate embedding using OpenAI
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI error:', data);
      return jsonResponse({ error: 'Failed to generate embedding' }, 500);
    }

    // Return embedding
    return jsonResponse({
      embedding: data.data[0].embedding,
      model: 'text-embedding-ada-002',
      dimensions: data.data[0].embedding.length,
    });

  } catch (error) {
    console.error('Embedding error:', error);
    return jsonResponse({
      error: 'Failed to generate embedding',
      details: error.message,
    }, 500);
  }
});

// JSON response helper
function jsonResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
