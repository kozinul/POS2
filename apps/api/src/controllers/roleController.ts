import { Request, Response } from 'express';
import { Role } from '../models/Role';

export async function createRole(req: Request, res: Response) {
  try {
    const { name, description, permissions } = req.body;
    if (!name) return res.status(400).json({ message: 'Nama role harus diisi' });
    const role = await Role.create({ name, description: description || '', permissions: permissions || [] });
    res.status(201).json(role);
  } catch (err: any) {
    if (err.code === 11000) return res.status(400).json({ message: `Role "${req.body.name}" sudah ada` });
    res.status(500).json({ message: err.message });
  }
}

export async function getRoles(_req: Request, res: Response) {
  try {
    const roles = await Role.find().sort({ name: 1 });
    res.json(roles);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getRole(req: Request, res: Response) {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ message: 'Role not found' });
    res.json(role);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateRole(req: Request, res: Response) {
  try {
    const { name, description, permissions } = req.body;
    const role = await Role.findByIdAndUpdate(
      req.params.id,
      { name, description: description || '', permissions: permissions || [] },
      { new: true }
    );
    if (!role) return res.status(404).json({ message: 'Role not found' });
    res.json(role);
  } catch (err: any) {
    if (err.code === 11000) return res.status(400).json({ message: `Role "${req.body.name}" sudah ada` });
    res.status(500).json({ message: err.message });
  }
}

export async function deleteRole(req: Request, res: Response) {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ message: 'Role not found' });
    if (role.isSystem) return res.status(400).json({ message: 'Tidak bisa menghapus role system' });
    await Role.findByIdAndDelete(req.params.id);
    res.json({ message: 'Role deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
