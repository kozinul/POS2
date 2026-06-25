import { Request, Response } from 'express';
import { Family } from '../models/Family';

export async function createFamily(req: Request, res: Response) {
  try {
    const family = await Family.create(req.body);
    res.status(201).json(family);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getFamilies(_req: Request, res: Response) {
  try {
    const families = await Family.find().sort({ name: 1 });
    res.json(families);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateFamily(req: Request, res: Response) {
  try {
    const family = await Family.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!family) return res.status(404).json({ message: 'Family not found' });
    res.json(family);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteFamily(req: Request, res: Response) {
  try {
    await Family.findByIdAndDelete(req.params.id);
    res.json({ message: 'Family deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
