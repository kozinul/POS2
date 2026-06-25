import { Request, Response } from 'express';
import { Discount } from '../models/Discount';

export async function createDiscount(req: Request, res: Response) {
  try {
    if (!req.body.name || !req.body.type) {
      return res.status(400).json({ message: 'Nama dan tipe diskon harus diisi' });
    }
    const discount = await Discount.create(req.body);
    const populated = await discount.populate(['outlets', 'targetId']);
    res.status(201).json(populated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getDiscounts(_req: Request, res: Response) {
  try {
    const discounts = await Discount.find()
      .populate('outlets', 'name code')
      .populate('targetId')
      .sort({ createdAt: -1 });
    res.json(discounts);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateDiscount(req: Request, res: Response) {
  try {
    if (!req.body.name || !req.body.type) {
      return res.status(400).json({ message: 'Nama dan tipe diskon harus diisi' });
    }
    const discount = await Discount.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!discount) return res.status(404).json({ message: 'Discount not found' });
    const populated = await discount.populate(['outlets', 'targetId']);
    res.json(populated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteDiscount(req: Request, res: Response) {
  try {
    await Discount.findByIdAndDelete(req.params.id);
    res.json({ message: 'Discount deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
