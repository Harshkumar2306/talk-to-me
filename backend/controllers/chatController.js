import Chat from '../models/chatModel.js';
import User from '../models/userModel.js';
import Message from '../models/messageModel.js';

//@description     Create or fetch One to One Chat
//@route           POST /api/chat/
//@access          Protected
export const accessChat = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).send({ message: 'UserId param not sent with request' });

  let isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate('users', '-password')
    .populate('latestMessage');

  isChat = await User.populate(isChat, {
    path: 'latestMessage.sender',
    select: 'name pic email',
  });

  if (isChat.length > 0) {
    res.send(isChat[0]);
  } else {
    try {
      const createdChat = await Chat.create({
        chatName: 'sender',
        isGroupChat: false,
        users: [req.user._id, userId],
      });
      const FullChat = await Chat.findOne({ _id: createdChat._id }).populate('users', '-password');
      res.status(200).json(FullChat);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
};

//@description     Fetch all chats for a user
//@route           GET /api/chat/
//@access          Protected
export const fetchChats = async (req, res) => {
  try {
    let results = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate('users', '-password')
      .populate('groupAdmin', '-password')
      .populate('latestMessage')
      .sort({ updatedAt: -1 });

    results = await User.populate(results, {
      path: 'latestMessage.sender',
      select: 'name pic email',
    });
    res.status(200).send(results);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

//@description     Create New Group Chat
//@route           POST /api/chat/group
//@access          Protected
export const createGroupChat = async (req, res) => {
  if (!req.body.users || !req.body.name) {
    return res.status(400).send({ message: 'Please fill all the fields' });
  }

  let users = JSON.parse(req.body.users);
  if (users.length < 2) {
    return res.status(400).send({ message: 'More than 2 users are required to form a group chat' });
  }

  users.push(req.user);

  try {
    const groupChat = await Chat.create({
      chatName: req.body.name,
      users,
      isGroupChat: true,
      groupAdmin: req.user,
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    res.status(200).json(fullGroupChat);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

//@description     Rename Group Chat
//@route           PUT /api/chat/rename
//@access          Protected
export const renameGroup = async (req, res) => {
  const { chatId, chatName } = req.body;
  try {
    const updatedChat = await Chat.findByIdAndUpdate(chatId, { chatName }, { new: true })
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    if (!updatedChat) return res.status(404).json({ message: 'Chat Not Found' });
    res.json(updatedChat);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

//@description     Add user to Group
//@route           PUT /api/chat/groupadd
//@access          Protected
export const addToGroup = async (req, res) => {
  const { chatId, userId } = req.body;
  try {
    const added = await Chat.findByIdAndUpdate(
      chatId,
      { $push: { users: userId } },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    if (!added) return res.status(404).json({ message: 'Chat Not Found' });
    res.json(added);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

//@description     Remove user from Group
//@route           PUT /api/chat/groupremove
//@access          Protected
export const removeFromGroup = async (req, res) => {
  const { chatId, userId } = req.body;
  try {
    const removed = await Chat.findByIdAndUpdate(
      chatId,
      { $pull: { users: userId } },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    if (!removed) return res.status(404).json({ message: 'Chat Not Found' });
    res.json(removed);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

//@description     Delete a Chat
//@route           DELETE /api/chat/:id
//@access          Protected
export const deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).send({ message: "Chat Not Found" });

    const isUserInChat = chat.users.some(u => u.toString() === req.user._id.toString());
    const isAdmin = chat.groupAdmin && chat.groupAdmin.toString() === req.user._id.toString();

    if (!isUserInChat && !isAdmin) {
      return res.status(403).send({ message: "Unauthorized" });
    }

    await Chat.findByIdAndDelete(req.params.id);
    await Message.deleteMany({ chat: req.params.id });

    res.status(200).send({ message: "Chat deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
