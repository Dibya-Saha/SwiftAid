const express = require('express');
const {
  createReliefRequest,
  listReliefRequests,
  getReliefRequest,
  updateReliefRequestStatus,
  updateDispatchedQuantity,
  listEligibleRequests,
  donateToReliefRequest,
} = require('../controllers/reliefRequestController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/eligible', requireAuth, requireRole('donor'), listEligibleRequests);
router.post('/:id/donate', requireAuth, requireRole('donor'), donateToReliefRequest);
router.post('/', requireAuth, requireRole('admin'), createReliefRequest);
router.get('/', requireAuth, listReliefRequests);
router.get('/:id', requireAuth, getReliefRequest);
router.patch('/:id/status', requireAuth, requireRole('admin'), updateReliefRequestStatus);
router.patch('/:id/items/:itemId', requireAuth, requireRole('admin'), updateDispatchedQuantity);

module.exports = router;
