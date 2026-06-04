import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chatsphere');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`\n❌ MONGODB CONNECTION ERROR: ${error.message}`);
    console.error(`👉 Fix: Please check your MONGO_URI in Render Environment Variables, and ensure you allowed '0.0.0.0/0' in MongoDB Atlas Network Access!\n`);
    // Removed process.exit(1) so Render stops crash-looping and the logs can be read
  }
};

export default connectDB;
