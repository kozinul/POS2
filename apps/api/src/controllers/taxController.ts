import { Request, Response } from 'express';
import { Tax } from '../models/Tax';

export async function createTax(req: Request, res: Response) {
  try {
    const tax = await Tax.create(req.body);
    res.status(201).json(tax);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getTaxes(req: Request, res: Response) {
  try {
    const { outlet, active: activeParam } = req.query;
    const filter: any = {};
    if (outlet) {
      filter.$or = [{ outlets: { $in: [outlet] } }, { outlets: { $size: 0 } }];
    }
    if (activeParam === 'true') filter.active = true;
    const taxes = await Tax.find(filter).populate('outlets', 'name code').sort({ name: 1 });
    res.json(taxes);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateTax(req: Request, res: Response) {
  try {
    const tax = await Tax.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!tax) return res.status(404).json({ message: 'Tax not found' });
    res.json(tax);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteTax(req: Request, res: Response) {
  try {
    await Tax.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tax deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
