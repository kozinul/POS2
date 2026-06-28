import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from './models/User';
import { Family } from './models/Family';
import { Tax } from './models/Tax';
import { TaxRule } from './models/TaxRule';
import { PaymentMethod } from './models/PaymentMethod';
import { Category } from './models/Category';
import { Product } from './models/Product';

async function seed() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/pos2';
  await mongoose.connect(uri);
  console.log('Seeding database...');

  // Create admin user
  const adminExists = await User.findOne({ email: 'admin@pos.com' });
  if (!adminExists) {
    const password = await bcrypt.hash('admin', 10);
    await User.create({ userId: 'admin', name: 'Admin', email: 'admin@pos.com', password, role: 'admin', defaultStartingCash: 0 });
    console.log('Admin created: admin / admin');
  }

  // Create sample cashier
  const cashierExists = await User.findOne({ email: 'kasir@pos.com' });
  if (!cashierExists) {
    const password = await bcrypt.hash('kasir', 10);
    await User.create({ userId: 'kasir', name: 'Kasir', email: 'kasir@pos.com', password, role: 'cashier', defaultStartingCash: 500000 });
    console.log('Cashier created: kasir / kasir');
  } else if (cashierExists.userId !== 'kasir') {
    cashierExists.userId = 'kasir';
    cashierExists.password = await bcrypt.hash('kasir', 10);
    await cashierExists.save();
    console.log('Cashier updated: kasir / kasir');
  }

  // Create families
  const foodFamily = await Family.findOneAndUpdate(
    { slug: 'food' },
    { $setOnInsert: { name: 'Makanan', slug: 'food', description: 'Makanan & camilan' } },
    { upsert: true, new: true }
  );
  const beverageFamily = await Family.findOneAndUpdate(
    { slug: 'beverage' },
    { $setOnInsert: { name: 'Minuman', slug: 'beverage', description: 'Minuman dingin & hangat' } },
    { upsert: true, new: true }
  );
  const merchFamily = await Family.findOneAndUpdate(
    { slug: 'merchandise' },
    { $setOnInsert: { name: 'Merchandise', slug: 'merchandise', description: 'Produk merchandise & retail' } },
    { upsert: true, new: true }
  );
  console.log('Families created: Makanan, Minuman, Merchandise');

  // Create PPN 12% with DPP Nilai Lain (11/12) sesuai PMK terbaru
  // PPN = 12% × (11/12 × Harga Jual) → efektif ~11%
  const ppn = await Tax.findOneAndUpdate(
    { code: 'PPN' },
    {
      $setOnInsert: {
        name: 'PPN 12%',
        code: 'PPN',
        rate: 12,
        rateType: 'percentage',
        taxType: 'vat',
        description: 'Pajak Pertambahan Nilai 12% dengan DPP Nilai Lain (11/12). Efektif: 11%',
        dppFormula: { type: 'fraction', fraction: { numerator: 11, denominator: 12 } },
        rounding: 'math',
        roundingPrecision: 0,
        scope: 'all',
        includedByDefault: true,
        priority: 0,
        active: true,
        exemptUpTo: 0,
      },
    },
    { upsert: true, new: true }
  );
  console.log(`Tax created: ${ppn.name} (${ppn.rate}%, DPP 11/12, efektif ${(ppn.rate * 11 / 12).toFixed(2)}%)`);

  // Create Service Charge tax (optional, for multiple tax per item)
  const serviceCharge = await Tax.findOneAndUpdate(
    { code: 'SC' },
    {
      $setOnInsert: {
        name: 'Service Charge 5%',
        code: 'SC',
        rate: 5,
        rateType: 'percentage',
        taxType: 'service_charge',
        description: 'Biaya pelayanan 5%',
        dppFormula: { type: 'full' },
        rounding: 'math',
        roundingPrecision: 0,
        scope: 'all',
        includedByDefault: false,
        priority: 1,
        active: true,
        exemptUpTo: 0,
      },
    },
    { upsert: true, new: true }
  );
  console.log(`Tax created: ${serviceCharge.name}`);

  // Create Tax-Free example (untuk barang bebas pajak)
  const taxFree = await Tax.findOneAndUpdate(
    { code: 'TAX-FREE' },
    {
      $setOnInsert: {
        name: 'Bebas Pajak',
        code: 'TAX-FREE',
        rate: 0,
        rateType: 'percentage',
        taxType: 'vat',
        description: 'Barang/jasa bebas pajak (0%)',
        dppFormula: { type: 'full' },
        rounding: 'math',
        roundingPrecision: 0,
        scope: 'product',
        includedByDefault: false,
        priority: 0,
        active: true,
        exemptUpTo: 0,
      },
    },
    { upsert: true, new: true }
  );
  console.log(`Tax created: ${taxFree.name}`);

  // Create TaxRule for PPN regulation (future-ready)
  await TaxRule.findOneAndUpdate(
    { name: 'PPN 12% - DPP Nilai Lain (11/12)' },
    {
      $setOnInsert: {
        name: 'PPN 12% - DPP Nilai Lain (11/12)',
        description: 'PMK tentang PPN 12% dengan DPP Nilai Lain 11/12',
        taxCode: 'PPN',
        regulationReference: 'PMK-131/2024',
        conditions: {
          applicableFrom: new Date('2025-01-01'),
          minTransactionValue: 0,
        },
        actions: {
          rateOverride: 12,
          dppFractionOverride: { numerator: 11, denominator: 12 },
        },
        priority: 100,
        active: true,
      },
    },
    { upsert: true, new: true }
  );
  console.log('TaxRule created: PPN 12% with DPP Nilai Lain');

  // Create default payment methods
  const defaultPaymentMethods = [
    { name: 'Tunai', code: 'CASH', type: 'cash', requiresCardLastFour: false, description: 'Pembayaran tunai langsung', active: true },
    { name: 'QRIS', code: 'QRIS', type: 'non-cash', requiresCardLastFour: false, description: 'Pembayaran QRIS', active: true },
    { name: 'Kartu Debit', code: 'DEBIT', type: 'non-cash', requiresCardLastFour: true, description: 'Pembayaran kartu debit', active: true },
    { name: 'Kartu Kredit', code: 'CREDIT_CARD', type: 'non-cash', requiresCardLastFour: true, description: 'Pembayaran kartu kredit', active: true },
    { name: 'Transfer Bank', code: 'TRANSFER', type: 'non-cash', requiresCardLastFour: false, description: 'Pembayaran transfer bank', active: true },
  ];
  for (const pm of defaultPaymentMethods) {
    await PaymentMethod.findOneAndUpdate(
      { code: pm.code },
      { $setOnInsert: pm },
      { upsert: true, new: true }
    );
  }
  console.log(`${defaultPaymentMethods.length} default payment methods created`);

  // Create categories
  const foodCat = await Category.findOneAndUpdate(
    { name: 'Makanan Berat' },
    { $setOnInsert: { name: 'Makanan Berat', description: 'Nasi, mie, ayam', family: foodFamily._id } },
    { upsert: true, new: true }
  );
  const snackCat = await Category.findOneAndUpdate(
    { name: 'Camilan' },
    { $setOnInsert: { name: 'Camilan', description: 'Snack ringan', family: foodFamily._id } },
    { upsert: true, new: true }
  );
  const drinkCat = await Category.findOneAndUpdate(
    { name: 'Minuman' },
    { $setOnInsert: { name: 'Minuman', description: 'Minuman dingin & hangat', family: beverageFamily._id } },
    { upsert: true, new: true }
  );
  await Category.findOneAndUpdate(
    { name: 'Kopi' },
    { $setOnInsert: { name: 'Kopi', description: 'Kopi spesialti', family: beverageFamily._id } },
    { upsert: true, new: true }
  );
  console.log('Categories created');

  // Create sample products - all use PPN 12% with DPP Nilai Lain (included in price)
  const products = [
    { name: 'Nasi Goreng', price: 15000, costPrice: 10000, stock: 50, taxes: [{ tax: ppn._id, included: true }], discount: 0, stockManagement: true, category: foodCat._id },
    { name: 'Mie Goreng', price: 12000, costPrice: 8000, stock: 50, taxes: [{ tax: ppn._id, included: true }], discount: 0, stockManagement: true, category: foodCat._id },
    { name: 'Ayam Geprek', price: 18000, costPrice: 12000, stock: 30, taxes: [{ tax: ppn._id, included: true }], discount: 0, stockManagement: true, category: foodCat._id },
    { name: 'Es Teh Manis', price: 5000, costPrice: 2000, stock: 100, taxes: [{ tax: ppn._id, included: true }], discount: 0, stockManagement: true, category: drinkCat._id },
    { name: 'Kopi Hitam', price: 8000, costPrice: 3000, stock: 80, taxes: [{ tax: ppn._id, included: true }], discount: 0, stockManagement: true, category: drinkCat._id },
    { name: 'Jus Jeruk', price: 10000, costPrice: 5000, stock: 40, taxes: [{ tax: ppn._id, included: true }], discount: 0, stockManagement: true, category: drinkCat._id },
  ];

  for (const p of products) {
    await Product.findOneAndUpdate({ name: p.name }, { $setOnInsert: p }, { upsert: true });
  }
  console.log(`${products.length} sample products created`);

  console.log('Seed complete!');
  await mongoose.disconnect();
}

seed().catch(console.error);
