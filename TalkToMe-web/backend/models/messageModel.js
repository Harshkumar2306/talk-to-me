import mongoose from 'mongoose';

const messageSchema = mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: { type: String, trim: true, default: '' },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    messageType: { type: String, enum: ['text', 'image', 'file', 'audio'], default: 'text' },
    fileUrl: { type: String },
    fileName: { type: String },
  },
  { timestamps: true }
);

const Message = mongoose.model('Message', messageSchema);
export default Message;
