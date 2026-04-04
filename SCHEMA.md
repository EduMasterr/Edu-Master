# EduMaster Pro - Enterprise ERP Database Schema

This document outlines the relational database structure (SQL) for the Books & Accounting Module.

## 1. Inventory & Catalog
```sql
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    book_code VARCHAR(50) UNIQUE,
    cost_price DECIMAL(10,2) DEFAULT 0,
    selling_price DECIMAL(10,2) DEFAULT 0,
    current_stock INT DEFAULT 0,
    min_stock_alert INT DEFAULT 5,
    branch_id INT REFERENCES branches(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_no VARCHAR(20),
    email VARCHAR(100),
    tax_number VARCHAR(50),
    balance DECIMAL(15,2) DEFAULT 0
);
```

## 2. Invoices (Purchases & Sales)
```sql
CREATE TABLE purchase_invoices (
    id SERIAL PRIMARY KEY,
    invoice_no VARCHAR(50) UNIQUE,
    supplier_id INT REFERENCES suppliers(id),
    date DATE NOT NULL,
    total_amount DECIMAL(15,2),
    payment_method VARCHAR(20), -- 'cash', 'credit', 'bank'
    created_by INT REFERENCES users(id)
);

CREATE TABLE purchase_items (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES purchase_invoices(id),
    book_id INT REFERENCES books(id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL
);

CREATE TABLE sales_invoices (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id),
    branch_id INT REFERENCES branches(id),
    date DATE NOT NULL,
    grand_total DECIMAL(15,2),
    cogs_total DECIMAL(15,2), -- Cost of Goods Sold for profit tracking
    created_by INT REFERENCES users(id)
);

CREATE TABLE sales_items (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES sales_invoices(id),
    book_id INT REFERENCES books(id),
    quantity INT NOT NULL,
    unit_sale_price DECIMAL(10,2) NOT NULL,
    unit_cost_price DECIMAL(10,2) -- Snapshot of cost at sale time
);
```

## 3. General Ledger (Double Entry)
```sql
CREATE TABLE chart_of_accounts (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50), -- 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'
    balance DECIMAL(15,2) DEFAULT 0
);

CREATE TABLE journal_entries (
    id SERIAL PRIMARY KEY,
    ref_no VARCHAR(50),
    date DATE NOT NULL,
    description TEXT,
    branch_id INT REFERENCES branches(id)
);

CREATE TABLE journal_lines (
    id SERIAL PRIMARY KEY,
    journal_id INT REFERENCES journal_entries(id),
    account_id INT REFERENCES chart_of_accounts(id),
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0
);
```

## 4. RBAC & Security
```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    label VARCHAR(255)
);

CREATE TABLE role_permissions (
    role_id INT REFERENCES roles(id),
    permission_id INT REFERENCES permissions(id)
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    action VARCHAR(50),
    table_name VARCHAR(50),
    record_id INT,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
