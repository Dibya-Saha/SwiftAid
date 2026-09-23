-- Totals for one relief request in a single call: requested, dispatched,
-- and remaining units. Replaces repeated per-request aggregation in queries.
-- Inspectable copy: backend/src/sqls/database-objects/requestSummarySqls.js

CREATE OR REPLACE FUNCTION request_summary(p_request_id INT)
RETURNS TABLE (
  total_requested INT,
  total_dispatched INT,
  total_remaining INT
)
LANGUAGE sql
STABLE AS $$
  SELECT COALESCE(SUM(quantity_requested), 0)::int,
         COALESCE(SUM(quantity_dispatched), 0)::int,
         COALESCE(SUM(quantity_requested - quantity_dispatched), 0)::int
  FROM request_items
  WHERE request_id = p_request_id;
$$;
