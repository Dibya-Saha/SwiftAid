export const TEAM_STATUSES = ['all', 'pending_approval', 'approved', 'rejected', 'disbanded'];
export const EMPTY_SHELTER = { name: '', address: '', capacity: '', division: '', district: '', upazila: '', union: '' };
export const EMPTY_WAREHOUSE = { name: '', division: '', district: '', upazila: '', union: '' };
export const EMPTY_ITEM = { name: '', category: '', unit: '' };
export const ITEM_CATEGORIES = ['food', 'water', 'medical', 'hygiene', 'clothing', 'shelter', 'rescue', 'logistics', 'other'];
export const ITEM_UNITS = ['kg', 'g', 'litre', 'ml', 'piece', 'pack', 'box', 'bag', 'bottle', 'can', 'set', 'pair', 'tablet'];
export const EMPTY_VICTIM = { full_name: '', date_of_birth: '', gender: '', priority_level: 'normal', status: 'registered', disaster_id: '', shelter_id: '' };
export const EMPTY_INVENTORY = { warehouse_id: '', item_id: '', operation: 'add', quantity: '' };

export function statusLabel(status) {
  return String(status || '').replace('_', ' ');
}
