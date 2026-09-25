// Shared location lookup/creation query used by shelter, warehouse, and
// disaster controllers. The function participates in their existing transaction.

const GET_OR_CREATE_LOCATION = `SELECT get_or_create_location(
    $1::varchar, $2::varchar, $3::varchar, $4::varchar
  ) AS location_id`;

module.exports = { GET_OR_CREATE_LOCATION };
