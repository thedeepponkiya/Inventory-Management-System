const CategoryModel = require('../models/category.model');

async function getCategories(req, res) {
  try {
    const categories = await CategoryModel.getAll();
    res.json({ status: true, message: 'Categories fetched successfully', data: categories });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function createCategory(req, res) {
  try {
    const { category, status } = req.body;
    if (!category) {
      return res.status(400).json({ status: false, message: 'category is required', data: null });
    }

    const duplicate = await CategoryModel.findByCategory(category);
    if (duplicate) {
      return res.status(409).json({ status: false, message: 'Category already exists', data: null });
    }

    const created = await CategoryModel.create(category, status || 'Active', req.body.description || null);
    res.status(201).json({ status: true, message: 'Category created successfully', data: created });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { category, status } = req.body;

    const existing = await CategoryModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Category not found', data: null });
    }

    if (category) {
      const duplicate = await CategoryModel.findByCategory(category);
      if (duplicate && String(duplicate.id) !== String(id)) {
        return res.status(409).json({ status: false, message: 'Category already exists', data: null });
      }
    }

    const updated = await CategoryModel.update(
      id,
      category ?? existing.category,
      status ?? existing.status,
      req.body.description ?? existing.description
    );
    res.json({ status: true, message: 'Category updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function deleteCategory(req, res) {
  try {
    const { id } = req.params;

    const existing = await CategoryModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Category not found', data: null });
    }

    await CategoryModel.remove(id);
    res.json({ status: true, message: 'Category deleted successfully', data: null });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
