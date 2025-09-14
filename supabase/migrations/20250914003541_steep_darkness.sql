/*
  # Add indexes to responses table for performance

  1. Performance Improvements
    - Add index on `form_id` for efficient filtering
    - Add composite index on `(form_id, created_at)` for efficient filtering and ordering
    - These indexes will dramatically improve query performance and prevent timeouts

  2. Query Optimization
    - Optimizes the main query: `SELECT * FROM responses WHERE form_id = ? ORDER BY created_at DESC`
    - Reduces query execution time from potentially minutes to milliseconds
    - Prevents database statement timeouts on large datasets
*/

-- Add index on form_id for efficient filtering
CREATE INDEX IF NOT EXISTS idx_responses_form_id_optimized 
ON public.responses (form_id);

-- Add composite index on (form_id, created_at) for efficient filtering and ordering
CREATE INDEX IF NOT EXISTS idx_responses_form_id_created_at 
ON public.responses (form_id, created_at DESC);

-- Add index on created_at for general ordering queries
CREATE INDEX IF NOT EXISTS idx_responses_created_at_desc 
ON public.responses (created_at DESC);