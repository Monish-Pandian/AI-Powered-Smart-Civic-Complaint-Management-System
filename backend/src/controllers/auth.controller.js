import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {

 try {

  const { name, email, password, department } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    name,
    email,
    password: hashedPassword,
    department
  });

  await user.save();

  res.json({ message: "User registered" });

 } catch (error) {
  res.status(500).json({ message: "Error" });
 }

};
export const login = async (req, res) => {

 try {

  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(400).json({ message: "Invalid password" });
  }
 const token = jwt.sign(
{
  id: user._id,
  name: user.name,
  email: user.email,
  department: user.department,
  role: user.role
},
process.env.JWT_SECRET,
{ expiresIn: "1d" }
);


res.json({
  token,
  user: {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department
  }
});

 } catch (error) {
  res.status(500).json({ message: "Server Error" });
 }

};