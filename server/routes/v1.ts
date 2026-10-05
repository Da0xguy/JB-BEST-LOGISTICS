import { Router } from 'express';
import { requireAuth } from '../auth';
import { acceptRiderJob, adminOnly, bookShipment, createWarehouseMailbox, customerOrWarehouse, deleteStaffAccount, getRiderProfile, listAdminUsers, listRiderOffers, listWarehouseMailboxes, provisionStaffAccount, rejectRiderJob, riderOnly, setRiderActiveStatus, trackShipment, updateRiderLocation, updateStaffAccountStatus, warehouseOnly } from '../controllers/v1';
import { asyncRoute } from './asyncRoute';

const router = Router();

router.post('/shipments/book', requireAuth, customerOrWarehouse, asyncRoute(bookShipment));
router.get('/shipments/track/:trackingNumber', asyncRoute(trackShipment));
router.patch('/riders/location', requireAuth, riderOnly, asyncRoute(updateRiderLocation));
router.patch('/riders/status', requireAuth, riderOnly, asyncRoute(setRiderActiveStatus));
router.get('/riders/profile', requireAuth, riderOnly, asyncRoute(getRiderProfile));
router.get('/riders/offers', requireAuth, riderOnly, asyncRoute(listRiderOffers));
router.post('/riders/accept-job', requireAuth, riderOnly, asyncRoute(acceptRiderJob));
router.post('/riders/reject-job', requireAuth, riderOnly, asyncRoute(rejectRiderJob));
router.get('/admin/users', requireAuth, adminOnly, asyncRoute(listAdminUsers));
router.post('/admin/users', requireAuth, adminOnly, asyncRoute(provisionStaffAccount));
router.patch('/admin/users/:userId/status', requireAuth, adminOnly, asyncRoute(updateStaffAccountStatus));
router.delete('/admin/users/:userId', requireAuth, adminOnly, asyncRoute(deleteStaffAccount));
router.get('/warehouse/mailboxes', requireAuth, warehouseOnly, asyncRoute(listWarehouseMailboxes));
router.post('/warehouse/mailboxes', requireAuth, warehouseOnly, asyncRoute(createWarehouseMailbox));

export default router;
