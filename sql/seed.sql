-- ============================================================
--  SAMPLE DATA (feel free to change or delete)
--  Run this in the SQL Editor AFTER schema.sql
-- ============================================================

insert into products (name, category, price, stock) values
  ('Americano (Hot)',      'Coffee',     69.00, null),
  ('Americano (Iced)',     'Coffee',     79.00, null),
  ('Cafe Latte (Hot)',     'Coffee',     89.00, null),
  ('Cafe Latte (Iced)',    'Coffee',     99.00, null),
  ('Cappuccino',           'Coffee',     89.00, null),
  ('Spanish Latte (Iced)', 'Coffee',    109.00, null),
  ('Caramel Macchiato',    'Coffee',    119.00, null),
  ('Matcha Latte (Iced)',  'Non-Coffee',109.00, null),
  ('Strawberry Milk',      'Non-Coffee', 99.00, null),
  ('Chocolate Cookie',     'Others',     49.00, 24),
  ('Banana Bread',         'Others',     55.00, 12),
  ('Bottled Water',        'Others',     20.00, 48);

insert into ingredients (name, unit, stock, cost, low_stock) values
  ('Coffee Beans',     'g',     2000, 0.85, 500),
  ('Fresh Milk',       'ml',    5000, 0.09, 1000),
  ('Caramel Syrup',    'ml',    1000, 0.20, 200),
  ('Vanilla Syrup',    'ml',    1000, 0.20, 200),
  ('Matcha Powder',    'g',      300, 1.20, 80),
  ('Plastic Cups 16oz','pcs',    300, 2.50, 50),
  ('Plastic Lids',     'pcs',    300, 1.20, 50),
  ('Straw',            'pcs',    500, 0.40, 100),
  ('Sugar',            'g',     3000, 0.05, 500),
  ('Ice',              'g',    10000, 0.01, 2000);
