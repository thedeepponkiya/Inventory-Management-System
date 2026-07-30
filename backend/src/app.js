const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const locationRoutes = require('./routes/location.routes');
const categoryRoutes = require('./routes/category.routes');
const productTypeRoutes = require('./routes/productType.routes');
const vendorRoutes = require('./routes/vendor.routes');
const purchaseOrderRoutes = require('./routes/purchaseOrder.routes');

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
app.use('/api/v1/purchase-orders', purchaseOrderRoutes);

module.exports = app;