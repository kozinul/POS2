import { Request, Response } from 'express';
import { Outlet } from '../models/Outlet';

export async function createOutlet(req: Request, res: Response) {
  try {
    const outlet = await Outlet.create(req.body);
    res.status(201).json(outlet);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getOutlets(_req: Request, res: Response) {
  try {
    const outlets = await Outlet.find().sort({ name: 1 });
    res.json(outlets);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getOutlet(req: Request, res: Response) {
  try {
    const outlet = await Outlet.findById(req.params.id);
    if (!outlet) return res.status(404).json({ message: 'Outlet not found' });
    res.json(outlet);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateOutlet(req: Request, res: Response) {
  try {
    const outlet = await Outlet.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!outlet) return res.status(404).json({ message: 'Outlet not found' });
    res.json(outlet);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteOutlet(req: Request, res: Response) {
  try {
    await Outlet.findByIdAndDelete(req.params.id);
    res.json({ message: 'Outlet deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
