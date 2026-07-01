import Message from '../models/messageModel.js';
import User from '../models/userModel.js';
import Chat from '../models/chatModel.js';

//@description     Get all Messages
//@route           GET /api/Message/:chatId
//@access          Protected
export const allMessages = async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate('sender', 'name pic email')
      .populate('readBy', 'name pic')
      .populate('chat');
    res.json(messages);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

//@description     Create New Message (text, image, file, audio)
//@route           POST /api/Message/
//@access          Protected
export const sendMessage = async (req, res) => {
  const { content, chatId, messageType, fileUrl, fileName } = req.body;

  if (!chatId) return res.status(400).send({ message: 'chatId is required' });
  if (!content && !fileUrl) return res.status(400).send({ message: 'content or fileUrl is required' });

  const newMessage = {
    sender: req.user._id,
    content: content || '',
    chat: chatId,
    messageType: messageType || 'text',
    fileUrl: fileUrl || null,
    fileName: fileName || null,
    readBy: [req.user._id], // sender has already "read" their own message
  };

  try {
    let message = await Message.create(newMessage);
    message = await message.populate('sender', 'name pic');
    message = await message.populate('readBy', 'name pic');
    message = await message.populate('chat');
    message = await User.populate(message, {
      path: 'chat.users',
      select: 'name pic email',
    });

    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });
    res.json(message);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

//@description     Mark all messages in a chat as read by current user
//@route           PUT /api/Message/read/:chatId
//@access          Protected
export const markMessagesRead = async (req, res) => {
  try {
    await Message.updateMany(
      {
        chat: req.params.chatId,
        readBy: { $ne: req.user._id },
        sender: { $ne: req.user._id },
      },
      { $addToSet: { readBy: req.user._id } }
    );
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

//@description     Clear all messages in a chat
//@route           DELETE /api/message/clear/:chatId
//@access          Protected
export const clearMessages = async (req, res) => {
  try {
    await Message.deleteMany({ chat: req.params.chatId });
    await Chat.findByIdAndUpdate(req.params.chatId, { latestMessage: null });
    res.status(200).json({ message: "Messages cleared" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
