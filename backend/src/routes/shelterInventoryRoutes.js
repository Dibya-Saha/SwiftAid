const express = require('express');
const { listShelterInventory, getShelterInventoryByShelter, adjustShelterInventory } = require('../controllers/shelterInventoryController');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();
router.get('/', requireAuth, requireRole('admin'), listShelterInventory);
router.post('/adjust', requireAuth, requireRole('admin'), adjustShelterInventory);
router.get('/:shelterId', requireAuth, requireRole('admin'), getShelterInventoryByShelter);
module.exports = router;
