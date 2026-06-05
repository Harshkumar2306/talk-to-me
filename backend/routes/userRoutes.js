import express from 'express';
import {
  registerUser,
  authUser,
  allUsers,
  updateUserPic,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').post(registerUser).get(protect, allUsers);
router.post('/login', authUser);
router.put('/update-pic', protect, updateUserPic);

export default router;
