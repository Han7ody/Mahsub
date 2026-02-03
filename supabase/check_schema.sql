-- CHECK SCHEMA STATUS
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'businesses';

-- CHECK RPC STATUS
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_customers_with_balance', 'get_suppliers_with_balance');
