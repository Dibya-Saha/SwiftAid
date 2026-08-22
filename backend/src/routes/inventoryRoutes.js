const express = require('express');
const {
  listInventory,
  getInventory,
  adjustInventory,
  updateInventory,
  deleteInventory,
} = require('../controllers/inventoryController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, listInventory);
router.get('/:id', requireAuth, getInventory);
router.post('/adjust', requireAuth, requireRole('admin'), adjustInventory);
router.patch('/:id', requireAuth, requireRole('admin'), updateInventory);
router.delete('/:id', requireAuth, requireRole('admin'), deleteInventory);

module.exports = router;
