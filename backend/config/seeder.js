import User from '../models/userModel.js';

/**
 * Seeds the database with a guest user on startup.
 * Always deletes and recreates to ensure password is correct.
 */
const seedGuestUser = async () => {
  try {
    // Delete old guest user (might have bad double-hashed password from previous run)
    await User.deleteOne({ email: 'guest@example.com' });

    // Recreate with plain text — the pre-save hook hashes it correctly
    await User.create({
      name: 'Guest User',
      email: 'guest@example.com',
      password: '123456',
      pic: 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg',
    });

    console.log('🌱 Guest user seeded successfully!');
  } catch (error) {
    console.error('❌ Failed to seed guest user:', error.message);
  }
};

export default seedGuestUser;
