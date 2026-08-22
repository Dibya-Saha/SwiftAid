const express = require('express');
const {
  listShelters,
  getShelter,
  createShelter,
  updateShelter,
  deleteShelter,
} = require('../controllers/shelterController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, listShelters);
router.get('/:id', requireAuth, getShelter);
router.post('/', requireAuth, requireRole('admin'), createShelter);
router.patch('/:id', requireAuth, requireRole('admin'), updateShelter);
router.delete('/:id', requireAuth, requireRole('admin'), deleteShelter);

module.exports = router;
