import bcrypt from 'bcrypt';
import User from '../models/userModel.js';

/**
 * Seeds the database with a guest user on startup.
 * If the guest user already exists, it does nothing.
 */
const seedGuestUser = async () => {
  try {
    const existing = await User.findOne({ email: 'guest@example.com' });
    if (existing) {
      console.log('✅ Guest user already exists.');
      return;
    }

    const hashedPassword = await bcrypt.hash('123456', 10);
    await User.create({
      name: 'Guest User',
      email: 'guest@example.com',
      password: hashedPassword,
      pic: 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg',
    });

    console.log('🌱 Guest user created successfully!');
  } catch (error) {
    console.error('❌ Failed to seed guest user:', error.message);
  }
};

export default seedGuestUser;
