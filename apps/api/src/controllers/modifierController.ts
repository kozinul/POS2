import { Request, Response } from 'express';
import { Modifier } from '../models/Modifier';

export async function createModifier(req: Request, res: Response) {
  try {
    const modifier = await Modifier.create(req.body);
    res.status(201).json(modifier);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getModifiers(_req: Request, res: Response) {
  try {
    const modifiers = await Modifier.find().populate('productId', 'name').populate('family', 'name').sort({ name: 1 });
    res.json(modifiers);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateModifier(req: Request, res: Response) {
  try {
    const modifier = await Modifier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!modifier) return res.status(404).json({ message: 'Modifier not found' });
    res.json(modifier);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteModifier(req: Request, res: Response) {
  try {
    await Modifier.findByIdAndDelete(req.params.id);
    res.json({ message: 'Modifier deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
