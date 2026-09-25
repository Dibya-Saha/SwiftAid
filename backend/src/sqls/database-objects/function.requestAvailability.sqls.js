// Units of a request item still free for new distribution assignments.
// Inspectable copy of backend/migrations/019_request_availability_function.sql.
// Used in production by GET_REQUEST_ITEMS in reliefRequestSqls.js and
// GET_ITEM_AVAILABILITY in distributionSqls.js via
// request_item_available(request_item_id).

const CREATE_REQUEST_AVAILABILITY_FUNCTION = `CREATE OR REPLACE FUNCTION request_item_available(p_request_item_id INT)
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
$$;`;

const DROP_REQUEST_AVAILABILITY_FUNCTION = `DROP FUNCTION IF EXISTS request_item_available(INT);`;

module.exports = {
  CREATE_REQUEST_AVAILABILITY_FUNCTION,
  DROP_REQUEST_AVAILABILITY_FUNCTION,
};
