const { sendServerError } = require('../utils/errorResponse');
const ProductTypeModel = require('../models/productType.model');

async function getProductTypes(req, res) {
  try {
    const productTypes = await ProductTypeModel.getAll();
    res.json({ status: true, message: 'Product types fetched successfully', data: productTypes });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function createProductType(req, res) {
  try {
    const { productType, status } = req.body;
    if (!productType) {
      return res.status(400).json({ status: false, message: 'productType is required', data: null });
    }

    const duplicate = await ProductTypeModel.findByProductType(productType);
    if (duplicate) {
      return res.status(409).json({ status: false, message: 'Product Type already exists', data: null });
    }

    const created = await ProductTypeModel.create(productType, status || 'Active', req.body.description || null);
    res.status(201).json({ status: true, message: 'Product Type created successfully', data: created });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function updateProductType(req, res) {
  try {
    const { id } = req.params;
    const { productType, status } = req.body;

    const existing = await ProductTypeModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Product Type not found', data: null });
    }

    if (productType) {
      const duplicate = await ProductTypeModel.findByProductType(productType);
      if (duplicate && String(duplicate.id) !== String(id)) {
        return res.status(409).json({ status: false, message: 'Product Type already exists', data: null });
      }
    }

    const updated = await ProductTypeModel.update(
      id,
      productType ?? existing.productType,
      status ?? existing.status,
      req.body.description ?? existing.description
    );
    res.json({ status: true, message: 'Product Type updated successfully', data: updated });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function deleteProductType(req, res) {
  try {
    const { id } = req.params;

    const existing = await ProductTypeModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Product Type not found', data: null });
    }

    await ProductTypeModel.remove(id);
    res.json({ status: true, message: 'Product Type deleted successfully', data: null });
  } catch (err) {
    sendServerError(res, err);
  }
}

module.exports = { getProductTypes, createProductType, updateProductType, deleteProductType };
