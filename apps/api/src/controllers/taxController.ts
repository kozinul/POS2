import { Request, Response } from 'express';
import { Tax } from '../models/Tax';
import { TaxRule } from '../models/TaxRule';
import { calculateTaxes, validateTaxConfiguration, calculateProductTaxDisplay } from '../services/taxEngine';

// ─── Tax CRUD ────────────────────────────────────────────────────────────────

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
    const taxes = await Tax.find(filter)
      .populate('outlets', 'name code')
      .populate('categoryIds', 'name')
      .populate('productIds', 'name')
      .sort({ priority: 1, name: 1 });
    res.json(taxes);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getTax(req: Request, res: Response) {
  try {
    const tax = await Tax.findById(req.params.id)
      .populate('outlets', 'name code')
      .populate('categoryIds', 'name')
      .populate('productIds', 'name');
    if (!tax) return res.status(404).json({ message: 'Tax not found' });
    res.json(tax);
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

// ─── Tax Calculation ─────────────────────────────────────────────────────────

export async function calculateTransactionTax(req: Request, res: Response) {
  try {
    const result = await calculateTaxes(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getProductTaxDisplay(req: Request, res: Response) {
  try {
    const { price, productId, categoryId, transactionType, outletId } = req.query;
    const result = await calculateProductTaxDisplay(
      Number(price) || 0,
      String(productId || ''),
      String(categoryId || '') || undefined,
      String(transactionType || '') || undefined,
      String(outletId || '') || undefined
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

// ─── Tax Validation ──────────────────────────────────────────────────────────

export async function validateTaxes(req: Request, res: Response) {
  try {
    const result = await validateTaxConfiguration(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

// ─── Tax Rules ───────────────────────────────────────────────────────────────

export async function createTaxRule(req: Request, res: Response) {
  try {
    const rule = await TaxRule.create(req.body);
    res.status(201).json(rule);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getTaxRules(req: Request, res: Response) {
  try {
    const { active } = req.query;
    const filter: any = {};
    if (active === 'true') filter.active = true;
    const rules = await TaxRule.find(filter)
      .sort({ priority: -1, name: 1 });
    res.json(rules);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getTaxRule(req: Request, res: Response) {
  try {
    const rule = await TaxRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ message: 'Tax rule not found' });
    res.json(rule);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateTaxRule(req: Request, res: Response) {
  try {
    const rule = await TaxRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) return res.status(404).json({ message: 'Tax rule not found' });
    res.json(rule);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteTaxRule(req: Request, res: Response) {
  try {
    await TaxRule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tax rule deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
