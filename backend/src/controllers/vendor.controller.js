const VendorModel = require('../models/vendor.model');

async function getVendors(req, res) {
  try {
    const vendors = await VendorModel.getAll();
    res.json({ status: true, message: 'Vendors fetched successfully', data: vendors });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function createVendor(req, res) {
  try {
    const { vendorName, email, phoneNumber, address, city, zipCode } = req.body;
    if (!vendorName) {
      return res.status(400).json({ status: false, message: 'vendorName is required', data: null });
    }

    const duplicate = await VendorModel.findByVendorName(vendorName);
    if (duplicate) {
      return res.status(409).json({ status: false, message: 'Vendor already exists', data: null });
    }

    const created = await VendorModel.create(vendorName, email, phoneNumber, address, city, zipCode);
    res.status(201).json({ status: true, message: 'Vendor created successfully', data: created });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function updateVendor(req, res) {
  try {
    const { id } = req.params;
    const { vendorName, email, phoneNumber, address, city, zipCode } = req.body;

    const existing = await VendorModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Vendor not found', data: null });
    }

    if (vendorName) {
      const duplicate = await VendorModel.findByVendorName(vendorName);
      if (duplicate && String(duplicate.id) !== String(id)) {
        return res.status(409).json({ status: false, message: 'Vendor already exists', data: null });
      }
    }

    const updated = await VendorModel.update(
      id,
      vendorName ?? existing.vendorName,
      email ?? existing.email,
      phoneNumber ?? existing.phoneNumber,
      address ?? existing.address,
      city ?? existing.city,
      zipCode ?? existing.zipCode
    );
    res.json({ status: true, message: 'Vendor updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function deleteVendor(req, res) {
  try {
    const { id } = req.params;

    const existing = await VendorModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Vendor not found', data: null });
    }

    await VendorModel.remove(id);
    res.json({ status: true, message: 'Vendor deleted successfully', data: null });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

module.exports = { getVendors, createVendor, updateVendor, deleteVendor };
