import { Request, Response } from 'express';
import { Setting } from '../models/Setting';

const defaultSettings = {
  currency: 'IDR',
  companyName: 'POS Indonesia',
  paymentMethods: ['cash', 'qris', 'debit'],
};

export async function getSettings(_req: Request, res: Response) {
  try {
    const settings = await Setting.find();
    const map: Record<string, any> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    res.json({ ...defaultSettings, ...map });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateSetting(req: Request, res: Response) {
  try {
    const { key, value } = req.body;
    const setting = await Setting.findOneAndUpdate(
      { key },
      { key, value },
      { upsert: true, new: true }
    );
    res.json(setting);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
