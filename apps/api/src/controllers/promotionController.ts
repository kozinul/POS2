import { Request, Response } from 'express';
import { Promotion } from '../models/Promotion';

export async function createPromotion(req: Request, res: Response) {
  try {
    if (!req.body.name || !req.body.code || !req.body.rules?.length) {
      return res.status(400).json({ message: 'Nama, kode, dan minimal 1 rule harus diisi' });
    }
    const promo = await Promotion.create(req.body);
    const populated = await promo.populate(['outlets', 'paymentMethodIds']);
    res.status(201).json(populated);
  } catch (err: any) {
    if (err.code === 11000) return res.status(400).json({ message: `Kode "${req.body.code}" sudah digunakan` });
    res.status(500).json({ message: err.message });
  }
}

export async function getPromotions(_req: Request, res: Response) {
  try {
    const promos = await Promotion.find()
      .populate('outlets', 'name code')
      .populate('paymentMethodIds', 'name code')
      .sort({ priority: 1, createdAt: -1 });
    res.json(promos);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getPromotion(req: Request, res: Response) {
  try {
    const promo = await Promotion.findById(req.params.id)
      .populate('outlets', 'name code')
      .populate('paymentMethodIds', 'name code');
    if (!promo) return res.status(404).json({ message: 'Promotion not found' });
    res.json(promo);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getPromotionByCode(req: Request, res: Response) {
  try {
    const keyword = req.params.code;
    const promo = await Promotion.findOne({
      active: true,
      $or: [
        { code: keyword },
        { name: { $regex: keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
      ],
    })
      .populate('outlets', 'name code')
      .populate('paymentMethodIds', 'name code');
    if (!promo) return res.status(404).json({ message: 'Promo tidak ditemukan' });

    // Check usage limit
    const limit = promo.usageLimit?.perPromotion || 0;
    if (limit > 0 && promo.usedCount >= limit) {
      return res.status(400).json({ message: 'Kuota promo sudah habis' });
    }

    res.json(promo);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function updatePromotion(req: Request, res: Response) {
  try {
    if (req.body.requiresCode && !req.body.code && !(await Promotion.findById(req.params.id))?.code) {
      return res.status(400).json({ message: 'Kode promo harus diisi untuk promo khusus kode' });
    }
    const promo = await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!promo) return res.status(404).json({ message: 'Promotion not found' });
    const populated = await promo.populate(['outlets', 'paymentMethodIds']);
    res.json(populated);
  } catch (err: any) {
    if (err.code === 11000) return res.status(400).json({ message: `Kode "${req.body.code}" sudah digunakan` });
    res.status(500).json({ message: err.message });
  }
}

export async function deletePromotion(req: Request, res: Response) {
  try {
    await Promotion.findByIdAndDelete(req.params.id);
    res.json({ message: 'Promotion deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
