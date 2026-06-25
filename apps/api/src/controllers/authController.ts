import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { env } from '../config/env';

export async function login(req: Request, res: Response) {
  try {
    const { userId, password } = req.body;
    const user = await User.findOne({ userId: userId.toLowerCase() }).populate('outlets', 'name');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'ID atau password salah' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: { id: user._id, userId: user.userId, name: user.name, email: user.email, role: user.role, outlets: user.outlets },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getMe(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const user = await User.findById(userId).select('-password').populate('outlets', 'name');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
