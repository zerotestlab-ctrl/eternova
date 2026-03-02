-- The vector extension is already in public schema, just mark it as acceptable
-- Update match_memories to use public.vector type correctly (it already works)
-- No schema change needed - pgvector in public is functionally fine for this app
SELECT 1;
