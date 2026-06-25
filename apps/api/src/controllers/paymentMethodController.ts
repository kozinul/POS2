import { Request, Response } from 'express';
import { PaymentMethod } from '../models/PaymentMethod';

export async function createPaymentMethod(req: Request, res: Response) {
  try {
    if (!req.body.name || !req.body.code) {
      return res.status(400).json({ message: 'Nama dan kode harus diisi' });
    }
    const existing = await PaymentMethod.findOne({ code: req.body.code });
    if (existing) {
      return res.status(400).json({ message: `Kode "${req.body.code}" sudah digunakan` });
    }
    const pm = await PaymentMethod.create(req.body);
    res.status(201).json(pm);
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(400).json({ message: `Kode "${req.body.code}" sudah digunakan` });
    }
    res.status(500).json({ message: err.message });
  }
}

export async function getPaymentMethods(req: Request, res: Response) {
  try {
    const { outlet } = req.query;
    const filter: any = {};
    if (outlet) {
      filter.$or = [{ outlets: { $in: [outlet] } }, { outlets: { $size: 0 } }];
    }
    const methods = await PaymentMethod.find(filter).populate('outlets', 'name code').sort({ name: 1 });
    res.json(methods);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function updatePaymentMethod(req: Request, res: Response) {
  try {
    if (!req.body.name || !req.body.code) {
      return res.status(400).json({ message: 'Nama dan kode harus diisi' });
    }
    const existing = await PaymentMethod.findOne({ code: req.body.code, _id: { $ne: req.params.id } });
    if (existing) {
      return res.status(400).json({ message: `Kode "${req.body.code}" sudah digunakan` });
    }
    const pm = await PaymentMethod.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!pm) return res.status(404).json({ message: 'Payment method not found' });
    res.json(pm);
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(400).json({ message: `Kode "${req.body.code}" sudah digunakan` });
    }
    res.status(500).json({ message: err.message });
  }
}

export async function deletePaymentMethod(req: Request, res: Response) {
  try {
    await PaymentMethod.findByIdAndDelete(req.params.id);
    res.json({ message: 'Payment method deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
