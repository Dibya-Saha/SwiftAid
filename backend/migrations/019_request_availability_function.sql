-- Units of a request item still free for new distribution assignments:
-- requested minus dispatched minus quantities promised to teams in
-- distributions that are neither delivered nor cancelled.
-- Inspectable copy: backend/src/sqls/database-objects/requestAvailabilitySqls.js

CREATE OR REPLACE FUNCTION request_item_available(p_request_item_id INT)
RETURNS INT
LANGUAGE sql
STABLE AS $$
  SELECT GREATEST(ri.quantity_requested - ri.quantity_dispatched - COALESCE((
    SELECT SUM(di.quantity)
    FROM distribution_items di
    JOIN distributions d ON d.distribution_id = di.distribution_id
    WHERE di.request_item_id = ri.request_item_id
      AND d.status NOT IN ('delivered', 'cancelled')
  ), 0), 0)
  FROM request_items ri
  WHERE ri.request_item_id = p_request_item_id;
$$;
