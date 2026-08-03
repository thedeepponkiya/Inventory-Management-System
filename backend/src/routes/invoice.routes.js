const express = require('express');
const { getInvoices, createInvoice, updateInvoice, deleteInvoice } = require('../controllers/invoice.controller');

const router = express.Router();

router.get('/', getInvoices);
router.post('/', createInvoice);
router.put('/:id', updateInvoice);
router.delete('/:id', deleteInvoice);

module.exports = router;
