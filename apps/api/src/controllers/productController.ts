import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { Order } from '../models/Order';

export async function createProduct(req: Request, res: Response) {
  try {
    const product = await Product.create(req.body);
      const populated = await product.populate(['category', 'outlets', 'taxes.tax', 'modifiers']);
    res.status(201).json(populated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getProducts(req: Request, res: Response) {
  try {
    const { search, category, active, page = '1', limit = '20' } = req.query;
    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: search },
      ];
    }
    if (category) filter.category = category;
    if (active !== undefined) filter.active = active === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate(['category', 'outlets', 'taxes.tax', 'modifiers'])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(filter),
    ]);

    res.json({ products, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getPopularProducts(req: Request, res: Response) {
  try {
    const popular = await Order.aggregate([
      { $match: { status: { $ne: 'voided' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.qty' },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 20 },
    ]);

    const ids = popular.map((p) => p._id);
    const products = await Product.find({ _id: { $in: ids }, active: true })
      .populate(['category', 'outlets', 'taxes.tax', 'modifiers']);

    // Sort by the same order as aggregation result
    const sorted = ids.map((id) => products.find((p) => String(p._id) === String(id))).filter(Boolean);

    res.json({ products: sorted, total: sorted.length, page: 1, totalPages: 1 });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getProduct(req: Request, res: Response) {
  try {
    const product = await Product.findById(req.params.id).populate(['category', 'outlets', 'taxes.tax', 'modifiers']);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateProduct(req: Request, res: Response) {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate(['category', 'outlets', 'taxes.tax', 'modifiers']);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteProduct(req: Request, res: Response) {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
