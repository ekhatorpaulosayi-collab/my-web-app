-- CHECK THE CURRENT STATUS OF YOUR SALES

-- 1. Check if sales were updated to your user ID
SELECT
  COUNT(*) as total_sales,
  user_id
FROM sales
WHERE user_id IN (
  '2903b7aa-d5b0-4fe7-96d7-4176886d8f8d',  -- Your correct ID
  'dffba89b-869d-422a-a542-2e2494850b44'   -- Old wrong ID
)
GROUP BY user_id;

-- 2. Check TODAY's sales specifically
SELECT
  COUNT(*) as todays_sales,
  sale_date
FROM sales
WHERE user_id = '2903b7aa-d5b0-4fe7-96d7-4176886d8f8d'
  AND sale_date = CURRENT_DATE
GROUP BY sale_date;

-- 3. Check the date format of your sales
SELECT
  DISTINCT sale_date,
  COUNT(*) as sales_count
FROM sales
WHERE user_id = '2903b7aa-d5b0-4fe7-96d7-4176886d8f8d'
ORDER BY sale_date DESC
LIMIT 10;