// Relief-request totals function SQL.
// Inspectable copy of backend/migrations/022_request_summary_function.sql.
// Used in production by LIST_RELIEF_REQUESTS in reliefRequestSqls.js via
// request_summary(request_id).

const CREATE_REQUEST_SUMMARY_FUNCTION = `CREATE OR REPLACE FUNCTION request_summary(p_request_id INT)
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
$$;`;

const DROP_REQUEST_SUMMARY_FUNCTION = `DROP FUNCTION IF EXISTS request_summary(INT);`;

module.exports = {
  CREATE_REQUEST_SUMMARY_FUNCTION,
  DROP_REQUEST_SUMMARY_FUNCTION,
};
