import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';

async function generateUserId(role: string): Promise<string> {
  const prefix = role === 'admin' ? 'ADM' : 'CSH';
  const count = await User.countDocuments({ role });
  return `${prefix}${String(count + 1).padStart(3, '0')}`;
}

export async function createUser(req: Request, res: Response) {
  try {
    const { userId, name, email, password, role, outlets, roleRef, defaultStartingCash } = req.body;
    const finalId = userId || await generateUserId(role || 'cashier');

    const existsId = await User.findOne({ userId: finalId.toLowerCase() });
    if (existsId) return res.status(400).json({ message: 'User ID sudah digunakan' });

    const existsEmail = await User.findOne({ email: email.toLowerCase() });
    if (existsEmail) return res.status(400).json({ message: 'Email sudah digunakan' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ userId: finalId.toLowerCase(), name, email, password: hashed, role, outlets: outlets || [], roleRef: roleRef || undefined, defaultStartingCash: defaultStartingCash || 0 });
    const populated = await user.populate(['outlets', 'roleRef']);
    res.status(201).json({ id: populated._id, userId: populated.userId, name: populated.name, email: populated.email, role: populated.role, outlets: populated.outlets, roleRef: populated.roleRef, defaultStartingCash: populated.defaultStartingCash });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getUsers(_req: Request, res: Response) {
  try {
    const users = await User.find().select('-password').populate('outlets', 'name').populate('roleRef', 'name permissions').sort({ createdAt: -1 });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const { userId, name, email, password, role, outlets, roleRef, defaultStartingCash } = req.body;
    const update: any = {};
    if (userId !== undefined) update.userId = userId.toLowerCase();
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email;
    if (password) update.password = await bcrypt.hash(password, 10);
    if (role !== undefined) update.role = role;
    if (outlets !== undefined) update.outlets = outlets || [];
    if (roleRef !== undefined) update.roleRef = roleRef || null;
    if (defaultStartingCash !== undefined) update.defaultStartingCash = defaultStartingCash;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password').populate('outlets', 'name').populate('roleRef', 'name permissions');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
