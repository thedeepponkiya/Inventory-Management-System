const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const locationRoutes = require('./routes/location.routes');
const categoryRoutes = require('./routes/category.routes');
const productTypeRoutes = require('./routes/productType.routes');
const vendorRoutes = require('./routes/vendor.routes');
const rawSkuRoutes = require('./routes/rawSku.routes');
const purchaseOrderRoutes = require('./routes/purchaseOrder.routes');
const materialInwardRoutes = require('./routes/materialInward.routes');
const invoiceRoutes = require('./routes/invoice.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/product-types', productTypeRoutes);
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/raw-skus', rawSkuRoutes);
app.use('/api/v1/purchase-orders', purchaseOrderRoutes);
app.use('/api/v1/material-inwards', materialInwardRoutes);
app.use('/api/v1/invoices', invoiceRoutes);

module.exports = app;