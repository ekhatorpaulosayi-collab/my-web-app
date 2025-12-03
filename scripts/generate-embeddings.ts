/**
 * Generate Vector Embeddings for Documentation
 *
 * This script:
 * 1. Reads all documentation from src/data/documentation.ts
 * 2. Generates embeddings using OpenAI text-embedding-ada-002
 * 3. Stores embeddings in Supabase documentation table
 *
 * Run once: npm run generate-embeddings
 * Cost: ~$0.02 for 49 docs (one-time)
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { DOCUMENTATION } from '../src/data/documentation';

// Environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Generate embedding for a single document
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error: any) {
    console.error('Error generating embedding:', error.message);
    throw error;
  }
}

/**
 * Prepare text for embedding (combine title, description, content)
 */
function prepareTextForEmbedding(doc: any): string {
  const parts = [
    doc.title,
    doc.subtitle || '',
    doc.description,
    doc.content || '',
    // Include keywords for better semantic search
    doc.keywords?.join(', ') || '',
  ].filter(Boolean);

  return parts.join('. ').trim();
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting embedding generation...\n');
  console.log(`📚 Total documents: ${DOCUMENTATION.length}`);
  console.log(`💰 Estimated cost: $${(DOCUMENTATION.length * 0.0004 / 1000).toFixed(4)}\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < DOCUMENTATION.length; i++) {
    const doc = DOCUMENTATION[i];

    try {
      console.log(`[${i + 1}/${DOCUMENTATION.length}] Processing: ${doc.id}`);

      // Prepare text
      const text = prepareTextForEmbedding(doc);
      console.log(`  ↳ Text length: ${text.length} chars`);

      // Generate embedding
      console.log(`  ↳ Generating embedding...`);
      const embedding = await generateEmbedding(text);
      console.log(`  ↳ Embedding generated (${embedding.length} dimensions)`);

      // Extract steps content if exists
      const stepsContent = doc.steps
        ? doc.steps.map((s: any) => `Step ${s.step}: ${s.instruction}. ${s.tip || ''}`).join(' ')
        : '';

      const fullContent = doc.content
        ? `${doc.content}\n\n${stepsContent}`.trim()
        : stepsContent;

      // Upsert to database
      console.log(`  ↳ Saving to database...`);
      const { error } = await supabase.from('documentation').upsert({
        id: doc.id,
        title: doc.title,
        subtitle: doc.subtitle || null,
        category: doc.category,
        description: doc.description,
        content: fullContent || null,
        difficulty: doc.difficulty || null,
        estimated_time: doc.estimatedTime || null,
        priority: doc.priority || 50,
        keywords: doc.keywords || [],
        related_docs: doc.relatedDocs || [],
        last_updated: doc.lastUpdated || new Date().toISOString().split('T')[0],
        embedding: embedding,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      console.log(`  ✅ Success!\n`);
      successCount++;

      // Rate limiting: Wait 200ms between requests (max 5 req/sec)
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}\n`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📈 Success Rate: ${((successCount / DOCUMENTATION.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  if (errorCount === 0) {
    console.log('\n🎉 All embeddings generated successfully!');
    console.log('💡 Next step: Deploy your app to enable vector search');
  } else {
    console.log('\n⚠️  Some embeddings failed. Check errors above.');
    process.exit(1);
  }
}

// Run script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
