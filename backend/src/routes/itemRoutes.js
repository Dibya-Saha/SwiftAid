const express = require('express');
const {
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
} = require('../controllers/itemController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, listItems);
router.get('/:id', requireAuth, getItem);
router.post('/', requireAuth, requireRole('admin'), createItem);
router.patch('/:id', requireAuth, requireRole('admin'), updateItem);
router.delete('/:id', requireAuth, requireRole('admin'), deleteItem);

module.exports = router;
