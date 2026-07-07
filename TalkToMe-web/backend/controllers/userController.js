import User from '../models/userModel.js';
import generateToken from '../config/generateToken.js';

//@description     Register new user
//@route           POST /api/user/
//@access          Public
export const registerUser = async (req, res) => {
  const { name, email, password, pic } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ message: 'Please Enter all the Feilds' });
    return;
  }

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400).json({ message: 'User already exists' });
    return;
  }

  const user = await User.create({
    name,
    email,
    password,
    pic,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      pic: user.pic,
      token: generateToken(user._id),
    });
  } else {
    res.status(400).json({ message: 'Failed to create the user' });
  }
};

//@description     Auth the user
//@route           POST /api/user/login
//@access          Public
export const authUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      pic: user.pic,
      token: generateToken(user._id),
    });
  } else {
    res.status(401).json({ message: 'Invalid Email or Password' });
  }
};

//@description     Get or Search all users
//@route           GET /api/user?search=
//@access          Public
export const allUsers = async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } },
        ],
      }
    : {};

  const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
  res.send(users);
};

//@description     Update user profile picture
//@route           PUT /api/user/update-pic
//@access          Protected
export const updateUserPic = async (req, res) => {
  const { pic } = req.body;
  if (!pic) {
    return res.status(400).json({ message: 'No picture URL provided' });
  }
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { pic },
      { new: true }
    ).select('-password');
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//@description     Update user name
//@route           PUT /api/user/update-name
//@access          Protected
export const updateUserName = async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Name cannot be empty' });
  }
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim() },
      { new: true }
    ).select('-password');
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
