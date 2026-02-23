// js/config.js

// --- Storage Keys ---
const TOKEN_STORAGE_KEY = 'revibeAuthToken_ext_v2_single_final';
const USER_STORAGE_KEY = 'revibeAuthUser_ext_v2_single_final';
const DARK_MODE_KEY = 'darkModePreference_ext_v2_single_final';

// --- API & App URLs ---
const LOGIN_API_URL = 'https://maestro-api-test-641086349527.us-central1.run.app/api/v1/auth/login';
const ORDERS_API_URL_BASE = 'https://maestro-api-test-641086349527.us-central1.run.app/api/v1/orders';
const HELPSCOUT_API_TOKEN_URL = 'https://api.helpscout.net/v2/oauth2/token';
const HELPSCOUT_API_BASE_URL = 'https://api.helpscout.net/v2';
const CLAIMS_APP_APP_NAME_FRAGMENT = "appName=Revibe-ClaimsApp20-593889386";
const CLAIMS_APP_BASE_URL_START = "https://www.appsheet.com/start/37fa8136-0a37-4010-a106-ed3b38f47b58";
const CLAIMS_APP_TARGET_VIEW_URL = `${CLAIMS_APP_BASE_URL_START}?platform=desktop#${CLAIMS_APP_APP_NAME_FRAGMENT}&view=Claims`;

// --- Data Mappings for Order Details ---
const detailHeaders = [
    'Order ID', 'Confirmed Date', 'Active Or Closed', 'Country', 'Date', 'WH', 'Order Help', 'Payment Method',
    'Delivery Method', 'Shipment Status', 'Supplier', 'Tracking Link', 'Tracking ID', 'Delivery Status', 'Tracking Company',
    'Name', 'Phone Number', 'Email', 'Address', 'Model', 'Variation: Color, Storage, Condition', 'Language', 'City',
    'Quality Assurance Fee', 'Discount Code', 'Discount', 'Gross Sale (AED)', 'Actual Cost', 'Supplier Cost', 'Take Rate',
    'GMV Local', 'GMV', 'Last Updated By', 'Last Update Date', 'Created Date', 'Campaign', 'Shopify Order ID', 'Product ID',
    'SKU (Old: Order Status)', 'Variation/Color', 'Condition', 'Storage', 'Supplier Provided ID', 'Category', 'New Handle',
    'Supplier Comments', 'Revibe Comment', 'Request Revibe', 'Source', 'Payment Status', 'COD To Collect', 'Availability Status',
    'COD Status', 'Confirmed Status', 'Quality Check Date', 'Confirmed Date', 'Month/Year', 'Delivered Date', 'Reason For Non Payment',
    'Shipping Date', 'Cancelled Date', 'Payment Date', 'Cancel Reason', 'Installment Call Comment', 'Device Lock Status',
    'Installment Call Status', 'Second Payment Agent', 'First Payment Agent', 'Second Payment Status', 'Device Lock ID',
    'First Payment Status', 'Tracking Label Link', 'IMEI Number', 'Issuer Country', 'No. Of Warranties', 'Warranty Amount',
    'Notes', 'Cancel Override'
];
const headerToKeyMap = {
    'Order ID': 'id', 'Confirmed Date': 'confirmedDate', 'Active Or Closed': 'Active Or Closed', 'Country': 'Country',
    'Date': 'Date', 'WH': 'WH', 'Order number': 'Order Help', 'Payment Method': 'Payment Method', 'Delivery Method': 'Delivery Method',
    'Shipment Status': 'Shipment Status', 'Supplier': 'Supplier', 'Tracking Link': 'Tracking Link', 'Tracking ID': 'Tracking ID',
    'Delivery Status': 'Delivery Status', 'Tracking Company': 'Tracking Company', 'Name': 'Name', 'Phone Number': 'Phone Number',
    'Email': 'Email', 'Address': 'Address', 'Model': 'Model', 'Variation: Color, Storage, Condition': 'Variation: Color, Storage, Condition',
    'Language': 'Language', 'City': 'City', 'Quality Assurance Fee': 'Quality Assurance Fee', 'Discount Code': 'Discount Code',
    'Discount': 'Discount', 'Gross Sale (AED)': 'Gross Sale (AED)', 'Actual Cost': 'Actual Cost', 'Supplier Cost': 'Supplier Cost',
    'Take Rate': 'Take Rate', 'GMV Local': 'GMV Local', 'GMV': 'GMV', 'Last Updated By': 'Last Updated By', 'Last Update Date': 'Last Update Date',
    'Created Date': 'Created Date', 'Campaign': 'Campaign', 'Shopify Order ID': 'Shopify Order ID', 'Product ID': 'Product ID',
    'SKU (Old: Order Status)': 'SKU', 'Variation/Color': 'Variation/Color', 'Condition': 'Condition', 'Storage': 'Storage',
    'Supplier Provided ID': 'Supplier Provided ID', 'Category': 'Category', 'New Handle': 'New Handle', 'Supplier Comments': 'Supplier Comments',
    'Revibe Comment': 'Revibe Comment', 'Request Revibe': 'Request Revibe', 'Source': 'Source', 'Payment Status': 'Payment Status',
    'COD To Collect': 'COD To Collect', 'Availability Status': 'Availability Status', 'COD Status': 'COD Status', 'Confirmed Status': 'Confirmed Status',
    'Quality Check Date': 'Quality Check Date', 'Month/Year': 'Month/Year', 'Delivered Date': 'Delivered Date',
    'Reason For Non Payment': 'Reason For Non Payment', 'Shipping Date': 'Shipping Date', 'Cancelled Date': 'Cancelled Date', 'Payment Date': 'Payment Date',
    'Cancel Reason': 'Cancel Reason', 'Installment Call Comment': 'Installment Call Comment', 'Device Lock Status': 'Device Lock Status',
    'Installment Call Status': 'Installment Call Status', 'Second Payment Agent': 'Second Payment Agent', 'First Payment Agent': 'First Payment Agent',
    'Second Payment Status': 'Second Payment Status', 'Device Lock ID': 'Device Lock ID', 'First Payment Status': 'First Payment Status',
    'Tracking Label Link': 'Tracking Label Link', 'IMEI Number': 'IMEI Number', 'Issuer Country': 'Issuer Country', 'No. Of Warranties': 'No. Of Warranties',
    'Warranty Amount': 'Warranty Amount', 'Notes': 'Notes', 'Cancel Override': 'Cancel Override'
};