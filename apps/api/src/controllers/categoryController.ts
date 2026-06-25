import { Request, Response } from 'express';
import { Category } from '../models/Category';

export async function createCategory(req: Request, res: Response) {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getCategories(req: Request, res: Response) {
  try {
    const { active } = req.query;
    const filter: any = {};
    if (active !== undefined) filter.active = active === 'true';
    const categories = await Category.find(filter).populate('family', 'name slug').sort({ name: 1 });
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateCategory(req: Request, res: Response) {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteCategory(req: Request, res: Response) {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
