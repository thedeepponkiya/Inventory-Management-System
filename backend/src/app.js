const path = require('path');
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const locationRoutes = require('./routes/location.routes');
const categoryRoutes = require('./routes/category.routes');
const productTypeRoutes = require('./routes/productType.routes');
const unitRoutes = require('./routes/unit.routes');
const vendorRoutes = require('./routes/vendor.routes');
const customerRoutes = require('./routes/customer.routes');
const rawSkuRoutes = require('./routes/rawSku.routes');
const purchaseOrderRoutes = require('./routes/purchaseOrder.routes');
const salesOrderRoutes = require('./routes/salesOrder.routes');
const materialInwardRoutes = require('./routes/materialInward.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const bomRoutes = require('./routes/bom.routes');
const userRoutes = require('./routes/user.routes');
const uploadRoutes = require('./routes/upload.routes');
const crmStageRoutes = require('./routes/crmStage.routes');
const crmSourceRoutes = require('./routes/crmSource.routes');
const crmLeadRoutes = require('./routes/crmLead.routes');
const crmUserRoutes = require('./routes/crmUser.routes');
const crmNoteRoutes = require('./routes/crmNote.routes');
const crmFollowupRoutes = require('./routes/crmFollowup.routes');
const crmCampaignRoutes = require('./routes/crmCampaign.routes');
const crmTagRoutes = require('./routes/crmTag.routes');
const crmMetaIntegrationRoutes = require('./routes/crmMetaIntegration.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Serves uploaded product images (backend/uploads/products) - the DB only ever stores this
// relative path (e.g. /uploads/products/xxx.jpg), never the file itself.
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/product-types', productTypeRoutes);
app.use('/api/v1/units', unitRoutes);
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/raw-skus', rawSkuRoutes);
app.use('/api/v1/purchase-orders', purchaseOrderRoutes);
app.use('/api/v1/sales-orders', salesOrderRoutes);
app.use('/api/v1/material-inwards', materialInwardRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/inventories', inventoryRoutes);
app.use('/api/v1/boms', bomRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/crm/stages', crmStageRoutes);
app.use('/api/v1/crm/sources', crmSourceRoutes);
app.use('/api/v1/crm/leads', crmLeadRoutes);
// Deliberately minimal read-only list for CRM's Assigned-To dropdown only (Module 2) -
// does not replace/migrate the mock-data-backed Users page.
app.use('/api/v1/crm/users', crmUserRoutes);
app.use('/api/v1/crm/notes', crmNoteRoutes);
app.use('/api/v1/crm/followups', crmFollowupRoutes);
app.use('/api/v1/crm/campaigns', crmCampaignRoutes);
app.use('/api/v1/crm/tags', crmTagRoutes);
app.use('/api/v1/crm/meta', crmMetaIntegrationRoutes);

module.exports = app;