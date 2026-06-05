import mongoose from 'mongoose';
import seedGuestUser from './seeder.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chatsphere');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    // Auto-create guest user if it doesn't exist
    await seedGuestUser();
  } catch (error) {
    console.error(`\n❌ MONGODB CONNECTION ERROR: ${error.message}`);
    console.error(`👉 Fix: Please check your MONGO_URI in Render Environment Variables, and ensure you allowed '0.0.0.0/0' in MongoDB Atlas Network Access!\n`);
  }
};

export default connectDB;
