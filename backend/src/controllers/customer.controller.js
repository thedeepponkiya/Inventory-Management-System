const { sendServerError } = require('../utils/errorResponse');
const CustomerModel = require('../models/customer.model');

async function getCustomers(req, res) {
  try {
    const customers = await CustomerModel.getAll();
    res.json({ status: true, message: 'Customers fetched successfully', data: customers });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function createCustomer(req, res) {
  try {
    const { customerName, email, phoneNumber, address, city, zipCode } = req.body;
    if (!customerName) {
      return res.status(400).json({ status: false, message: 'customerName is required', data: null });
    }

    const duplicate = await CustomerModel.findByCustomerName(customerName);
    if (duplicate) {
      return res.status(409).json({ status: false, message: 'Customer already exists', data: null });
    }

    const created = await CustomerModel.create(customerName, email, phoneNumber, address, city, zipCode);
    res.status(201).json({ status: true, message: 'Customer created successfully', data: created });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function updateCustomer(req, res) {
  try {
    const { id } = req.params;
    const { customerName, email, phoneNumber, address, city, zipCode } = req.body;

    const existing = await CustomerModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Customer not found', data: null });
    }

    if (customerName) {
      const duplicate = await CustomerModel.findByCustomerName(customerName);
      if (duplicate && String(duplicate.id) !== String(id)) {
        return res.status(409).json({ status: false, message: 'Customer already exists', data: null });
      }
    }

    const updated = await CustomerModel.update(
      id,
      customerName ?? existing.customerName,
      email ?? existing.email,
      phoneNumber ?? existing.phoneNumber,
      address ?? existing.address,
      city ?? existing.city,
      zipCode ?? existing.zipCode
    );
    res.json({ status: true, message: 'Customer updated successfully', data: updated });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function deleteCustomer(req, res) {
  try {
    const { id } = req.params;

    const existing = await CustomerModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Customer not found', data: null });
    }

    await CustomerModel.remove(id);
    res.json({ status: true, message: 'Customer deleted successfully', data: null });
  } catch (err) {
    sendServerError(res, err);
  }
}

module.exports = { getCustomers, createCustomer, updateCustomer, deleteCustomer };
