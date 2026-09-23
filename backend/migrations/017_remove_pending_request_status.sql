-- The 'pending' relief-request status is no longer used: new requests start as
-- 'waiting_stock' and nothing else creates 'pending'. Fold any stranded rows
-- back into the active workflow instead of leaving them unsettable.

UPDATE relief_requests SET status = 'waiting_stock'
WHERE LOWER(status) = 'pending';
