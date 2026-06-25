import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { Role, PERMISSIONS } from './models/Role';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import categoryRoutes from './routes/categories';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import familyRoutes from './routes/families';
import taxRoutes from './routes/taxes';
import outletRoutes from './routes/outlets';
import discountRoutes from './routes/discounts';
import modifierRoutes from './routes/modifiers';
import roleRoutes from './routes/roles';
import promotionRoutes from './routes/promotions';
import paymentMethodRoutes from './routes/paymentMethods';
import memberRoutes from './routes/members';
import settingRoutes from './routes/settings';
import reportRoutes from './routes/reports';
import summaryRoutes from './routes/summary';
import uploadRoutes from './routes/upload';
import closingRoutes from './routes/closings';
import path from 'path';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/taxes', taxRoutes);
app.use('/api/outlets', outletRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/modifiers', modifierRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/closings', closingRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

async function seedDefaultRoles() {
  const adminRole = await Role.findOne({ name: 'Admin' });
  if (!adminRole) {
    await Role.create({
      name: 'Admin',
      description: 'Akses penuh ke semua fitur',
      permissions: [...PERMISSIONS],
      isSystem: true,
    });
    console.log('Default Admin role created');
  }

  const cashierRole = await Role.findOne({ name: 'Kasir' });
  if (!cashierRole) {
    await Role.create({
      name: 'Kasir',
      description: 'Hanya bisa membuat transaksi dan melihat produk',
      permissions: ['sales.create', 'sales.view', 'sales.discount', 'products.view', 'members.view'],
      isSystem: true,
    });
    console.log('Default Kasir role created');
  }
}

async function start() {
  await connectDB();
  await seedDefaultRoles();
  app.listen(env.PORT, () => {
    console.log(`API running on port ${env.PORT}`);
  });
}

start();
