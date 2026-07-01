import express from 'express';
import { allMessages, sendMessage, markMessagesRead } from '../controllers/messageControllers.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/:chatId').get(protect, allMessages);
router.route('/').post(protect, sendMessage);
router.route('/read/:chatId').put(protect, markMessagesRead);

export default router;
