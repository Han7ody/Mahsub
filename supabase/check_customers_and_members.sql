-- CHECK CUSTOMERS TABLE
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customers';

-- CHECK BUSINESS_MEMBERS TABLE
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'business_members'
);
