-- Users table backing /api/v1/auth login/logout.
-- Passwords are stored as bcrypt hashes (see auth.controller.js); tokens are
-- opaque session tokens with a 1-hour TTL enforced via "tokenExpiresAt".

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    "userName" VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    token TEXT,
    "tokenExpiresAt" TIMESTAMPTZ
);

-- Locations master, backing /api/v1/locations CRUD.
CREATE TABLE IF NOT EXISTS ims_location (
    id SERIAL PRIMARY KEY,
    location VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active'
);
CREATE UNIQUE INDEX IF NOT EXISTS ims_location_location_lower_idx ON ims_location (LOWER(location));

-- Categories master, backing /api/v1/categories CRUD.
CREATE TABLE IF NOT EXISTS ims_category (
    id SERIAL PRIMARY KEY,
    category VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active'
);
CREATE UNIQUE INDEX IF NOT EXISTS ims_category_category_lower_idx ON ims_category (LOWER(category));

-- Product types master, backing /api/v1/product-types CRUD.
CREATE TABLE IF NOT EXISTS ims_product_type (
    id SERIAL PRIMARY KEY,
    "productType" VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active'
);
CREATE UNIQUE INDEX IF NOT EXISTS ims_product_type_lower_idx ON ims_product_type (LOWER("productType"));

-- Vendors master, backing /api/v1/vendors CRUD.
CREATE TABLE IF NOT EXISTS ims_vendor (
    id SERIAL PRIMARY KEY,
    "vendorName" VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    "phoneNumber" VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    "zipCode" VARCHAR(20)
);
CREATE UNIQUE INDEX IF NOT EXISTS ims_vendor_vendorname_lower_idx ON ims_vendor (LOWER("vendorName"));
