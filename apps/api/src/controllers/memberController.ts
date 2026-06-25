import { Request, Response } from 'express';
import { Member } from '../models/Member';

export async function createMember(req: Request, res: Response) {
  try {
    const { name, phone, email, tier, notes } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ message: 'Nama dan nomor telepon harus diisi' });
    }
    const exists = await Member.findOne({ phone });
    if (exists) return res.status(400).json({ message: 'Nomor telepon sudah terdaftar' });
    const member = await Member.create({ name, phone, email, tier, notes });
    res.status(201).json(member);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getMembers(_req: Request, res: Response) {
  try {
    const members = await Member.find().sort({ createdAt: -1 });
    res.json(members);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getMember(req: Request, res: Response) {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    res.json(member);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateMember(req: Request, res: Response) {
  try {
    const member = await Member.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!member) return res.status(404).json({ message: 'Member not found' });
    res.json(member);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteMember(req: Request, res: Response) {
  try {
    await Member.findByIdAndDelete(req.params.id);
    res.json({ message: 'Member deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function searchMembers(req: Request, res: Response) {
  try {
    const q = req.query.q as string;
    if (!q) return res.json([]);
    const members = await Member.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ],
    }).limit(20).sort({ createdAt: -1 });
    res.json(members);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
