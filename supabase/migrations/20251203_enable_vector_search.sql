-- ============================================================================
-- VECTOR SEARCH FOR DOCUMENTATION
-- Enable semantic search using OpenAI embeddings + pgvector
-- ============================================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documentation table with vector embeddings
CREATE TABLE IF NOT EXISTS public.documentation (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_time TEXT,
  priority INTEGER DEFAULT 50,
  keywords TEXT[] DEFAULT '{}',
  related_docs TEXT[] DEFAULT '{}',
  last_updated DATE DEFAULT NOW(),

  -- Vector embedding for semantic search (OpenAI ada-002: 1536 dimensions)
  embedding vector(1536),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_documentation_category
  ON public.documentation(category);

CREATE INDEX IF NOT EXISTS idx_documentation_priority
  ON public.documentation(priority DESC);

-- Vector similarity index (IVFFlat for fast approximate search)
CREATE INDEX IF NOT EXISTS idx_documentation_embedding
  ON public.documentation
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Full-text search index (fallback for keyword search)
CREATE INDEX IF NOT EXISTS idx_documentation_search
  ON public.documentation
  USING GIN (to_tsvector('english', title || ' ' || description || ' ' || COALESCE(content, '')));

-- ============================================================================
-- VECTOR SIMILARITY SEARCH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION search_documentation_vector(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id text,
  title text,
  subtitle text,
  category text,
  description text,
  content text,
  difficulty text,
  estimated_time text,
  priority int,
  keywords text[],
  related_docs text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.subtitle,
    d.category,
    d.description,
    d.content,
    d.difficulty,
    d.estimated_time,
    d.priority,
    d.keywords,
    d.related_docs,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.documentation d
  WHERE d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- HYBRID SEARCH FUNCTION (Keyword + Vector)
-- ============================================================================

CREATE OR REPLACE FUNCTION search_documentation_hybrid(
  search_query text,
  query_embedding vector(1536) DEFAULT NULL,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id text,
  title text,
  subtitle text,
  category text,
  description text,
  content text,
  difficulty text,
  estimated_time text,
  priority int,
  keywords text[],
  related_docs text[],
  score float,
  match_type text
)
LANGUAGE plpgsql
AS $$
DECLARE
  keyword_results int;
BEGIN
  -- Try keyword search first (fast, free)
  CREATE TEMP TABLE IF NOT EXISTS keyword_matches AS
  SELECT
    d.id,
    d.title,
    d.subtitle,
    d.category,
    d.description,
    d.content,
    d.difficulty,
    d.estimated_time,
    d.priority,
    d.keywords,
    d.related_docs,
    ts_rank(
      to_tsvector('english', d.title || ' ' || d.description || ' ' || COALESCE(d.content, '')),
      plainto_tsquery('english', search_query)
    ) AS score,
    'keyword'::text AS match_type
  FROM public.documentation d
  WHERE
    to_tsvector('english', d.title || ' ' || d.description || ' ' || COALESCE(d.content, ''))
    @@ plainto_tsquery('english', search_query)
  ORDER BY score DESC
  LIMIT match_count;

  -- Count keyword results
  SELECT COUNT(*) INTO keyword_results FROM keyword_matches;

  -- If keyword search found good results, return them
  IF keyword_results >= 3 THEN
    RETURN QUERY SELECT * FROM keyword_matches;
    DROP TABLE keyword_matches;
    RETURN;
  END IF;

  -- Otherwise, use vector search (more accurate, small cost)
  IF query_embedding IS NOT NULL THEN
    RETURN QUERY
    SELECT
      d.id,
      d.title,
      d.subtitle,
      d.category,
      d.description,
      d.content,
      d.difficulty,
      d.estimated_time,
      d.priority,
      d.keywords,
      d.related_docs,
      (1 - (d.embedding <=> query_embedding))::float AS score,
      'vector'::text AS match_type
    FROM public.documentation d
    WHERE d.embedding IS NOT NULL
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
  ELSE
    -- Fallback to keyword results if no embedding provided
    RETURN QUERY SELECT * FROM keyword_matches;
  END IF;

  DROP TABLE IF EXISTS keyword_matches;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (Public read access)
-- ============================================================================

ALTER TABLE public.documentation ENABLE ROW LEVEL SECURITY;

-- Anyone can read documentation
DROP POLICY IF EXISTS "Documentation is publicly readable" ON public.documentation;
CREATE POLICY "Documentation is publicly readable"
  ON public.documentation
  FOR SELECT
  USING (true);

-- Only authenticated users can insert/update (for embedding generation script)
DROP POLICY IF EXISTS "Authenticated users can manage docs" ON public.documentation;
CREATE POLICY "Authenticated users can manage docs"
  ON public.documentation
  FOR ALL
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.documentation IS 'Documentation entries with vector embeddings for semantic search';
COMMENT ON COLUMN public.documentation.embedding IS 'Vector embedding from OpenAI text-embedding-ada-002 (1536 dimensions)';
COMMENT ON FUNCTION search_documentation_vector IS 'Semantic search using vector similarity (cosine distance)';
COMMENT ON FUNCTION search_documentation_hybrid IS 'Hybrid search: tries keyword first (fast), falls back to vector (accurate)';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Vector search enabled!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run: npm run generate-embeddings (one-time, ~$0.02)';
  RAISE NOTICE '2. Hybrid search will use keyword first (free), vector as fallback';
  RAISE NOTICE '3. Estimated cost: <$2/month for ~1000 searches';
END $$;
