const express = require('express');
const {
  listWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} = require('../controllers/warehouseController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, listWarehouses);
router.get('/:id', requireAuth, getWarehouse);
router.post('/', requireAuth, requireRole('admin'), createWarehouse);
router.patch('/:id', requireAuth, requireRole('admin'), updateWarehouse);
router.delete('/:id', requireAuth, requireRole('admin'), deleteWarehouse);

module.exports = router;
