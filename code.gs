// ============================================================
// 🌐 WEB APP POST HANDLER (for GitHub Pages frontend)
// ============================================================
function doPost(e) {
  try {
    var action, payload;

    // ✅ FIX: Handle both URL-encoded form data (from redirect) and raw JSON
    if (e.parameter && e.parameter.action) {
      // Sent as application/x-www-form-urlencoded
      action = e.parameter.action;
      payload = JSON.parse(e.parameter.payload || '[]');
    } else if (e.postData && e.postData.contents) {
      // Sent as raw JSON string
      var request = JSON.parse(e.postData.contents);
      action = request.action;
      payload = request.payload || [];
    } else {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'No data received.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (!action) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Missing action.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Route the action to your backend functions
    var result = routeAction(action, payload);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('❌ doPost error: ' + err.message);
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// ROUTER — maps action names to your backend functions
// ============================================================
function routeAction(action, args) {
  try {
    switch (action) {
      case 'sendMessage':            return sendMessage(args[0], args[1], args[2], args[3]);
      case 'adminSendMessage':       return adminSendMessage(args[0], args[1], args[2]);
      case 'getMessages':            return getMessages(args[0]);
      case 'markMessagesRead':       return markMessagesRead(args[0], args[1]);
      case 'getCustomerUnreadCount': return getCustomerUnreadCount(args[0]);
      case 'getAdminUnreadCount':    return getAdminUnreadCount();
      case 'getAllConversations':    return getAllConversations();

      case 'getGamesData':          return getGamesData();
      case 'addGame':               return addGame(args[0]);
      case 'updateGame':            return updateGame(args[0], args[1]);
      case 'deleteGame':            return deleteGame(args[0]);
      case 'uploadGameImage':       return uploadGameImage(args[0]);

      case 'createAccount':         return createAccount(args[0], args[1], args[2], args[3], args[4]);
      case 'loginCustomer':         return loginCustomer(args[0], args[1]);
      case 'getCustomerByEmail':    return getCustomerByEmail(args[0]);
      case 'updateCustomerProfile': return updateCustomerProfile(args[0], args[1], args[2], args[3]);
      case 'updateCustomerPassword':return updateCustomerPassword(args[0], args[1], args[2]);
      case 'getCustomerPoints':     return getCustomerPoints(args[0]);

      case 'getOrdersData':         return getOrdersData();
      case 'placeOrder':            return placeOrder(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10]);

      // ===== 💎 Robux Inventory =====
      case 'getRobuxInventoryDashboard':     return getRobuxInventoryDashboard(args[0]);
      case 'reconcileRobuxInventory':        return reconcileRobuxInventory();
      case 'addRobuxPurchase':             return addRobuxPurchase(args[0], args[1], args[2], args[3], args[4]);
      case 'manualAdjustRobux':            return manualAdjustRobux(args[0], args[1], args[2]);
      case 'getRobuxStockForCheckout':     return getRobuxStockForCheckout(args[0]);
      case 'updateRobuxPricingSettings':   return updateRobuxPricingSettings(args[0]);
      case 'saveRobuxManualPrices':        return saveRobuxManualPrices(args[0]);
      case 'applyRobuxSuggestedPrices':    return applyRobuxSuggestedPrices();
      case 'allocateRobuxBackordersNow':   return allocateRobuxBackordersNow();
      case 'installRobuxExpiryTrigger':    return installRobuxExpiryTrigger();
      case 'updateOrderStatus':     return updateOrderStatus(args[0], args[1]);
      case 'getCustomerOrders':     return getCustomerOrders(args[0]);
      case 'getSalesSummaryWithCost': return getSalesSummaryWithCost(args[0]);
      case 'getAdvancedSalesSummary': return getAdvancedSalesSummary(args[0]);

      case 'validatePromoCode':     return validatePromoCode(args[0], args[1], args[2]);
      case 'getPendingReferralCoupon': return getPendingReferralCoupon(args[0]);
      case 'getCustomerReferralData': return getCustomerReferralData(args[0]);
      case 'getReferralConfig':     return getReferralConfig();
      case 'updateReferralConfig':  return updateReferralConfig(args[0]);

      case 'toggleWishlist':        return toggleWishlist(args[0], args[1]);
      case 'getWishlist':           return getWishlist(args[0]);
      case 'getWishlistIds':        return getWishlistIds(args[0]);

      case 'getReviews':            return getReviews(args[0]);
      case 'getCustomerReview':     return getCustomerReview(args[0], args[1]);
      case 'addReview':             return addReview(args[0], args[1], args[2], args[3], args[4]);

      case 'getGenreImages':        return getGenreImages();
      case 'updateGenreImage':      return updateGenreImage(args[0], args[1]);

      case 'verifyAdminPassword':   return verifyAdminPassword(args[0]);
      case 'changeAdminPassword':   return changeAdminPassword(args[0], args[1]);
      case 'getBackupHistory':      return getBackupHistory();
      case 'backupGamesData':       return backupGamesData();
      case 'restoreGamesFromBackup':return restoreGamesFromBackup(args[0]);

      case 'getPaymentQRs':         return getPaymentQRs();
      case 'uploadReceipt':         return uploadReceipt(args[0], args[1], args[2], args[3]);

      case 'debugOrdersData':       return debugOrdersData();
      case 'testConnection':        return { success: true, message: 'Connected.' };

      case 'getCostSettings':       return getCostSettings();
      case 'updateCostSettings':    return updateCostSettings(args[0]);
      case 'getSalesTeam':          return getSalesTeam();
      case 'addSalesperson':        return addSalesperson(args[0], args[1], args[2], args[3]);
      case 'getSalespersonDashboard': return getSalespersonDashboard(args[0]);

      // Inside routeAction(action, args) switch:

      // ===== Phase 1: My Orders & Rewards =====
      case 'getMyOrdersData':        return getMyOrdersData(args[0]);
      case 'cancelCustomerOrder':    return cancelCustomerOrder(args[0], args[1]);
      case 'markOrderReceived':      return markOrderReceived(args[0], args[1]);
      case 'addReviewWithReward':    return addReviewWithReward(args[0], args[1], args[2], args[3], args[4], args[5]);
      case 'getOrderReviewStatus':   return getOrderReviewStatus(args[0], args[1]);
      case 'updateFulfilmentStatus': return updateFulfilmentStatus(args[0], args[1]);

      case 'debugMyOrderStatus':      return debugMyOrderStatus(args[0]);
      case 'migrateShippedPaymentStatus': return migrateShippedPaymentStatus();

      case 'processGiftCodeAssignment': return processGiftCodeAssignment(args[0], args[1], args[2], args[3]);
      case 'getGiftCodesForOrder':      return getGiftCodesForOrder(args[0]);

      default:
        return { success: false, message: 'Unknown action: ' + action };
    }
  } catch (err) {
    Logger.log('❌ routeAction error (' + action + '): ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// CONFIGURATION
// ============================================================
const PUBLIC_SITE_URL = 'https://nex4upstoremy.github.io/Nex4UpStore/';
const SHEET_ID = '125roeerHto0i9Y6uesYQCfamGroTEJrC0_ljon-ZwPY';
const GAME_SHEET_NAME = 'Games';
const GAME_BACKUP_SHEET_NAME = 'GameBackups';
const ADMIN_SHEET_NAME = 'Admin';
const ORDERS_SHEET_NAME = 'Orders';
const CONFIG_SHEET_NAME = 'Config';
const CUSTOMERS_SHEET_NAME = 'Customers';
const PROMO_SHEET_NAME = 'PromoCodes';
const WISHLIST_SHEET_NAME = 'Wishlist';
const GENRE_IMAGES_SHEET_NAME = 'GenreImages';
const COUPON_USAGE_SHEET_NAME = 'CouponUsage';
const REFERRALS_SHEET_NAME = 'Referrals';
const REFERRAL_CONFIG_SHEET_NAME = 'ReferralConfig';
const REVIEWS_SHEET_NAME = 'Reviews';
const SALES_TEAM_SHEET_NAME = 'SalesTeam';
const COMMISSIONS_SHEET_NAME = 'Commissions';
const COST_SETTINGS_SHEET_NAME = 'CostSettings';

// ✅ Google Drive folder IDs
const QR_FOLDER_ID = '1dDHGdDxrHe3WYNb6Ps0OBJp1_-JvPXiy';       // Payment QR codes
const RECEIPT_FOLDER_ID = '1UKFd1G0ECHVY2XdW7Pt5Tgz4BVT0nCoC';   // Receipt uploads
const PROFILE_PIC_FOLDER_ID = '1JQW32UpRLYcOpbubs0hTKYA82PcX174-'; // Profile Pictures folder
const GAME_IMAGES_FOLDER_ID = '12zvp1MgUIEb9_pGsACiAyGdGvZ86r-Wn'; // ✅ ADD THIS

const ENCRYPTION_KEY = 'Your_Secret_Key_Change_Me_123!';

// ✅ Admin notification email — all order/receipt alerts go here
const ADMIN_NOTIFICATION_EMAIL = 'nex4upstore@gmail.com';
// ✅ Telegram bot notifications
const TELEGRAM_BOT_TOKEN = '8657067101:AAFZNoPyPwBTRvoGg6ZY3FVPfr9ukZUtrU4';
const TELEGRAM_CHAT_ID   = '5409376571';

// ============================================================
// DO GET – serves the HTML interface
// ============================================================
function doGet(e) {
  // Check if the URL has ?page=admin
  var page = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'Index';
  
  var htmlFile = 'Index'; // Default to customer store
  if (page === 'admin') {
    htmlFile = 'Admin'; // Look for Admin.html
  }
  
  return HtmlService.createHtmlOutputFromFile(htmlFile)
    .setTitle('Nex4UpStore')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ============================================================
// SETUP – creates all sheets with headers and sample data
// ============================================================
function setupSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // --- Games sheet ---
  let gameSheet = ss.getSheetByName(GAME_SHEET_NAME);
  if (!gameSheet) gameSheet = ss.insertSheet(GAME_SHEET_NAME);
const expectedHeaders = [
  'id', 'title', 'category', 'price', 'cost', 'discount', 'quantity', 'description',
  'image', 'badge', 'additional_images', 'game_type',
  'product_type',
  'requires_shipping',
  'has_variants',
  'variant_options',
  'variants',
  'first_purchase_discount_eligible'
  'is_instant'
];
  const gameHeaderRow = gameSheet.getRange(1, 1, 1, expectedHeaders.length).getValues()[0];
  if (!gameHeaderRow[0] || String(gameHeaderRow[0]).trim() !== 'id') {
    gameSheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
  } else {
    for (let i = 0; i < expectedHeaders.length; i++) {
      if (!gameHeaderRow[i] || String(gameHeaderRow[i]).trim() === '') {
        gameSheet.getRange(1, i + 1).setValue(expectedHeaders[i]);
      }
    }
  }
  gameSheet.getRange(1, 1, 1, expectedHeaders.length)
    .setFontWeight('bold').setBackground('#1e2a3a').setFontColor('#f7d875');
  gameSheet.setFrozenRows(1);

  // --- Admin sheet ---
  let adminSheet = ss.getSheetByName(ADMIN_SHEET_NAME);
  if (!adminSheet) {
    adminSheet = ss.insertSheet(ADMIN_SHEET_NAME);
    adminSheet.getRange(1, 1).setValue('Admin Password').setFontWeight('bold').setBackground('#1e2a3a').setFontColor('#f7d875');
    adminSheet.getRange(2, 1).setValue('password').setFontWeight('bold');
    adminSheet.getRange(2, 2).setValue('admin123');
    adminSheet.setColumnWidth(1, 120).setColumnWidth(2, 200).setFrozenRows(1);
  }

  // --- Orders sheet ---
  let ordersSheet = ss.getSheetByName(ORDERS_SHEET_NAME);
  if (!ordersSheet) ordersSheet = ss.insertSheet(ORDERS_SHEET_NAME);
  const ordersHeaders = [
    'Order ID', 'Date', 'Customer Name', 'Phone', 'Roblox Username', 'Email',
    'Items', 'Total (RM)', 'Total Cost (RM)', 'Payment Status', 'Payment Method', 'Notes',
    'Roblox Nickname', 'ML User ID', 'ML Zone ID', 'PUBG User ID', 'PUBG Nickname', 'Other Account ID',
    'Receipt Number', 'Receipt URL', 'Payment Confirmed At',
    'Points Used', 'Points Discount (RM)', 'Points Earned',
    'Shipping Address',       // ✅ NEW
    'Shipping City',          // ✅ NEW
    'Shipping State',         // ✅ NEW
    'Shipping Postcode',      // ✅ NEW
    'Shipping Fee (RM)',      // ✅ NEW
    'Variant Details',        // ✅ NEW
    'Product Type',           // ✅ NEW
    'Agent Email',            // ✅ NEW
    'Gateway Fee (RM)',       // ✅ NEW
    'Platform Fee (RM)',      // ✅ NEW
    'Actual Net Profit (RM)', // ✅ NEW
    'Commission Amount (RM)'  // ✅ NEW
  ];
  const ordersHeaderRow = ordersSheet.getRange(1, 1, 1, ordersHeaders.length).getValues()[0];
  if (!ordersHeaderRow[0] || String(ordersHeaderRow[0]).trim() !== 'Order ID') {
    ordersSheet.getRange(1, 1, 1, ordersHeaders.length).setValues([ordersHeaders]);
  } else {
    for (let i = 0; i < ordersHeaders.length; i++) {
      if (!ordersHeaderRow[i] || String(ordersHeaderRow[i]).trim() === '') {
        ordersSheet.getRange(1, i + 1).setValue(ordersHeaders[i]);
      }
    }
  }
  ordersSheet.getRange(1, 1, 1, ordersHeaders.length)
    .setFontWeight('bold').setBackground('#1e2a3a').setFontColor('#f7d875');
  ordersSheet.setFrozenRows(1);

  // ✅ REPLACE the orders status validation to match new column position (J still)
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Pending', 'Awaiting Payment', 'Awaiting Verification', 'Paid', 'Shipped', 'Cancelled'])
    .build();
  ordersSheet.getRange('J:J').setDataValidation(rule);

  // --- Config sheet ---
  let configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!configSheet) {
    configSheet = ss.insertSheet(CONFIG_SHEET_NAME);
    const configData = [
      ['Bank Name', 'Maybank'],
      ['Account Number', '1234 5678 9012'],
      ['Account Holder', 'Nex4UpStore Sdn Bhd'],
      ['Payment Instructions', 'Please transfer the total amount to the above account and email the receipt to support@nex4upstore.com'],
      ['Next Order Number', 1]
    ];
    configSheet.getRange(1, 1, configData.length, 2).setValues(configData);
    configSheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#1e2a3a').setFontColor('#f7d875');
    configSheet.setFrozenRows(1);
  }

  // --- Customers sheet ---
  let customersSheet = ss.getSheetByName(CUSTOMERS_SHEET_NAME);
  if (!customersSheet) {
    customersSheet = ss.insertSheet(CUSTOMERS_SHEET_NAME);
    const headers = ['Email', 'Password', 'Name', 'Phone', 'Profile Image', 'Created Date', 'Last Login', 'Referral Code', 'Referred By', 'Points Balance'];
    customersSheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#1e2a3a').setFontColor('#f7d875');
    customersSheet.setFrozenRows(1);
  } else {
    const custHeaders = customersSheet.getRange(1, 1, 1, customersSheet.getLastColumn()).getValues()[0];
    if (custHeaders.indexOf('Points Balance') === -1) {
      customersSheet.getRange(1, custHeaders.length + 1).setValue('Points Balance')
        .setFontWeight('bold').setBackground('#1e2a3a').setFontColor('#f7d875');
      customersSheet.getRange(2, custHeaders.length + 1, customersSheet.getLastRow() - 1, 1).setValue(0);
    }
  }

  // --- PointsLedger ---
  let ledgerSheet = ss.getSheetByName('PointsLedger');
  if (!ledgerSheet) {
    ledgerSheet = ss.insertSheet('PointsLedger');
    const ledgerHeaders = ['Date', 'Customer Email', 'Order ID', 'Points Change (+/-)', 'Reason'];
    ledgerSheet.getRange(1, 1, 1, ledgerHeaders.length).setValues([ledgerHeaders])
      .setFontWeight('bold').setBackground('#1e2a3a').setFontColor('#f7d875');
    ledgerSheet.setFrozenRows(1);
  }

  // --- PromoCodes ---
  let promoSheet = ss.getSheetByName(PROMO_SHEET_NAME);
  if (!promoSheet) {
    promoSheet = ss.insertSheet(PROMO_SHEET_NAME);
    const promoHeaders = ['Code', 'Discount Type', 'Discount Value', 'Min Order Amount', 'Max Per Customer', 'Expiry Date', 'Usage Limit', 'Used Count'];
    promoSheet.getRange(1, 1, 1, promoHeaders.length).setValues([promoHeaders])
      .setFontWeight('bold').setBackground('#1e2a3a').setFontColor('#f7d875');
    promoSheet.setFrozenRows(1);
    const now = new Date();
    const expiry = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    promoSheet.appendRow(['SAVE10', 'percentage', 10, 50, 1, expiry, 100, 0]);
    promoSheet.appendRow(['SAVE20', 'fixed', 20, 100, 1, expiry, 50, 0]);
  }

    // --- Digital Codes (Gift Codes / Redeem Codes) ---
  const DIGITAL_CODES_SHEET_NAME = 'DigitalCodes';
  let codesSheet = ss.getSheetByName(DIGITAL_CODES_SHEET_NAME);
  if (!codesSheet) {
    codesSheet = ss.insertSheet(DIGITAL_CODES_SHEET_NAME);
    const codesHeaders = [
      'Code ID', 'Order ID', 'Product ID', 'Product Title', 
      'Customer Email', 'Redemption Code', 'Status', 'Assigned At', 'Email Sent At'
    ];
    codesSheet.getRange(1, 1, 1, codesHeaders.length).setValues([codesHeaders])
      .setFontWeight('bold').setBackground('#1e2a3a').setFontColor('#f7d875');
    codesSheet.setFrozenRows(1);
  }

  // --- Wishlist / GenreImages / CouponUsage / Referrals / ReferralConfig / Reviews ---
  const simpleSheets = [
    { name: WISHLIST_SHEET_NAME, headers: ['Email', 'Game ID', 'Date Added'] },
    { name: GENRE_IMAGES_SHEET_NAME, headers: ['Genre', 'Image URL'] },
    { name: COUPON_USAGE_SHEET_NAME, headers: ['Email', 'Coupon Code', 'Order ID', 'Used At', 'Discount Amount', 'Status'] },
    { name: REFERRALS_SHEET_NAME, headers: ['Referrer Email', 'Referred Email', 'Referred At', 'Referrer Coupon', 'New User Coupon', 'Referrer Reward Given', 'New User Reward Given', 'Order Completed'] },
    { name: REFERRAL_CONFIG_SHEET_NAME, headers: ['Setting Key', 'Value', 'Description'] },
    { name: REVIEWS_SHEET_NAME, headers: ['Review ID', 'Game ID', 'Game Title', 'Customer Email', 'Customer Name', 'Rating', 'Review Text', 'Verified Purchase', 'Status', 'Created At'] }
  ];
  simpleSheets.forEach(({ name, headers }) => {
    let s = ss.getSheetByName(name);
    if (!s) {
      s = ss.insertSheet(name);
      s.getRange(1, 1, 1, headers.length).setValues([headers])
        .setFontWeight('bold').setBackground('#1e2a3a').setFontColor('#f7d875');
      s.setFrozenRows(1);
    }
  });

  // --- Migrate existing CouponUsage sheet to include Status column ---
  const cuSheet = ss.getSheetByName(COUPON_USAGE_SHEET_NAME);
  if (cuSheet) {
    const cuHeaders = cuSheet.getRange(1, 1, 1, cuSheet.getLastColumn()).getValues()[0];
    if (cuHeaders.indexOf('Status') === -1) {
      const newColIdx = cuHeaders.length + 1;
      cuSheet.getRange(1, newColIdx).setValue('Status')
        .setFontWeight('bold').setBackground('#1e2a3a').setFontColor('#f7d875');
      if (cuSheet.getLastRow() > 1) {
        cuSheet.getRange(2, newColIdx, cuSheet.getLastRow() - 1, 1).setValue('Confirmed');
      }
    }
  }

  // --- Messages / Customer Support Inbox ---
  let msgSheet = ss.getSheetByName('Messages');
  if (!msgSheet) {
    msgSheet = ss.insertSheet('Messages');
    const msgHeaders = [
      'Message ID', 'Date', 'Customer Email', 'Customer Name',
      'Sender', 'Message', 'Image URL', 'Read By Customer', 'Read By Admin'
    ];
    msgSheet.getRange(1, 1, 1, msgHeaders.length).setValues([msgHeaders])
      .setFontWeight('bold').setBackground('#1e2a3a').setFontColor('#f7d875');
    msgSheet.setFrozenRows(1);
    msgSheet.setColumnWidth(3, 220);
    msgSheet.setColumnWidth(6, 400);
    msgSheet.setColumnWidth(7, 260);
  }
    // --- Sales Team & Commissions ---
  let salesTeamSheet = ss.getSheetByName(SALES_TEAM_SHEET_NAME);
  if (!salesTeamSheet) {
    salesTeamSheet = ss.insertSheet(SALES_TEAM_SHEET_NAME);
    const stHeaders = ['Agent Email', 'Name', 'Agent Code', 'Commission Rate (%)', 'Status', 'Date Added'];
    salesTeamSheet.getRange(1, 1, 1, stHeaders.length).setValues([stHeaders])
      .setFontWeight('bold').setBackground('#1e2a3a').setFontColor('#f7d875');
    salesTeamSheet.setFrozenRows(1);
  }

  let commissionsSheet = ss.getSheetByName(COMMISSIONS_SHEET_NAME);
  if (!commissionsSheet) {
    commissionsSheet = ss.insertSheet(COMMISSIONS_SHEET_NAME);
    const commHeaders = ['Commission ID', 'Order ID', 'Agent Email', 'Date', 'Net Revenue (RM)', 'Total Cost (RM)', 'Net Profit (RM)', 'Commission Rate (%)', 'Commission Amount (RM)', 'Status'];
    commissionsSheet.getRange(1, 1, 1, commHeaders.length).setValues([commHeaders])
      .setFontWeight('bold').setBackground('#1e2a3a').setFontColor('#f7d875');
    commissionsSheet.setFrozenRows(1);
  }

  let costSettingsSheet = ss.getSheetByName(COST_SETTINGS_SHEET_NAME);
  if (!costSettingsSheet) {
    costSettingsSheet = ss.insertSheet(COST_SETTINGS_SHEET_NAME);
    const csHeaders = ['Setting Key', 'Value', 'Description'];
    costSettingsSheet.getRange(1, 1, 1, csHeaders.length).setValues([csHeaders])
      .setFontWeight('bold').setBackground('#1e2a3a').setFontColor('#f7d875');
    costSettingsSheet.setFrozenRows(1);
    costSettingsSheet.appendRow(['Default Commission Rate', '20', 'Default % for sales team']);
    costSettingsSheet.appendRow(['Payment Gateway Fee (%)', '2', 'e.g. 2% for TNG/Mae fees']);
    costSettingsSheet.appendRow(['Platform Fee (RM)', '0.50', 'Fixed fee per transaction']);
  }

  // ✅ Robux central inventory
  setupRobuxSheets();

  Logger.log('✅ Setup complete. Hybrid store (digital + physical + variants) + Robux inventory ready.');
}

// ============================================================
// ✅ PAYMENT QR CODES (from Drive folder)
// ============================================================
function getPaymentQRs() {
  try {
    const folder = DriveApp.getFolderById(QR_FOLDER_ID);
    const files = folder.getFiles();
    const result = {};
    while (files.hasNext()) {
      const file = files.next();
      const originalName = file.getName();
      const name = originalName.toLowerCase();
      const mime = file.getMimeType();

      if (mime.indexOf('image/') !== 0) continue;

      const blob = file.getBlob();
      const base64 = Utilities.base64Encode(blob.getBytes());
      let key = null;

      if (name.indexOf('mae') !== -1) {
        key = 'mae';
      } else if (name.indexOf('tng') !== -1) {
        key = 'tng';
      } else if (name.indexOf('shopee') !== -1) {
        key = 'shopee';
      }

      if (key) {
        result[key] = 'data:' + mime + ';base64,' + base64;
      }
    }
    Logger.log('✅ Loaded QRs: ' + Object.keys(result).join(', '));
    return result;
  } catch (e) {
    Logger.log('❌ getPaymentQRs error: ' + e.message);
    return {};
  }
}

// ============================================================
// ✅ RECEIPT UPLOAD
// ============================================================
function uploadReceipt(orderId, customerEmail, fileName, fileDataUrl) {
  try {
    if (!orderId || !fileDataUrl) {
      return { success: false, message: 'Missing order ID or file data.' };
    }
    const parts = fileDataUrl.split(',');
    if (parts.length < 2) return { success: false, message: 'Invalid file data.' };
    const meta = parts[0];
    const data = parts[1];
    const mimeMatch = meta.match(/data:(.*?);base64/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    let ext = 'jpg';
    if (mimeType.indexOf('png') !== -1) ext = 'png';
    else if (mimeType.indexOf('pdf') !== -1) ext = 'pdf';
    else if (mimeType.indexOf('jpeg') !== -1 || mimeType.indexOf('jpg') !== -1) ext = 'jpg';
    else if (mimeType.indexOf('webp') !== -1) ext = 'webp';
    else if (mimeType.indexOf('heic') !== -1) ext = 'heic';

    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd');
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const receiptNumber = 'RCT-' + dateStr + '-' + rand;

    const folder = DriveApp.getFolderById(RECEIPT_FOLDER_ID);
    const safeName = receiptNumber + '_' + orderId + '.' + ext;
    const blob = Utilities.newBlob(Utilities.base64Decode(data), mimeType, safeName);
    const file = folder.createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) { Logger.log('Share failed (ok): ' + e.message); }
    const fileUrl = file.getUrl();

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(ORDERS_SHEET_NAME);
    const dataRange = sheet.getDataRange().getValues();
    const headers = dataRange[0].map(h => String(h).trim());
    const receiptNumIdx = headers.indexOf('Receipt Number');
    const receiptUrlIdx = headers.indexOf('Receipt URL');
    const confirmedAtIdx = headers.indexOf('Payment Confirmed At');
    const statusIdx = headers.findIndex(h => h.toLowerCase().indexOf('status') !== -1);

    let updated = false;
    for (let i = 1; i < dataRange.length; i++) {
      if (String(dataRange[i][0]) === String(orderId)) {
        const rowIdx = i + 1;
        if (receiptNumIdx !== -1) sheet.getRange(rowIdx, receiptNumIdx + 1).setValue(receiptNumber);
        if (receiptUrlIdx !== -1) sheet.getRange(rowIdx, receiptUrlIdx + 1).setValue(fileUrl);
        if (confirmedAtIdx !== -1) sheet.getRange(rowIdx, confirmedAtIdx + 1).setValue(Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'));
        if (statusIdx !== -1) sheet.getRange(rowIdx, statusIdx + 1).setValue('Awaiting Verification');
        updated = true;
        break;
      }
    }
    if (!updated) return { success: false, message: 'Order not found: ' + orderId };

    // ✅ Send notification to admin (nex4upstore@gmail.com)
    try {
      MailApp.sendEmail(ADMIN_NOTIFICATION_EMAIL,
        '💰 Receipt Uploaded – ' + orderId,
        'Customer ' + (customerEmail || 'N/A') + ' has uploaded a receipt.\n\n' +
        'Order ID: ' + orderId + '\n' +
        'Receipt Number: ' + receiptNumber + '\n' +
        'Receipt URL: ' + fileUrl + '\n\n' +
        'Please verify in your banking app, then approve in the admin panel.'
      );
    } catch (e) { Logger.log('Email notify failed: ' + e.message); }
        // ✅ NEW: Telegram alert on receipt upload
    try {
      var tgMsg = '<b>💰 RECEIPT UPLOADED!</b>\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '🆔 <b>Order ID</b>\n<code>' + escapeTelegramHtml(orderId) + '</code>\n\n' +
        '👤 Customer: ' + escapeTelegramHtml(customerEmail || 'N/A') + '\n' +
        '🧾 Receipt #: <code>' + escapeTelegramHtml(receiptNumber) + '</code>\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '⚠️ <b>ACTION REQUIRED</b>\n' +
        'Verify payment in your banking app, then approve in Admin Panel.\n\n' +
        '<a href="' + escapeTelegramHtml(fileUrl) + '">📎 View Receipt</a>';
      sendTelegramNotification(tgMsg);
    } catch (tgErr) {
      Logger.log('⚠️ Telegram receipt alert failed: ' + tgErr.message);
    }

    return { success: true, receiptNumber: receiptNumber, receiptUrl: fileUrl };
  } catch (e) {
    Logger.log('❌ uploadReceipt error: ' + e.message);
    return { success: false, message: e.message };
  }
}

// ============================================================
// ✅ PROFILE PICTURE UPLOAD
// ============================================================
function uploadProfilePicToDrive(email, base64DataUrl) {
  try {
    if (!base64DataUrl || !base64DataUrl.startsWith('data:image')) {
      return base64DataUrl;
    }
    
    const parts = base64DataUrl.split(',');
    const meta = parts[0];
    const data = parts[1];
    const mimeMatch = meta.match(/data:(.*?);base64/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    
    let ext = 'jpg';
    if (mimeType.indexOf('png') !== -1) ext = 'png';
    else if (mimeType.indexOf('webp') !== -1) ext = 'webp';

    const safeEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = 'PFP_' + safeEmail + '_' + new Date().getTime() + '.' + ext;
    
    const folder = DriveApp.getFolderById(PROFILE_PIC_FOLDER_ID);
    const blob = Utilities.newBlob(Utilities.base64Decode(data), mimeType, fileName);
    const file = folder.createFile(blob);
    
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) { 
      Logger.log('Share failed (ok): ' + e.message); 
    }
    
    return "https://lh3.googleusercontent.com/d/" + file.getId();
    
  } catch (e) {
    Logger.log('❌ uploadProfilePicToDrive error: ' + e.message);
    return base64DataUrl;
  }
}

// ============================================================
// ✅ TEST FOLDER ACCESS
// ============================================================
function testQRFolderAccess() {
  try {
    const folder = DriveApp.getFolderById(QR_FOLDER_ID);
    const files = folder.getFiles();
    const names = [];
    while (files.hasNext()) names.push(files.next().getName());
    Logger.log('✅ QR folder files: ' + names.join(', '));
    return { success: true, files: names };
  } catch (e) {
    Logger.log('❌ QR folder error: ' + e.message);
    return { success: false, message: e.message };
  }
}

function testReceiptFolderAccess() {
  try {
    const folder = DriveApp.getFolderById(RECEIPT_FOLDER_ID);
    Logger.log('✅ Receipt folder name: ' + folder.getName());
    return { success: true, name: folder.getName() };
  } catch (e) {
    Logger.log('❌ Receipt folder error: ' + e.message);
    return { success: false, message: e.message };
  }
}

// ============================================================
// ✅ GAME IMAGE UPLOAD
// ============================================================
function uploadGameImage(fileDataUrl) {
  try {
    if (!fileDataUrl || !fileDataUrl.startsWith('data:image')) {
      return { success: false, message: 'Invalid image data.' };
    }
    
    const parts = fileDataUrl.split(',');
    const meta = parts[0];
    const data = parts[1];
    const mimeMatch = meta.match(/data:(.*?);base64/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    
    let ext = 'jpg';
    if (mimeType.indexOf('png') !== -1) ext = 'png';
    else if (mimeType.indexOf('webp') !== -1) ext = 'webp';
    else if (mimeType.indexOf('gif') !== -1) ext = 'gif';
    else if (mimeType.indexOf('jpeg') !== -1 || mimeType.indexOf('jpg') !== -1) ext = 'jpg';
    
    const safeName = 'GAME_' + new Date().getTime() + '_' + Math.random().toString(36).substring(2, 8) + '.' + ext;
    
    const folder = DriveApp.getFolderById(GAME_IMAGES_FOLDER_ID);
    const blob = Utilities.newBlob(Utilities.base64Decode(data), mimeType, safeName);
    const file = folder.createFile(blob);
    
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      Logger.log('Share failed (ok): ' + e.message);
    }
    
    return {
      success: true,
      fileId: file.getId(),
      fileUrl: 'https://lh3.googleusercontent.com/d/' + file.getId()
    };
  } catch (e) {
    Logger.log('❌ uploadGameImage error: ' + e.message);
    return { success: false, message: e.message };
  }
}

// ============================================================
// ADMIN PASSWORD
// ============================================================
function getAdminPassword() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const adminSheet = ss.getSheetByName(ADMIN_SHEET_NAME);
  if (!adminSheet) {
    setupSheet();
    return 'admin123';
  }
  const cell = adminSheet.getRange('B2');
  if (cell.isBlank()) {
    cell.setValue('admin123');
    return 'admin123';
  }
  return cell.getValue().toString();
}

function verifyAdminPassword(input) {
  return input === getAdminPassword();
}

function changeAdminPassword(current, newPwd) {
  const stored = getAdminPassword();
  if (current !== stored) {
    return { success: false, message: 'Current password is incorrect.' };
  }
  if (newPwd.length < 6) {
    return { success: false, message: 'New password must be at least 6 characters.' };
  }
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const adminSheet = ss.getSheetByName(ADMIN_SHEET_NAME);
  if (!adminSheet) {
    setupSheet();
    return { success: false, message: 'System error. Please try again.' };
  }
  adminSheet.getRange('B2').setValue(newPwd);
  return { success: true, message: 'Admin password updated successfully.' };
}

// ============================================================
// 🔒 SECURE PASSWORD HASHING
// ============================================================
function hashPassword(password) {
  const combined = password + ENCRYPTION_KEY;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, combined, Utilities.Charset.UTF_8);
  return digest.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

// ============================================================
// 👤 CUSTOMER ACCOUNT FUNCTIONS
// ============================================================
function generateReferralCode(email) {
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, email, Utilities.Charset.UTF_8);
  const code = 'REF' + hash.map(b => (b & 0xF).toString(16)).join('').substring(0, 8).toUpperCase();
  return code;
}

function createAccount(email, password, name, phone, referralCode) {
  try {
    Logger.log('📝 createAccount called - referralCode received: "' + referralCode + '"');
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(CUSTOMERS_SHEET_NAME);
    if (!sheet) {
      setupSheet();
      return { success: false, message: 'System error. Please try again.' };
    }
    if (!email || !password || !name) {
      return { success: false, message: 'All fields are required.' };
    }
    if (password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters.' };
    }
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toLowerCase() === email.toLowerCase()) {
        return { success: false, message: 'Email already registered. Please log in.' };
      }
    }
    const hashedPassword = hashPassword(password);
    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    const refCode = generateReferralCode(email);
    
    // ✅ CHANGE 1: Default to 'Nex4UpStore' if no valid referral code is provided
    let referredBy = 'Nex4UpStore';
    if (referralCode) {
      const refData = sheet.getDataRange().getValues();
      const inputCode = String(referralCode).trim().toUpperCase();
      for (let i = 1; i < refData.length; i++) {
        const storedCode = refData[i][7] ? String(refData[i][7]).trim().toUpperCase() : '';
        if (storedCode === inputCode) {
          referredBy = refData[i][0];
          break;
        }
      }
    }
    sheet.appendRow([email, hashedPassword, name, phone || '', '', dateStr, dateStr, refCode, referredBy || '']);
    
    // ✅ CHANGE 2: Always record the referral/welcome row
    recordReferral(referredBy, email);
    
    // ✅ CHANGE 3: Always generate the welcome coupon immediately
    const config = getReferralConfig();
    const friendCouponCode = config['Friend Coupon Code'] || 'WELCOME10';
    const friendDiscountType = config['Friend Discount Type'] || 'percentage';
    const friendDiscountValue = parseFloat(config['Friend Discount Value']) || 10;
    const friendMinOrder = parseFloat(config['Min Order for Friend']) || 50;
    const maxPerCustomer = parseInt(config['Max Per Customer']) || 1;
    
    const newUserCoupon = createPromoCode(
      friendCouponCode + '_' + Utilities.getUuid().substring(0, 6).toUpperCase(),
      friendDiscountType,
      friendDiscountValue,
      friendMinOrder,
      maxPerCustomer,
      30
    );
    
    // Save the generated coupon into the Referrals sheet (Column 5)
    const refSheet = ss.getSheetByName(REFERRALS_SHEET_NAME);
    const refData = refSheet.getDataRange().getValues();
    for (let k = refData.length - 1; k >= 1; k--) {
      if (refData[k][1] === email && refData[k][0] === referredBy) {
        refSheet.getRange(k + 1, 5).setValue(newUserCoupon);
        
        // If it's a direct signup (no real referrer), mark Friend Reward Given as Yes immediately
        // and send the welcome email
        if (referredBy === 'Nex4UpStore') {
          refSheet.getRange(k + 1, 7).setValue('Yes'); // New User Reward Given
          sendReferralRewardEmail(email, newUserCoupon, 'newuser', friendDiscountType, friendDiscountValue);
        }
        break;
      }
    }
    
    return { success: true, message: 'Account created successfully!', referralCode: refCode };
  } catch (e) {
    return { success: false, message: 'Error creating account: ' + e.message };
  }
}

function recordReferral(referrerEmail, newEmail) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(REFERRALS_SHEET_NAME);
    if (!sheet) {
      setupSheet();
      sheet = ss.getSheetByName(REFERRALS_SHEET_NAME);
    }
    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([referrerEmail, newEmail, dateStr, '', '', 'No', 'No', 'No']);
  } catch (e) {
    Logger.log('Error recording referral: ' + e.message);
  }
}

function loginCustomer(identifier, password) {
  if (!identifier || !password) {
    return { success: false, message: 'Email/Username and password are required.' };
  }
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(CUSTOMERS_SHEET_NAME);
    if (!sheet) {
      setupSheet();
      const newSheet = ss.getSheetByName(CUSTOMERS_SHEET_NAME);
      if (!newSheet) {
        return { success: false, message: 'Could not create Customers sheet.' };
      }
      return findUserByIdentifier(newSheet, identifier.trim().toLowerCase(), password);
    }
    return findUserByIdentifier(sheet, identifier.trim().toLowerCase(), password);
  } catch (e) {
    Logger.log('❌ Exception in loginCustomer: ' + e.message);
    return { success: false, message: 'Error logging in: ' + e.message };
  }
}

function findUserByIdentifier(sheet, identifier, password) {
  try {
    const data = sheet.getDataRange().getValues();
    const hashedInput = hashPassword(password);
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const email = row[0] ? String(row[0]).trim().toLowerCase() : '';
      const name = row[2] ? String(row[2]).trim().toLowerCase() : '';
      if (email === identifier || name === identifier) {
        if (row[1] === hashedInput) {
          const now = new Date();
          const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
          sheet.getRange(i + 1, 7).setValue(dateStr);
          return {
            success: true,
            customer: {
              email: String(row[0] || ''),
              name: String(row[2] || ''),
              phone: String(row[3] || ''),
              profileImage: String(row[4] || ''),
              createdDate: String(row[5] || ''),
              referralCode: String(row[7] || ''),
              referredBy: String(row[8] || '')
            }
          };
        } else {
          return { success: false, message: 'Incorrect password.' };
        }
      }
    }
    return { success: false, message: 'Email/Username not found. Please register.' };
  } catch (e) {
    Logger.log('❌ findUserByIdentifier error: ' + e.message);
    return { success: false, message: 'Error searching for user: ' + e.message };
  }
}

function getCustomerByEmail(email) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(CUSTOMERS_SHEET_NAME);
    if (!sheet) return null;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toLowerCase() === email.toLowerCase()) {
        return {
          email: data[i][0],
          name: data[i][2] || '',
          phone: data[i][3] || '',
          profileImage: data[i][4] || '',
          createdDate: data[i][5] || '',
          referralCode: data[i][7] || '',
          referredBy: data[i][8] || ''
        };
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

function updateCustomerProfile(email, name, phone, profileImage) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(CUSTOMERS_SHEET_NAME);
    if (!sheet) return { success: false, message: 'System error.' };
    
    let finalImageUrl = profileImage;
    if (profileImage && profileImage.startsWith('data:image')) {
      finalImageUrl = uploadProfilePicToDrive(email, profileImage);
    }
    
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toLowerCase() === email.toLowerCase()) {
        const rowIndex = i + 1;
        if (name !== undefined) sheet.getRange(rowIndex, 3).setValue(name);
        if (phone !== undefined) sheet.getRange(rowIndex, 4).setValue(phone);
        if (finalImageUrl !== undefined) sheet.getRange(rowIndex, 5).setValue(finalImageUrl);
        return { success: true, message: 'Profile updated successfully!' };
      }
    }
    return { success: false, message: 'Customer not found.' };
  } catch (e) {
    return { success: false, message: 'Error updating profile: ' + e.message };
  }
}

function updateCustomerPassword(email, currentPassword, newPassword) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(CUSTOMERS_SHEET_NAME);
    if (!sheet) return { success: false, message: 'System error.' };
    const data = sheet.getDataRange().getValues();
    const hashedCurrent = hashPassword(currentPassword);
    const hashedNew = hashPassword(newPassword);
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toLowerCase() === email.toLowerCase()) {
        if (data[i][1] !== hashedCurrent) {
          return { success: false, message: 'Current password is incorrect.' };
        }
        const rowIndex = i + 1;
        sheet.getRange(rowIndex, 2).setValue(hashedNew);
        return { success: true, message: 'Password updated successfully!' };
      }
    }
    return { success: false, message: 'Customer not found.' };
  } catch (e) {
    return { success: false, message: 'Error updating password: ' + e.message };
  }
}

// ============================================================
// 📁 GENRE IMAGES FUNCTIONS
// ============================================================
function getGenreImages() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(GENRE_IMAGES_SHEET_NAME);
    if (!sheet) {
      setupSheet();
      return {};
    }
    const data = sheet.getDataRange().getValues();
    const result = {};
    for (let i = 1; i < data.length; i++) {
      const genre = data[i][0] ? data[i][0].toString().trim() : '';
      const imageUrl = data[i][1] ? data[i][1].toString().trim() : '';
      if (genre) result[genre] = imageUrl;
    }
    return result;
  } catch (e) {
    Logger.log('❌ Error getting genre images: ' + e.message);
    return {};
  }
}

function updateGenreImage(genre, imageUrl) {
  try {
    if (!genre) return { success: false, message: 'Genre name is required.' };
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(GENRE_IMAGES_SHEET_NAME);
    if (!sheet) {
      setupSheet();
      sheet = ss.getSheetByName(GENRE_IMAGES_SHEET_NAME);
    }
    const data = sheet.getDataRange().getValues();
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim() === genre) {
        sheet.getRange(i + 1, 2).setValue(imageUrl);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([genre, imageUrl]);
    }
    return { success: true, message: 'Genre image updated.' };
  } catch (e) {
    return { success: false, message: 'Error updating genre image: ' + e.message };
  }
}

// ============================================================
// 🎮 GAMES DATA FUNCTIONS
// ============================================================
function getSoldQuantities() {
  const orders = getOrdersData();
  if (!orders || orders.length === 0) return {};
  const soldMap = {};
  orders.forEach(o => {
    const status = getStatusValue(o);
    if (status !== 'Paid' && status !== 'Shipped') return;
    const itemsStr = o['Items'] || '';
    const parts = itemsStr.split(',').map(s => s.trim());
    parts.forEach(part => {
      const match = part.match(/^(.*?)\s*×\s*(\d+)$/);
      if (match) {
        const title = match[1].trim();
        const qty = parseInt(match[2]) || 1;
        soldMap[title] = (soldMap[title] || 0) + qty;
      }
    });
  });
  return soldMap;
}

function getReviewSummaryMap() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(REVIEWS_SHEET_NAME);
    if (!sheet) return {};
    const data = sheet.getDataRange().getValues();
    const summary = {};
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      const gid = row[1].toString();
      const rating = parseInt(row[5]) || 0;
      if (!summary[gid]) summary[gid] = { total: 0, count: 0 };
      summary[gid].total += rating;
      summary[gid].count += 1;
    }
    const result = {};
    Object.keys(summary).forEach(gid => {
      result[gid] = {
        avgRating: summary[gid].total / summary[gid].count,
        reviewCount: summary[gid].count
      };
    });
    return result;
  } catch (e) {
    Logger.log('getReviewSummaryMap error: ' + e.message);
    return {};
  }
}

function getGamesData() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(GAME_SHEET_NAME);
  if (!sheet) return [];

  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];

  const soldMap = getSoldQuantities();
  const reviewSummary = getReviewSummaryMap();
  const games = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    if (!row[0] && !row[1]) continue;

    const title = row[1] || '';
    const additionalImagesStr = row[10] || '';
    const additionalImages = additionalImagesStr
      ? additionalImagesStr.split(',').map(s => s.trim()).filter(s => s)
      : [];

    const gameId = row[0] || i;
    const summary = reviewSummary[gameId.toString()] || {
      avgRating: 0,
      reviewCount: 0
    };

    // Parse variant JSON safely
    let variantOptions = [];
    let variants = [];

    try {
      variantOptions = row[15] ? JSON.parse(row[15]) : [];
    } catch (e) {
      variantOptions = [];
    }

    try {
      variants = row[16] ? JSON.parse(row[16]) : [];
    } catch (e) {
      variants = [];
    }

    // New setting: default old products to eligible.
    const eligibilityValue = row[17];

    const firstPurchaseDiscountEligible =
      eligibilityValue === '' ||
      eligibilityValue === null ||
      eligibilityValue === undefined
        ? true
        : String(eligibilityValue).toLowerCase() === 'yes';

games.push({
      id: gameId,
      title: title,
      category: row[2] || 'General',
      price: parseFloat(row[3]) || 0,
      cost: parseFloat(row[4]) || 0,
      discount: parseFloat(row[5]) || 0,
      quantity: parseInt(row[6]) || 0,
      description: row[7] || '',
      image: row[8] || '',
      badge: row[9] || '',
      additionalImages: additionalImages,
      sold: soldMap[title] || 0,
      avgRating: summary.avgRating,
      reviewCount: summary.reviewCount,
      gameType: row[11] ? row[11].toString().toLowerCase() : 'roblox',
      productType: row[12] ? row[12].toString().toLowerCase() : 'digital',
      requiresShipping: row[13] ? row[13].toString().toLowerCase() === 'yes' : false,
      hasVariants: row[14] ? row[14].toString().toLowerCase() === 'yes' : false,
      variantOptions: variantOptions,
      variants: variants,
      firstPurchaseDiscountEligible: firstPurchaseDiscountEligible,

      // 👇 ADD THIS PROPERTY HERE 👇
      isInstant: row[18] !== undefined && row[18] !== null && row[18] !== ''
        ? String(row[18]).toLowerCase() === 'yes'
        : (row[12] ? String(row[12]).toLowerCase() !== 'physical' : true)
    });
  }

  return games;
}

function getGameById(id) {
  try {
    const games = getGamesData();
    for (let i = 0; i < games.length; i++) {
      if (games[i].id == id) return games[i];
    }
    return null;
  } catch (e) {
    Logger.log('getGameById error: ' + e.message);
    return null;
  }
}

function addGame(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(GAME_SHEET_NAME);

  if (!sheet) {
    setupSheet();
  }

  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(GAME_SHEET_NAME);

  const ids = sh.getRange('A:A').getValues()
    .flat()
    .filter(v => typeof v === 'number' && v > 0);

  const nextId = ids.length ? Math.max(...ids) + 1 : 1;

  const additionalImagesStr = data.additionalImages
    ? data.additionalImages.split(',').map(s => s.trim()).filter(s => s).join(', ')
    : '';

  // Product information
  const productType = (data.productType || 'digital').toString().toLowerCase();

  const requiresShipping =
    (data.requiresShipping === true || data.requiresShipping === 'yes')
      ? 'yes'
      : 'no';

  const hasVariants =
    (data.hasVariants === true || data.hasVariants === 'yes')
      ? 'yes'
      : 'no';

  const variantOptions = Array.isArray(data.variantOptions)
    ? JSON.stringify(data.variantOptions)
    : '[]';

  const variants = Array.isArray(data.variants)
    ? JSON.stringify(data.variants)
    : '[]';

  // NEW: First-purchase discount eligibility
  const firstPurchaseDiscountEligible =
    data.firstPurchaseDiscountEligible === false ||
    data.firstPurchaseDiscountEligible === 'no'
      ? 'no'
      : 'yes';

const isInstant = 
  data.isInstant === true || data.isInstant === 'yes' || data.isInstant === 'true'
    ? 'yes'
    : 'no';

// Inside your 'row' array definition, add isInstant at the very end:
const row = [
  nextId,
  data.title,
  data.category || 'General',
  parseFloat(data.price) || 0,
  parseFloat(data.cost) || 0,
  parseFloat(data.discount) || 0,
  parseInt(data.quantity) || 0,
  data.description || '',
  data.image || '',
  data.badge || '',
  additionalImagesStr,
  (data.gameType || 'roblox').toString().toLowerCase(),
  productType,
  requiresShipping,
  hasVariants,
  variantOptions,
  variants,
  firstPurchaseDiscountEligible,
  isInstant // 👈 ADD THIS AT THE END
];

  sh.appendRow(row);

  return getGamesData();
}

function updateGame(id, data) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(GAME_SHEET_NAME);

    if (!sheet) {
      return {
        success: false,
        message: 'Games sheet not found.'
      };
    }

    const rows = sheet.getDataRange().getValues();

    const additionalImagesStr = data.additionalImages
      ? data.additionalImages.split(',').map(s => s.trim()).filter(s => s).join(', ')
      : '';

    const productType = (data.productType || 'digital').toString().toLowerCase();

    const requiresShipping =
      (data.requiresShipping === true || data.requiresShipping === 'yes')
        ? 'yes'
        : 'no';

    const hasVariants =
      (data.hasVariants === true || data.hasVariants === 'yes')
        ? 'yes'
        : 'no';

    const variantOptions = Array.isArray(data.variantOptions)
      ? JSON.stringify(data.variantOptions)
      : '[]';

    const variants = Array.isArray(data.variants)
      ? JSON.stringify(data.variants)
      : '[]';

    // NEW: First-purchase discount eligibility
    const firstPurchaseDiscountEligible =
      data.firstPurchaseDiscountEligible === false ||
      data.firstPurchaseDiscountEligible === 'no'
        ? 'no'
        : 'yes';

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == id) {

        const rowIndex = i + 1;

const isInstant = 
  data.isInstant === true || data.isInstant === 'yes' || data.isInstant === 'true'
    ? 'yes'
    : 'no';

// Inside your 'updatedRow' array definition, add isInstant at the very end:
const updatedRow = [
  id,
  data.title,
  data.category || 'General',
  parseFloat(data.price) || 0,
  parseFloat(data.cost) || 0,
  parseFloat(data.discount) || 0,
  parseInt(data.quantity) || 0,
  data.description || '',
  data.image || '',
  data.badge || '',
  additionalImagesStr,
  (data.gameType || 'roblox').toString().toLowerCase(),
  productType,
  requiresShipping,
  hasVariants,
  variantOptions,
  variants,
  firstPurchaseDiscountEligible,
  isInstant // 👈 ADD THIS AT THE END
];

        sheet.getRange(rowIndex, 1, 1, updatedRow.length)
          .setValues([updatedRow]);

        return getGamesData();
      }
    }

    return {
      success: false,
      message: 'Game with ID ' + id + ' not found.'
    };

  } catch (e) {
    Logger.log('updateGame error: ' + e.message);

    return {
      success: false,
      message: 'Error updating game: ' + e.message
    };
  }
}

function deleteGame(id) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(GAME_SHEET_NAME);
  if (!sheet) return;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return getGamesData();
}

// ============================================================
// 📋 ORDERS FUNCTIONS
// ============================================================
function getOrdersData() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let ordersSheet = ss.getSheetByName(ORDERS_SHEET_NAME);
    if (!ordersSheet) {
      setupSheet();
      ordersSheet = ss.getSheetByName(ORDERS_SHEET_NAME);
    }
    const rows = ordersSheet.getDataRange().getValues();
    if (rows.length < 2) return [];
    const rawHeaders = rows[0];
    const headers = rawHeaders.map(h => String(h).trim());
    const orders = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0] && !row[1] && !row[2]) continue;
      const order = {};
      headers.forEach((h, idx) => {
        let val = row[idx];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
        }
        order[h] = val;
      });
      orders.push(order);
    }
    Logger.log(`✅ getOrdersData: ${orders.length} orders found.`);
    return orders;
  } catch (e) {
    Logger.log('❌ Error in getOrdersData: ' + e.message);
    return [];
  }
}

function debugOrdersData() {
  return getOrdersData();
}

function getStatusValue(order) {
  // ✅ Prefer Fulfilment Status when payment is Paid but fulfilment is Shipped/Delivered.
  // Otherwise fall back to Payment Status so dashboards remain consistent with the past.
  const payRaw    = order['Payment Status'];
  const fulfilRaw = order['Fulfilment Status'];
  const pay    = payRaw    !== undefined && payRaw    !== null ? String(payRaw).trim()    : '';
  const fulfil = fulfilRaw !== undefined && fulfilRaw !== null ? String(fulfilRaw).trim() : '';

  if (pay === 'Paid' && (fulfil === 'Shipped' || fulfil === 'Delivered')) {
    return fulfil;
  }
  if (pay) return pay;
  if (fulfil) return fulfil;

  // Final fallback — any header containing "status"
  for (let key of Object.keys(order)) {
    if (key.toLowerCase().includes('status') && order[key] != null && String(order[key]).trim() !== '') {
      return String(order[key]).trim();
    }
  }
  return 'Pending';
}

function sendStatusUpdateEmail(order, newStatus) {
  const customerEmail = order['Email'];
  if (!customerEmail) return;
  const orderId = order['Order ID'];
  const statusEmoji = newStatus === 'Paid' ? '✅' : '📦';
  const subject = `${statusEmoji} Order ${orderId} Update – Nex4UpStore`;
  const body = `
Dear ${order['Customer Name'] || 'Valued Customer'},

Your order (${orderId}) has been updated to **${newStatus}**.

Order Details:
- Items: ${order['Items']}
- Total: RM ${parseFloat(order['Total (RM)'] || 0).toFixed(2)}

${newStatus === 'Paid' ? 'Thank you for your payment! We will process your order shortly.' : 'Your order has been shipped. Please allow 1-3 business days for delivery.'}

If you have any questions, please reply to this email.

Thank you for shopping with Nex4UpStore!
`;
  MailApp.sendEmail(customerEmail, subject, body);
}

function getCustomerOrders(email) {
  try {
    if (!email || typeof email !== 'string') return [];
    const orders = getOrdersData();
    if (!orders || orders.length === 0) return [];
    const trimmedEmail = email.trim().toLowerCase();
    return orders.filter(o => {
      const emailVal = o['Email'] || o['email'] || o['Email Address'];
      if (emailVal && typeof emailVal === 'string') {
        return emailVal.trim().toLowerCase() === trimmedEmail;
      }
      return false;
    });
  } catch (e) {
    throw new Error('Error getting customer orders: ' + e.message);
  }
}

function getSalesSummaryWithCost(range) {
  try {
    const orders = getOrdersData();
    if (!orders || orders.length === 0) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        totalCost: 0,
        profit: 0,
        margin: 0,
        statusCounts: { Pending: 0, 'Awaiting Payment': 0, 'Awaiting Verification': 0, Paid: 0, Shipped: 0, Cancelled: 0 },
        lowStock: [],
        topSelling: []
      };
    }
    const now = new Date();
    let startDate = new Date(0);
    if (range === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(now.getFullYear(), now.getMonth(), diff);
    } else if (range === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    let totalOrders = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    const statusCounts = { Pending: 0, 'Awaiting Payment': 0, 'Awaiting Verification': 0, Paid: 0, Shipped: 0, Cancelled: 0 };
    orders.forEach(o => {
      const status = getStatusValue(o);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      if (status !== 'Paid' && status !== 'Shipped') return;
      const orderDate = new Date(o['Date']);
      if (orderDate >= startDate) {
        totalOrders++;
        const revenue = parseFloat(o['Total (RM)']) || 0;
        const cost = parseFloat(o['Total Cost (RM)']) || 0;
        totalRevenue += revenue;
        totalCost += cost;
      }
    });
    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    const lowStock = getLowStockProducts();
    const topSelling = getTopSellingProducts(range);
    return {
      totalOrders,
      totalRevenue,
      totalCost,
      profit,
      margin,
      statusCounts,
      lowStock,
      topSelling
    };
  } catch (e) {
    throw new Error('Error getting sales summary: ' + e.message);
  }
}

function getLowStockProducts() {
  const games = getGamesData();
  const lowStock = games.filter(g =>
    g.quantity <= 5 &&
    g.quantity > 0 &&
    _parseRobuxAmountFromTitle(g.title) === 0
  );
  return lowStock.map(g => ({ title: g.title, quantity: g.quantity }));
}

function getTopSellingProducts(range) {
  try {
    const orders = getOrdersData();
    if (!orders || orders.length === 0) return [];
    const now = new Date();
    let startDate = new Date(0);
    if (range === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(now.getFullYear(), now.getMonth(), diff);
    } else if (range === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    const productMap = {};
    orders.forEach(o => {
      const status = getStatusValue(o);
      if (status !== 'Paid' && status !== 'Shipped') return;
      const orderDate = new Date(o['Date']);
      if (orderDate >= startDate) {
        const itemsStr = o['Items'] || '';
        const parts = itemsStr.split(',').map(s => s.trim());
        parts.forEach(part => {
          const match = part.match(/^(.*?)\s*×\s*(\d+)$/);
          if (match) {
            const title = match[1].trim();
            const qty = parseInt(match[2]) || 1;
            if (!productMap[title]) {
              productMap[title] = { title, qty: 0 };
            }
            productMap[title].qty += qty;
          }
        });
      }
    });
    const sorted = Object.values(productMap).sort((a, b) => b.qty - a.qty);
    return sorted.slice(0, 5);
  } catch (e) {
    throw new Error('Error getting top selling products: ' + e.message);
  }
}

// ============================================================
// 💳 PLACE ORDER
// ============================================================
function getConfigValue(key) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!configSheet) {
    setupSheet();
    configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  }
  const data = configSheet.getDataRange().getValues();
  for (let row of data) {
    if (row[0] === key) return row[1];
  }
  return null;
}

function getNextOrderNumber() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!configSheet) {
    setupSheet();
    configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  }
  const cell = configSheet.getRange('B5');
  const current = parseInt(cell.getValue()) || 1;
  cell.setValue(current + 1);
  return current;
}

function placeOrder(customerData, cartItems, total, promoData, gameIds, paymentMethod, pointsUsed, shippingData, hasPhysicalItem, agentCode, backorderAccepted) {
  try {
    gameIds = gameIds || {};
    pointsUsed = parseInt(pointsUsed) || 0;
    shippingData = shippingData || {};
    hasPhysicalItem = !!hasPhysicalItem;

    const ss = SpreadsheetApp.openById(SHEET_ID);
    let ordersSheet = ss.getSheetByName(ORDERS_SHEET_NAME);
    let gameSheet = ss.getSheetByName(GAME_SHEET_NAME);
    if (!ordersSheet || !gameSheet) {
      setupSheet();
      ordersSheet = ss.getSheetByName(ORDERS_SHEET_NAME);
      gameSheet = ss.getSheetByName(GAME_SHEET_NAME);
    }
    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd');
    const seq = getNextOrderNumber();
    const orderId = `ORD-${dateStr}-${String(seq).padStart(3, '0')}`;

    // ✅ Points discount
    let pointsDiscount = 0;
    if (pointsUsed > 0 && customerData.email) {
      const availablePoints = getCustomerPoints(customerData.email);
      pointsUsed = Math.min(pointsUsed, availablePoints);
      pointsDiscount = pointsUsed * 0.01; 
      pointsUsed = Math.floor(pointsDiscount / 0.01); 
      pointsDiscount = pointsUsed * 0.01; 
    }
    const shippingFee = hasPhysicalItem ? (parseFloat(shippingData.fee) || 0) : 0;
    // ✅ Treat shipping fee as a pass-through cost, not profit —
// it goes to the courier, so the agent shouldn't earn on it.
    const finalTotal = Math.max(0, total - pointsDiscount + shippingFee);

    let itemsArray = [];
    let totalCost = 0;
    const games = getGamesData();
    const variantDetails = [];

    cartItems.forEach(item => {
      const game = games.find(g => g.id === item.id);
      let cost = game ? game.cost : 0;

      if (game && game.hasVariants && item.variantKey && Array.isArray(game.variants)) {
        const variant = game.variants.find(v => _variantKey(v.options) === item.variantKey);
        if (variant && variant.cost && parseFloat(variant.cost) > 0) {
          cost = parseFloat(variant.cost);
        }
      }
      totalCost += cost * item.quantity;

      let label = item.title;
      if (item.variantLabel) label += ' (' + item.variantLabel + ')';
      itemsArray.push(`${label} ×${item.quantity}`);

      if (item.variantLabel) {
        variantDetails.push(`${item.title} - ${item.variantLabel}`);
      }

      if (game) {
        if (game.hasVariants && item.variantKey && Array.isArray(game.variants)) {
          const variantIdx = game.variants.findIndex(v => _variantKey(v.options) === item.variantKey);
          if (variantIdx !== -1) {
            const newStock = Math.max(0, (game.variants[variantIdx].stock || 0) - item.quantity);
            const gameRow = gameSheet.getDataRange().getValues()
              .findIndex((row, idx) => idx > 0 && row[0] === item.id) + 1;
            if (gameRow > 0) {
              const allVariants = JSON.parse(gameSheet.getRange(gameRow, 17).getValue() || '[]');
              if (allVariants[variantIdx]) {
                allVariants[variantIdx].stock = newStock;
                gameSheet.getRange(gameRow, 17).setValue(JSON.stringify(allVariants));
              }
            }
          }
        } else {
          const gameRow = gameSheet.getDataRange().getValues()
            .findIndex((row, idx) => idx > 0 && row[0] === item.id) + 1;
          if (gameRow > 0) {
            const currentQty = parseInt(gameSheet.getRange(gameRow, 7).getValue()) || 0;
            gameSheet.getRange(gameRow, 7).setValue(Math.max(0, currentQty - item.quantity));
          }
        }
      }
    });
    const itemsStr = itemsArray.join(', ');
    const variantDetailsStr = variantDetails.join(' | ');

    let productTypeLabel = 'Digital';
    if (hasPhysicalItem) {
      const hasDigitalItem = cartItems.some(item => {
        const g = games.find(gg => gg.id === item.id);
        return g && g.productType === 'digital';
      });
      productTypeLabel = hasDigitalItem ? 'Mixed' : 'Physical';
    }

    const rb = (gameIds && gameIds.roblox) || {};
    const ml = (gameIds && gameIds.ml) || {};
    const pb = (gameIds && gameIds.pubg) || {};
    const ot = (gameIds && gameIds.other) || {};

    let pmLabel = '';
    if (paymentMethod === 'mae') pmLabel = 'MAE';
    else if (paymentMethod === 'tng') pmLabel = "Touch 'n Go";
    else if (paymentMethod === 'shopee') pmLabel = 'ShopeePay';
    else pmLabel = paymentMethod || 'N/A';

    // ✅ NEW: Calculate Gateway & Platform Fees
    const costSettings = getCostSettings();
    const gwFeePercent = parseFloat(costSettings['Payment Gateway Fee (%)']) || 2;
    const platformFee = parseFloat(costSettings['Platform Fee (RM)']) || 0.50;
    const gatewayFee = (finalTotal * (gwFeePercent / 100));
    const totalBusinessCost = totalCost + gatewayFee + platformFee + shippingFee;
    const actualNetProfit = finalTotal - totalBusinessCost;

    // ✅ NEW: Check for Sales Agent
    let agentEmail = '';
    let commissionRate = 0;
    let commissionAmount = 0;
    
    if (agentCode) {
      const salesTeam = getSalesTeam();
      const agentRecord = salesTeam.find(a => a.code === agentCode && a.status === 'Active');
      if (agentRecord) {
        agentEmail = agentRecord.email;
        commissionRate = agentRecord.rate;
        commissionAmount = actualNetProfit > 0 ? (actualNetProfit * (commissionRate / 100)) : 0;
      }
    }

    // ✅ ROBUX INVENTORY: reserve stock OR create backorder
    var robuxRequired = getRobuxAmountFromCartItems(cartItems, games);
    var robuxReserve = { success: true, reserved: 0, shortage: 0, backorderId: '' };
    if (robuxRequired > 0) {
      robuxReserve = reserveRobuxForOrder(
        orderId,
        customerData.email || '',
        robuxRequired,
        !!backorderAccepted,
        Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
      );
      if (!robuxReserve.success) {
        throw new Error(robuxReserve.message || 'Insufficient Robux stock.');
      }
    }

const baseRow = [
      orderId,
      Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
      customerData.name || shippingData.name || '',
      customerData.phone || shippingData.phone || '',
      rb.robloxUsername || customerData.roblox || '',
      customerData.email || '',
      itemsStr,
      finalTotal,
      totalCost,
      'Awaiting Payment',
      pmLabel,
      '',
      rb.robloxNickname || '',
      ml.mlUserId || '',
      ml.mlZoneId || '',
      pb.pubgUserId || '',
      pb.pubgNickname || '',
      ot.otherAccountId || '',
      '', '', '',
      pointsUsed,
      pointsDiscount,
      0,
      shippingData.address || '',
      shippingData.city || '',
      shippingData.state || '',
      shippingData.postcode || '',
      shippingFee,
      variantDetailsStr,
      productTypeLabel,
      agentEmail,
      gatewayFee,
      platformFee,
      actualNetProfit,
      commissionAmount
    ];

    if (promoData) {
      const discountAmt = (promoData.discountAmount || 0);
      baseRow[11] = `Promo: ${promoData.code} (discount RM ${discountAmt.toFixed(2)})`;
      recordCouponUsage(customerData.email, promoData.code, orderId, discountAmt);
    }

    // Map extended columns by exact header name so Fulfilment & Robux columns never misalign
    const sheetHeaders = ordersSheet.getRange(1, 1, 1, ordersSheet.getLastColumn()).getValues()[0];
    const totalCols = Math.max(sheetHeaders.length, baseRow.length);
    const row = new Array(totalCols);
    for (let rIdx = 0; rIdx < totalCols; rIdx++) {
      row[rIdx] = rIdx < baseRow.length ? baseRow[rIdx] : '';
    }

    const namedCols = {
      'Fulfilment Status': '',
      'Review Status': '',
      'Robux Required': robuxRequired,
      'Robux Reserved': robuxReserve.reserved,
      'Robux Backorder': robuxReserve.shortage,
      'Backorder Accepted': robuxReserve.shortage > 0 ? 'Yes' : '',
      'Backorder Status': robuxReserve.shortage > 0 ? 'Waiting for stock' : '',
      'Robux Deducted': 'No'
    };
    for (let hIdx = 0; hIdx < sheetHeaders.length; hIdx++) {
      const hName = String(sheetHeaders[hIdx] || '').trim();
      if (namedCols.hasOwnProperty(hName)) {
        row[hIdx] = namedCols[hName];
      }
    }

    try {
      ordersSheet.appendRow(row);
      SpreadsheetApp.flush();
    } catch (appendErr) {
      // Roll back the reservation if the order could not be saved
      if (robuxRequired > 0) {
        try { releaseRobuxReservation(orderId, 'Order save failed'); } catch (e) {}
      }
      throw appendErr;
    }

    // ✅ NEW: Create Commission Record if agent exists
    if (agentEmail && commissionAmount >= 0) {
      const commSheet = ss.getSheetByName(COMMISSIONS_SHEET_NAME);
      const commId = 'COMM-' + Utilities.getUuid().substring(0, 8).toUpperCase();
      commSheet.appendRow([
        commId, orderId, agentEmail, Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
        finalTotal, totalBusinessCost, actualNetProfit, commissionRate, commissionAmount, 'Pending'
      ]);
    }

    if (pointsUsed > 0 && customerData.email) {
      updateCustomerPoints(customerData.email, -pointsUsed);
      addPointsLedger(customerData.email, orderId, -pointsUsed, 'Redeemed on Order');
    }

    try {
      sendOrderEmails(orderId, customerData, cartItems, finalTotal, gameIds, pmLabel, shippingData, shippingFee, productTypeLabel);
    } catch (emailError) {
      Logger.log('⚠️ Email sending failed: ' + emailError.message);
    }

    try {
      sendOrderTelegramNotification({
        orderId: orderId,
        customerData: customerData,
        cartItems: cartItems,
        finalTotal: finalTotal,
        gameIds: gameIds,
        pmLabel: pmLabel,
        productTypeLabel: productTypeLabel,
        shippingData: shippingData,
        shippingFee: shippingFee,
        pointsUsed: pointsUsed,
        promoData: promoData,
        dateObj: now
      });
    } catch (tgErr) {
      Logger.log('⚠️ Telegram notification failed: ' + tgErr.message);
    }

    return orderId;
  } catch (e) {
    Logger.log('❌ Error in placeOrder: ' + e.message);
    throw new Error('Error placing order: ' + e.message);
  }
}

// ✅ Helper: build a stable key from variant options object
function _variantKey(optionsObj) {
  if (!optionsObj || typeof optionsObj !== 'object') return '';
  return Object.keys(optionsObj).sort().map(k => k + '=' + optionsObj[k]).join('|');
}

function recordCouponUsage(email, couponCode, orderId, discountAmount) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(COUPON_USAGE_SHEET_NAME);
    if (!sheet) {
      setupSheet();
      sheet = ss.getSheetByName(COUPON_USAGE_SHEET_NAME);
    }
    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([email, couponCode, orderId, dateStr, discountAmount, 'Pending']);
  } catch (e) {
    Logger.log('Error recording coupon usage: ' + e.message);
  }
}

// ✅ Called when order becomes Paid → mark usage Confirmed + bump PromoCodes Used Count
function confirmCouponUsage(orderId, newStatus) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const usageSheet = ss.getSheetByName(COUPON_USAGE_SHEET_NAME);
    if (!usageSheet) return;

    const data = usageSheet.getDataRange().getValues();
    if (data.length < 2) return;
    const headers = data[0].map(h => String(h).trim());
    const orderIdIdx  = headers.indexOf('Order ID');
    const codeIdx     = headers.indexOf('Coupon Code');
    const statusIdx   = headers.indexOf('Status');
    if (orderIdIdx === -1 || codeIdx === -1 || statusIdx === -1) return;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][orderIdIdx]) !== String(orderId)) continue;

      const couponCode    = data[i][codeIdx];
      const currentStatus = String(data[i][statusIdx] || 'Pending');

      if (newStatus === 'Paid' && currentStatus !== 'Confirmed') {
        usageSheet.getRange(i + 1, statusIdx + 1).setValue('Confirmed');
        adjustPromoUsedCount(couponCode, +1);
        Logger.log('✅ Coupon ' + couponCode + ' confirmed for order ' + orderId);
      } else if (newStatus === 'Cancelled') {
        if (currentStatus === 'Confirmed') {
          usageSheet.getRange(i + 1, statusIdx + 1).setValue('Cancelled');
          adjustPromoUsedCount(couponCode, -1);
          Logger.log('↩️ Coupon ' + couponCode + ' released for cancelled order ' + orderId);
        } else if (currentStatus === 'Pending') {
          usageSheet.getRange(i + 1, statusIdx + 1).setValue('Cancelled');
          Logger.log('❌ Coupon reservation cancelled for order ' + orderId);
        }
      }
    }
  } catch (e) {
    Logger.log('confirmCouponUsage error: ' + e.message);
  }
}

// ✅ Bumps the "Used Count" column on PromoCodes sheet (never below 0)
function adjustPromoUsedCount(code, delta) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const promoSheet = ss.getSheetByName(PROMO_SHEET_NAME);
    if (!promoSheet) return;
    const data = promoSheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const codeIdx = headers.indexOf('Code');
    const usedIdx = headers.indexOf('Used Count');
    if (codeIdx === -1 || usedIdx === -1) return;

    for (let i = 1; i < data.length; i++) {
      if (data[i][codeIdx] && data[i][codeIdx].toString().toUpperCase() === code.toString().toUpperCase()) {
        const current = parseInt(data[i][usedIdx]) || 0;
        const next = Math.max(0, current + delta);
        promoSheet.getRange(i + 1, usedIdx + 1).setValue(next);
        return;
      }
    }
  } catch (e) {
    Logger.log('adjustPromoUsedCount error: ' + e.message);
  }
}

// ============================================================
// 🔁 REFERRAL REWARD SYSTEM
// ============================================================
function checkReferralRewards(email) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let refSheet = ss.getSheetByName(REFERRALS_SHEET_NAME);
    if (!refSheet) return;
    const data = refSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === email && data[i][7] === 'No') { // Order not completed
        const referrerEmail = data[i][0];
        const rowIndex = i + 1;

        // Mark as completed
        refSheet.getRange(rowIndex, 8).setValue('Yes');

        if (referrerEmail === 'Nex4UpStore') {
          // Direct signup. No referrer reward needed.
          break;
        }

        // Process referrer reward
        const config = getReferralConfig();
        const maxPerCustomer = parseInt(config['Max Per Customer']) || 1;
        const completedCount = getCompletedReferralCount(referrerEmail);
        const tier = getTierForCount(completedCount + 1);
        const discountType = tier.discountType;
        const discountValue = tier.discountValue;

        let referrerCouponCode = '';
        if (discountValue > 0) {
          referrerCouponCode = createPromoCode(
            'REF' + Utilities.getUuid().substring(0, 8).toUpperCase(),
            discountType,
            discountValue,
            0,
            maxPerCustomer,
            30
          );
        }

        refSheet.getRange(rowIndex, 4).setValue(referrerCouponCode);
        refSheet.getRange(rowIndex, 6).setValue('Yes'); // Referrer Reward Given

        if (referrerCouponCode) {
          sendReferralRewardEmail(referrerEmail, referrerCouponCode, 'referrer', discountType, discountValue);
        }
        
        // Failsafe: If friend reward wasn't sent yet, send it now
        if (data[i][6] === 'No') {
           refSheet.getRange(rowIndex, 7).setValue('Yes'); 
           const friendCoupon = data[i][4];
           if (friendCoupon) {
             const friendDiscountType = config['Friend Discount Type'] || 'percentage';
             const friendDiscountValue = parseFloat(config['Friend Discount Value']) || 10;
             sendReferralRewardEmail(email, friendCoupon, 'newuser', friendDiscountType, friendDiscountValue);
           }
        }

        break;
      }
    }
  } catch (e) {
    Logger.log('Error checking referral rewards: ' + e.message);
  }
}

function getCompletedReferralCount(email) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(REFERRALS_SHEET_NAME);
    if (!sheet) return 0;
    const data = sheet.getDataRange().getValues();
    let count = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === email && data[i][7] === 'Yes') {
        count++;
      }
    }
    return count;
  } catch (e) {
    return 0;
  }
}

function getTierForCount(count) {
  const config = getReferralConfig();
  const tiers = [
    { threshold: parseInt(config['Tier 1 Referrals'] || 1), discountType: config['Tier 1 Discount Type'] || 'percentage', discountValue: parseFloat(config['Tier 1 Discount Value']) || 10 },
    { threshold: parseInt(config['Tier 2 Referrals'] || 2), discountType: config['Tier 2 Discount Type'] || 'percentage', discountValue: parseFloat(config['Tier 2 Discount Value']) || 20 },
    { threshold: parseInt(config['Tier 3 Referrals'] || 3), discountType: config['Tier 3 Discount Type'] || 'percentage', discountValue: parseFloat(config['Tier 3 Discount Value']) || 30 },
    { threshold: parseInt(config['Tier 4 Referrals'] || 4), discountType: config['Tier 4 Discount Type'] || 'percentage', discountValue: parseFloat(config['Tier 4 Discount Value']) || 40 }
  ];
  tiers.sort((a, b) => a.threshold - b.threshold);
  let tier = null;
  for (let t of tiers) {
    if (count >= t.threshold) {
      tier = t;
    } else {
      break;
    }
  }
  if (!tier) tier = tiers[0];
  if (count >= 5) {
    return {
      discountType: config['Tier 5+ Discount Type'] || 'fixed',
      discountValue: parseFloat(config['Tier 5+ Discount Value']) || 50
    };
  }
  return tier;
}

function createPromoCode(code, discountType, discountValue, minOrder, maxPerCustomer, expiryDays) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let promoSheet = ss.getSheetByName(PROMO_SHEET_NAME);
    if (!promoSheet) {
      setupSheet();
      promoSheet = ss.getSheetByName(PROMO_SHEET_NAME);
    }
    const now = new Date();
    const expiry = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);
    const expiryStr = Utilities.formatDate(expiry, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    promoSheet.appendRow([
      code,
      discountType,
      discountValue,
      minOrder,
      maxPerCustomer,
      expiryStr,
      1,
      0
    ]);
    return code;
  } catch (e) {
    Logger.log('Error creating promo code: ' + e.message);
    return null;
  }
}

function sendReferralRewardEmail(email, couponCode, type, discountType, discountValue) {
  const subject = type === 'referrer' ? '🎉 You earned a referral reward!' : '🎁 Welcome gift from your friend!';
  const discountText = discountType === 'percentage' ? discountValue + '% off' : 'RM ' + discountValue.toFixed(2) + ' off';
  const body = `
Dear ${email},

${type === 'referrer' ? 'Your friend has placed their first order! You\'ve earned a referral coupon.' : 'Your friend referred you to Nex4UpStore! Here\'s a welcome coupon for your next purchase.'}

Coupon Code: ${couponCode}
Discount: ${discountText}
Valid for 30 days.

Thank you for being part of Nex4UpStore!
`;
  MailApp.sendEmail(email, subject, body);
}

// ============================================================
// 📧 SEND ORDER EMAILS
// ============================================================
function sendOrderEmails(orderId, customer, cart, total, gameIds, paymentMethodLabel, shippingData, shippingFee, productTypeLabel) {
  const customerEmail = customer.email;
  gameIds = gameIds || {};
  shippingData = shippingData || {};
  shippingFee = parseFloat(shippingFee) || 0;

  let cartSummary = '';
  cart.forEach(item => {
    const price = item.discount ? item.price * (1 - item.discount / 100) : item.price;
    let line = `- ${item.title}`;
    if (item.variantLabel) line += ` [${item.variantLabel}]`;
    line += ` × ${item.quantity} = RM ${(price * item.quantity).toFixed(2)}`;
    cartSummary += line + '\n';
  });

  let idSummary = '';
  const rb = gameIds.roblox || {};
  const ml = gameIds.ml || {};
  const pb = gameIds.pubg || {};
  const ot = gameIds.other || {};
  if (rb.robloxUsername || rb.robloxNickname) idSummary += '\nRoblox Username: ' + (rb.robloxUsername || '-') + '\nRoblox Nickname: ' + (rb.robloxNickname || '-');
  if (ml.mlUserId || ml.mlZoneId) idSummary += '\nML User ID: ' + (ml.mlUserId || '-') + '\nML Zone ID: ' + (ml.mlZoneId || '-');
  if (pb.pubgUserId || pb.pubgNickname) idSummary += '\nPUBG User ID: ' + (pb.pubgUserId || '-') + '\nPUBG Nickname: ' + (pb.pubgNickname || '-');
  if (ot.otherAccountId) idSummary += '\nOther Account ID: ' + ot.otherAccountId;

  let shippingSummary = '';
  if (shippingData.address) {
    shippingSummary = '\n📦 SHIPPING DETAILS:\n' +
      'Name: ' + (shippingData.name || customer.name || '-') + '\n' +
      'Phone: ' + (shippingData.phone || customer.phone || '-') + '\n' +
      'Address: ' + shippingData.address + '\n' +
      (shippingData.city ? 'City: ' + shippingData.city + '\n' : '') +
      (shippingData.state ? 'State: ' + shippingData.state + '\n' : '') +
      (shippingData.postcode ? 'Postcode: ' + shippingData.postcode + '\n' : '') +
      (shippingFee > 0 ? 'Shipping Fee: RM ' + shippingFee.toFixed(2) + '\n' : '');
  }

  // ✅ Admin notification
  const ownerSubject = `🛒 New Order ${orderId} from ${customer.name || 'Customer'} (${productTypeLabel || 'Digital'})`;
  const ownerBody = `
New order placed!

Order ID: ${orderId}
Date: ${new Date()}
Product Type: ${productTypeLabel || 'Digital'}
Customer: ${customer.name || 'N/A'}
Phone: ${customer.phone || 'N/A'}
Email: ${customer.email || 'N/A'}
Payment Method: ${paymentMethodLabel || 'N/A'}
${shippingSummary}
Account Details:${idSummary || '\n(no game IDs provided)'}

Items:
${cartSummary}
Total: RM ${total.toFixed(2)}
Status: Awaiting Payment

Customer will see the QR code and upload a receipt.
Please verify in your banking app before approving.
`;
  MailApp.sendEmail(ADMIN_NOTIFICATION_EMAIL, ownerSubject, ownerBody);

  // ✅ Customer confirmation
  const custSubject = `🧾 Order Confirmation – Nex4UpStore (${orderId})`;
  const custBody = `
Dear ${customer.name || 'Valued Customer'},

Thank you for your order at Nex4UpStore!

Order ID: ${orderId}
Payment Method: ${paymentMethodLabel || 'N/A'}
${shippingSummary}
Items:
${cartSummary}
Total: RM ${total.toFixed(2)}

---

Next step:
A QR payment window has appeared on your screen.
Scan the QR with your ${paymentMethodLabel || 'payment'} app to pay the exact amount.
After paying, upload your receipt screenshot on the same window.
${shippingData.address ? '\nWe will ship your physical items to the address above once payment is verified.' : ''}

We will verify and process your order within 1-2 hours.

Thank you for shopping with Nex4UpStore!
`;
  MailApp.sendEmail(customerEmail, custSubject, custBody);
}

// ============================================================
// 🎁 PROMO CODE FUNCTIONS
// ============================================================
function validatePromoCode(code, email, subtotal) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(PROMO_SHEET_NAME);
    if (!sheet) {
      setupSheet();
      return { valid: false, message: 'Promo system not configured.' };
    }
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { valid: false, message: 'No promo codes available.' };
    const headers = data[0];
    const codeIndex = headers.indexOf('Code');
    const typeIndex = headers.indexOf('Discount Type');
    const valueIndex = headers.indexOf('Discount Value');
    const minOrderIndex = headers.indexOf('Min Order Amount');
    const maxPerCustomerIndex = headers.indexOf('Max Per Customer');
    const expiryIndex = headers.indexOf('Expiry Date');
    const usageIndex = headers.indexOf('Usage Limit');
    const usedIndex = headers.indexOf('Used Count');
    if (codeIndex === -1 || typeIndex === -1 || valueIndex === -1) {
      return { valid: false, message: 'Promo sheet format incorrect.' };
    }
    const now = new Date();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[codeIndex] && row[codeIndex].toString().toUpperCase() === code.toUpperCase()) {
        const expiry = row[expiryIndex] ? new Date(row[expiryIndex]) : null;
        if (expiry && expiry < now) {
          return { valid: false, message: 'Promo code has expired.' };
        }
        const limit = row[usageIndex] ? parseInt(row[usageIndex]) : Infinity;
        const used = row[usedIndex] ? parseInt(row[usedIndex]) : 0;
        if (used >= limit) {
          return { valid: false, message: 'Promo code usage limit exceeded.' };
        }
        const minOrder = row[minOrderIndex] ? parseFloat(row[minOrderIndex]) : 0;
        if (subtotal < minOrder) {
          return { valid: false, message: `Minimum order amount is RM ${minOrder.toFixed(2)}.` };
        }
        if (email && row[maxPerCustomerIndex] && parseInt(row[maxPerCustomerIndex]) > 0) {
          const maxPer = parseInt(row[maxPerCustomerIndex]);
          const usageCount = getCustomerCouponUsage(email, code);
          if (usageCount >= maxPer) {
            return { valid: false, message: `You have already used this coupon ${maxPer} time(s).` };
          }
        }
        const discountType = row[typeIndex].toString().toLowerCase();
        const discountValue = parseFloat(row[valueIndex]);
        if (isNaN(discountValue) || discountValue <= 0) {
          return { valid: false, message: 'Invalid discount value.' };
        }
        // ✅ REMOVED: don't increment here — only validate
        return {
          valid: true,
          code: row[codeIndex],
          discountType: discountType === 'percentage' ? 'percentage' : 'fixed',
          discountValue: discountValue,
          minOrder: minOrder,
          description: `Discount ${discountType === 'percentage' ? discountValue + '%' : 'RM ' + discountValue.toFixed(2)} (min. order RM ${minOrder.toFixed(2)})`
        };
      }
    }
    return { valid: false, message: 'Invalid promo code.' };
  } catch (e) {
    return { valid: false, message: 'Error validating promo: ' + e.message };
  }
}

function getCustomerCouponUsage(email, couponCode) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(COUPON_USAGE_SHEET_NAME);
    if (!sheet) return 0;
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return 0;
    const headers = data[0].map(h => String(h).trim());
    const emailIdx  = headers.indexOf('Email');
    const codeIdx   = headers.indexOf('Coupon Code');
    const statusIdx = headers.indexOf('Status');
    if (emailIdx === -1 || codeIdx === -1) return 0;
    let count = 0;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][emailIdx]) !== email) continue;
      if (String(data[i][codeIdx]) !== couponCode) continue;
      if (statusIdx !== -1) {
        if (String(data[i][statusIdx]) === 'Confirmed') count++;
      } else {
        count++;
      }
    }
    return count;
  } catch (e) {
    return 0;
  }
}

// ============================================================
// ❤️ WISHLIST FUNCTIONS
// ============================================================
function toggleWishlist(email, gameId) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(WISHLIST_SHEET_NAME);
    if (!sheet) {
      setupSheet();
      sheet = ss.getSheetByName(WISHLIST_SHEET_NAME);
    }
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString() === email && data[i][1] && data[i][1].toString() === gameId.toString()) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex === -1) {
      const now = new Date();
      const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
      sheet.appendRow([email, gameId, dateStr]);
      return { added: true };
    } else {
      sheet.deleteRow(rowIndex);
      return { added: false };
    }
  } catch (e) {
    throw new Error('Error toggling wishlist: ' + e.message);
  }
}

function getWishlist(email) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(WISHLIST_SHEET_NAME);
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    const gameIds = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString() === email) {
        const id = parseInt(data[i][1]);
        if (!isNaN(id)) gameIds.push(id);
      }
    }
    if (gameIds.length === 0) return [];
    const allGames = getGamesData();
    return allGames.filter(g => gameIds.includes(g.id));
  } catch (e) {
    throw new Error('Error getting wishlist: ' + e.message);
  }
}

function getWishlistIds(email) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(WISHLIST_SHEET_NAME);
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    const ids = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString() === email) {
        const id = parseInt(data[i][1]);
        if (!isNaN(id)) ids.push(id);
      }
    }
    return ids;
  } catch (e) {
    return [];
  }
}

// ============================================================
// 🐛 DEBUG FUNCTIONS
// ============================================================
function testConnection() {
  return { success: true, message: 'Connection successful.' };
}

function debugCustomerEmails() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(CUSTOMERS_SHEET_NAME);
  if (!sheet) {
    Logger.log('❌ Customers sheet not found!');
    return;
  }
  const data = sheet.getDataRange().getValues();
  Logger.log('📋 Total rows: ' + data.length);
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    Logger.log(`📧 Row ${i}: Email = "${row[0]}" | Name = "${row[2]}"`);
  }
}

function testLoginDirect() {
  var email = 'your-test-email@example.com';
  var password = 'your-test-password';
  var result = loginCustomer(email, password);
  Logger.log('🔍 Direct call result: ' + JSON.stringify(result));
  return result;
}

// ============================================================
// 📊 REFERRAL CONFIG CRUD
// ============================================================
function getReferralConfig() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(REFERRAL_CONFIG_SHEET_NAME);
    if (!sheet) {
      setupSheet();
      return {};
    }
    const data = sheet.getDataRange().getValues();
    const config = {};
    for (let i = 1; i < data.length; i++) {
      const key = data[i][0] ? data[i][0].toString().trim() : '';
      const value = data[i][1] ? data[i][1].toString().trim() : '';
      if (key) config[key] = value;
    }
    return config;
  } catch (e) {
    Logger.log('Error getting referral config: ' + e.message);
    return {};
  }
}

function updateReferralConfig(updates) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(REFERRAL_CONFIG_SHEET_NAME);
    if (!sheet) {
      setupSheet();
      return { success: false, message: 'Config sheet not found.' };
    }
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const key = data[i][0] ? data[i][0].toString().trim() : '';
      if (key && updates[key] !== undefined) {
        sheet.getRange(i + 1, 2).setValue(updates[key]);
      }
    }
    return { success: true, message: 'Referral settings updated.' };
  } catch (e) {
    return { success: false, message: 'Error updating config: ' + e.message };
  }
}

function getCustomerReferralData(email) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const custSheet = ss.getSheetByName(CUSTOMERS_SHEET_NAME);
    let referralCode = '';
    if (custSheet) {
      const custData = custSheet.getDataRange().getValues();
      for (let i = 1; i < custData.length; i++) {
        if (custData[i][0] === email) {
          referralCode = custData[i][7] || '';
          break;
        }
      }
    }
    const refSheet = ss.getSheetByName(REFERRALS_SHEET_NAME);
    let referrals = [];
    let completedCount = 0;
    if (refSheet) {
      const refData = refSheet.getDataRange().getValues();
      for (let i = 1; i < refData.length; i++) {
        if (refData[i][0] === email) {
          const status = refData[i][7] === 'Yes' ? 'Completed' : 'Pending';
          if (status === 'Completed') completedCount++;
          referrals.push({
            friendEmail: refData[i][1] || '',
            referredAt: refData[i][2] || '',
            status: status,
            referrerCoupon: refData[i][3] || '',
            friendCoupon: refData[i][4] || ''
          });
        }
      }
    }
    const config = getReferralConfig();
    const nextReward = getNextRewardDescription(completedCount + 1, config);
    
// ✅ Always use the public GitHub Pages URL for referral links
const baseUrl = PUBLIC_SITE_URL;

// Build the referral link (guard against trailing slash issues)
const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
const referralLink = referralCode ? cleanBase + '?ref=' + referralCode : '';

return {
  referralCode: referralCode,
  referralLink: referralLink,
  referrals: referrals,
  completedCount: completedCount,
  nextReward: nextReward
};
  } catch (e) {
    Logger.log('Error getting customer referral data: ' + e.message);
    return { referralCode: '', referralLink: '', referrals: [], completedCount: 0, nextReward: '' }; // ✅ Includes referralLink
  }
}

function getNextRewardDescription(count, config) {
  if (count <= 0) return '';
  const tier = getTierForCount(count);
  if (!tier) return '';
  if (tier.discountType === 'fixed') {
    return `You've earned a RM ${tier.discountValue} coupon! 🎉`;
  } else {
    return `You've earned a ${tier.discountValue}% off coupon! 🎉`;
  }
}

// ============================================================
// ⭐ REVIEWS SYSTEM
// ============================================================
function getReviewsSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(REVIEWS_SHEET_NAME);
  if (!sheet) {
    setupSheet();
    sheet = ss.getSheetByName(REVIEWS_SHEET_NAME);
  }
  return sheet;
}

function getReviews(gameId) {
  try {
    if (gameId === null || gameId === undefined || gameId === '') {
      return [];
    }
    const sheet = getReviewsSheet();
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();

    // ✅ Build email → { image, name } map from Customers sheet
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const custSheet = ss.getSheetByName(CUSTOMERS_SHEET_NAME);
    const profileMap = {};
    if (custSheet) {
      const custData = custSheet.getDataRange().getValues();
      const custHeaders = custData[0].map(h => String(h).trim());
      const emailIdx = custHeaders.indexOf('Email');
      const imgIdx   = custHeaders.indexOf('Profile Image');
      const nameIdx  = custHeaders.indexOf('Name');
      if (emailIdx !== -1) {
        for (let i = 1; i < custData.length; i++) {
          const em = String(custData[i][emailIdx] || '').toLowerCase().trim();
          if (!em) continue;
          profileMap[em] = {
            image: imgIdx  !== -1 ? String(custData[i][imgIdx]  || '') : '',
            name:  nameIdx !== -1 ? String(custData[i][nameIdx] || '') : ''
          };
        }
      }
    }

    const reviews = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      if (String(row[1]) !== String(gameId)) continue;

      let dateVal = row[9];
      if (dateVal instanceof Date) {
        dateVal = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
      } else {
        dateVal = String(dateVal || '');
      }

      const email = String(row[3] || '').toLowerCase().trim();
      const profile = profileMap[email] || { image: '', name: '' };

      reviews.push({
        reviewId: String(row[0] || ''),
        gameId: row[1],
        gameTitle: String(row[2] || ''),
        customerEmail: String(row[3] || ''),
        customerName: String(row[4] || profile.name || 'Anonymous'),
        customerProfileImage: profile.image,          // ✅ NEW
        rating: parseInt(row[5]) || 0,
        reviewText: String(row[6] || ''),
        date: dateVal
      });
    }

  function backfillReviewAvatars() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const custSheet = ss.getSheetByName(CUSTOMERS_SHEET_NAME);
  const custData = custSheet.getDataRange().getValues();
  const map = {};
  for (let i = 1; i < custData.length; i++) {
    const em = String(custData[i][0] || '').toLowerCase().trim();
    if (em) map[em] = custData[i][4] || '';   // Profile Image column
  }
  Logger.log('Customers with avatar: ' + Object.keys(map).filter(k => map[k]).length);
  Logger.log('Map: ' + JSON.stringify(map));
  // The frontend now looks this up live on every call, so no sheet update needed —
  // this log just confirms the mapping is correct.
}

    reviews.sort(function(a, b) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    return reviews || [];
  } catch (e) {
    Logger.log('getReviews error: ' + e.message);
    return [];
  }
}

function getCustomerReview(gameId, customerEmail) {
  try {
    if (!customerEmail || !gameId) return null;
    const sheet = getReviewsSheet();
    if (!sheet) return null;
    const data = sheet.getDataRange().getValues();
    const email = customerEmail.toString().trim().toLowerCase();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      const rowEmail = (row[3] || '').toString().trim().toLowerCase();
      if (rowEmail === email && String(row[1]) === String(gameId)) {
        let dateVal = row[9];
        if (dateVal instanceof Date) {
          dateVal = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
        } else {
          dateVal = String(dateVal || '');
        }
        return {
          reviewId: String(row[0] || ''),
          gameId: row[1],
          gameTitle: String(row[2] || ''),
          customerEmail: String(row[3] || ''),
          customerName: String(row[4] || 'Anonymous'),
          rating: parseInt(row[5]) || 0,
          reviewText: String(row[6] || ''),
          date: dateVal
        };
      }
    }
    return null;
  } catch (e) {
    Logger.log('getCustomerReview error: ' + e.message);
    return null;
  }
}

function addReview(gameId, customerEmail, customerName, rating, reviewText) {
  try {
    if (!gameId || !customerEmail) {
      return { success: false, message: 'Missing required fields.' };
    }
    rating = parseInt(rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return { success: false, message: 'Rating must be between 1 and 5.' };
    }
    reviewText = (reviewText || '').toString().trim();
    if (!reviewText) {
      return { success: false, message: 'Please write a review.' };
    }
    if (reviewText.length > 1000) {
      return { success: false, message: 'Review is too long (max 1000 characters).' };
    }

    const sheet = getReviewsSheet();
    const data = sheet.getDataRange().getValues();
    const email = customerEmail.toString().trim().toLowerCase();
    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      const rowEmail = (row[3] || '').toString().trim().toLowerCase();
      if (rowEmail === email && row[1].toString() === gameId.toString()) {
        sheet.getRange(i + 1, 5).setValue(customerName || row[4] || 'Anonymous');
        sheet.getRange(i + 1, 6).setValue(rating);
        sheet.getRange(i + 1, 7).setValue(reviewText);
        sheet.getRange(i + 1, 10).setValue(dateStr);
        return { success: true, message: 'Review updated successfully!' };
      }
    }

    const game = getGamesData().find(g => g.id == gameId);
    const gameTitle = game ? game.title : 'Unknown Game';
    const reviewId = 'REV-' + Utilities.getUuid().substring(0, 8).toUpperCase();

    sheet.appendRow([
      reviewId, gameId, gameTitle, customerEmail,
      customerName || 'Anonymous', rating, reviewText,
      'Yes', 'Approved', dateStr
    ]);

    return { success: true, message: 'Review submitted successfully!' };
  } catch (e) {
    Logger.log('addReview error: ' + e.message);
    return { success: false, message: 'Error submitting review: ' + e.message };
  }
}

function getAllReviews() {
  try {
    const sheet = getReviewsSheet();
    const data = sheet.getDataRange().getValues();
    const reviews = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      reviews.push({
        reviewId: row[0], gameId: row[1], gameTitle: row[2],
        customerEmail: row[3], customerName: row[4],
        rating: parseInt(row[5]) || 0, reviewText: row[6],
        verifiedPurchase: row[7] === 'Yes', status: row[8],
        createdAt: row[9] || ''
      });
    }
    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return reviews;
  } catch (e) {
    Logger.log('getAllReviews error: ' + e.message);
    return [];
  }
}

function updateReviewStatus(reviewId, newStatus) {
  try {
    const sheet = getReviewsSheet();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === reviewId) {
        sheet.getRange(i + 1, 9).setValue(newStatus);
        return { success: true, message: 'Review status updated to ' + newStatus + '.' };
      }
    }
    return { success: false, message: 'Review not found.' };
  } catch (e) {
    return { success: false, message: 'Error updating review: ' + e.message };
  }
}

function deleteReview(reviewId) {
  try {
    const sheet = getReviewsSheet();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === reviewId) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Review deleted.' };
      }
    }
    return { success: false, message: 'Review not found.' };
  } catch (e) {
    return { success: false, message: 'Error deleting review: ' + e.message };
  }
}

// ============================================================
// 🎁 GET PENDING REFERRAL COUPON (For Auto-Apply)
// ============================================================
function getPendingReferralCoupon(email) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const refSheet = ss.getSheetByName(REFERRALS_SHEET_NAME);
    if (!refSheet) return null;
    
    const data = refSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      // Check if this email is a referred friend, and their order hasn't been completed yet
      if (data[i][1] === email && data[i][7] === 'No') { 
        const couponCode = data[i][4]; // Column E is "New User Coupon"
        if (couponCode) {
          // Fetch the coupon details from the PromoCodes sheet
          const promoSheet = ss.getSheetByName(PROMO_SHEET_NAME);
          const promoData = promoSheet.getDataRange().getValues();
          for (let j = 1; j < promoData.length; j++) {
            if (promoData[j][0] === couponCode) {
              return {
                valid: true,
                code: promoData[j][0],
                discountType: promoData[j][1],
                discountValue: parseFloat(promoData[j][2]),
                minOrder: parseFloat(promoData[j][3]) || 0,
                description: `Welcome discount: ${promoData[j][1] === 'percentage' ? promoData[j][2] + '%' : 'RM ' + promoData[j][2]} (min. order RM ${promoData[j][3] || 0})`
              };
            }
          }
        }
      }
    }
    return null;
  } catch (e) {
    Logger.log('Error getting pending referral coupon: ' + e.message);
    return null;
  }
}

// ============================================================
// 💾 BACKUP & RESTORE GAME DATA
// ============================================================
function backupGamesData() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const gameSheet = ss.getSheetByName(GAME_SHEET_NAME);
    if (!gameSheet) return { success: false, message: 'Games sheet not found' };
    
    const data = gameSheet.getDataRange().getValues();
    if (data.length < 2) return { success: false, message: 'No game data to backup' };
    
    // Create backup sheet if missing
    let backupSheet = ss.getSheetByName(GAME_BACKUP_SHEET_NAME);
    if (!backupSheet) {
      backupSheet = ss.insertSheet(GAME_BACKUP_SHEET_NAME);
      const headers = ['Backup ID', 'Date', 'Game Count', 'Type', 'Data (JSON)'];
      backupSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      backupSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1e2a3a').setFontColor('#f7d875');
      backupSheet.setFrozenRows(1);
      backupSheet.setColumnWidth(1, 200);
      backupSheet.setColumnWidth(2, 180);
      backupSheet.setColumnWidth(3, 100);
      backupSheet.setColumnWidth(4, 100);
      backupSheet.setColumnWidth(5, 500);
    }
    
    const now = new Date();
    const backupId = 'BKP-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    
    const jsonData = JSON.stringify(data);
    const gameCount = data.length - 1;
    
    backupSheet.appendRow([backupId, dateStr, gameCount, 'Manual', jsonData]);
    SpreadsheetApp.flush(); // ✅ ADD THIS LINE - Forces immediate write
    
    // Keep only last 20 backups to prevent sheet from getting huge
    const allBackups = backupSheet.getDataRange().getValues();
    if (allBackups.length > 21) {
      const excess = allBackups.length - 21;
      for (let i = 0; i < excess; i++) {
        backupSheet.deleteRow(2); // Delete oldest
      }
    }
    
    return {
      success: true,
      message: 'Backup created successfully!',
      backupId: backupId,
      gameCount: gameCount
    };
  } catch (e) {
    Logger.log('backupGamesData error: ' + e.message);
    return { success: false, message: e.message };
  }
}

function getBackupHistory() {
  Logger.log('🚀 getBackupHistory v3 called at ' + new Date());
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const backupSheet = ss.getSheetByName(GAME_BACKUP_SHEET_NAME);
    if (!backupSheet) {
      Logger.log('❌ Backup sheet not found');
      return JSON.stringify([]);
    }
    
    const data = backupSheet.getDataRange().getValues();
    Logger.log('📊 Backup sheet row count: ' + data.length);
    
    if (data.length < 2) {
      Logger.log('⚠️ Not enough data');
      return JSON.stringify([]);
    }
    
    const backups = [];
    for (let i = 1; i < data.length; i++) {
      // ✅ Convert EVERY value to a plain string/number to ensure JSON safety
      let dateVal = data[i][1];
      if (dateVal instanceof Date) {
        dateVal = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
      } else {
        dateVal = String(dateVal || '');
      }
      
      backups.push({
        backupId: String(data[i][0] || ''),
        date: dateVal,
        gameCount: Number(data[i][2]) || 0,
        type: String(data[i][3] || 'Manual')
      });
    }
    
    Logger.log('✅ Returning ' + backups.length + ' backups');
    backups.reverse();
    return JSON.stringify(backups); // ✅ Convert to string
  } catch (e) {
    Logger.log('❌ getBackupHistory error: ' + e.message);
    return JSON.stringify([]);
  }
}

function restoreGamesFromBackup(backupId) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const backupSheet = ss.getSheetByName(GAME_BACKUP_SHEET_NAME);
    if (!backupSheet) return { success: false, message: 'No backups found' };
    
    const data = backupSheet.getDataRange().getValues();
    let backupRow = null;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === backupId) {
        backupRow = data[i];
        break;
      }
    }
    if (!backupRow) return { success: false, message: 'Backup not found' };
    
    const backupData = JSON.parse(backupRow[4]);
    if (!backupData || backupData.length < 1) {
      return { success: false, message: 'Backup is empty or corrupted' };
    }
    
    // Safety: Auto-backup current state before restoring
    try { 
      const s = backupGamesData(); 
      Logger.log('Safety backup created: ' + s.message);
    } catch (e) {}
    
    // Restore data
    const gameSheet = ss.getSheetByName(GAME_SHEET_NAME);
    gameSheet.clearContents();
    gameSheet.getRange(1, 1, backupData.length, backupData[0].length).setValues(backupData);
    
    // Reapply header formatting
    const headers = backupData[0];
    const headerRange = gameSheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold').setBackground('#1e2a3a').setFontColor('#f7d875');
    gameSheet.setFrozenRows(1);
    
    return { 
      success: true, 
      message: 'Restored ' + (backupData.length - 1) + ' games from backup!' 
    };
  } catch (e) {
    Logger.log('restoreGamesFromBackup error: ' + e.message);
    return { success: false, message: e.message };
  }
}

// ✅ Optional: Auto-daily backup (setup in Apps Script Triggers)
function autoDailyBackup() {
  const result = backupGamesData();
  Logger.log('Auto daily backup: ' + JSON.stringify(result));
  return result;
}

function diagnoseEmail() {
  Logger.log('=== EMAIL DIAGNOSTIC START ===');
  
  // 1. Check the "from" address (who the script is running as)
  try {
    const activeUser = Session.getActiveUser().getEmail();
    const effectiveUser = Session.getEffectiveUser().getEmail();
    Logger.log('Active user: "' + activeUser + '"');
    Logger.log('Effective user: "' + effectiveUser + '"');
  } catch (e) {
    Logger.log('❌ User lookup failed: ' + e.message);
  }
  
  // 2. Check remaining email quota
  try {
    const remaining = MailApp.getRemainingDailyQuota();
    Logger.log('Remaining email quota: ' + remaining);
  } catch (e) {
    Logger.log('❌ Quota check failed: ' + e.message);
  }
  
  // 3. Attempt to send
  try {
    MailApp.sendEmail({
      to: 'nex4upstore@gmail.com',
      subject: 'Nex4UpStore Test Email - ' + new Date(),
      body: 'If you received this, MailApp works correctly.',
      name: 'Nex4UpStore Test'
    });
    Logger.log('✅ sendEmail() executed without throwing an error.');
  } catch (e) {
    Logger.log('❌ sendEmail THREW AN ERROR: ' + e.message);
    Logger.log('Error name: ' + e.name);
  }
  
  Logger.log('=== EMAIL DIAGNOSTIC END ===');
}

// ============================================================
// 🪙 LOYALTY POINTS SYSTEM HELPER FUNCTIONS
// ============================================================
function getCustomerPoints(email) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(CUSTOMERS_SHEET_NAME);
    if (!sheet) return 0;
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const pointsIdx = headers.indexOf('Points Balance');
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().toLowerCase() === email.toLowerCase()) {
        return parseInt(data[i][pointsIdx]) || 0;
      }
    }
    return 0;
  } catch (e) {
    Logger.log('getCustomerPoints error: ' + e.message);
    return 0;
  }
}

function addPointsLedger(email, orderId, pointsChange, reason, referenceId) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName('PointsLedger');
    if (!sheet) { setupSheet(); sheet = ss.getSheetByName('PointsLedger'); }
    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    const lastCol = Math.max(sheet.getLastColumn(), 6);
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const refIdx = headers.indexOf('Reference ID');

    const row = [dateStr, email, orderId, pointsChange, reason];
    while (row.length < lastCol) row.push('');
    if (refIdx !== -1 && referenceId) row[refIdx] = referenceId;

    sheet.appendRow(row);
  } catch (e) {
    Logger.log('addPointsLedger error: ' + e.message);
  }
}

function updateCustomerPoints(email, pointsChange) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(CUSTOMERS_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const pointsIdx = headers.indexOf('Points Balance');
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().toLowerCase() === email.toLowerCase()) {
        const current = parseInt(data[i][pointsIdx]) || 0;
        const newBalance = Math.max(0, current + pointsChange);
        sheet.getRange(i + 1, pointsIdx + 1).setValue(newBalance);
        return newBalance;
      }
    }
    return 0;
  } catch (e) {
    Logger.log('updateCustomerPoints error: ' + e.message);
    return 0;
  }
}

// ============================================================
// 🔑 FORCE PERMISSIONS (Run this once to grant Drive access)
// ============================================================
function forcePermissions() {
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL, [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/script.send_mail'
  ]);
  Logger.log('✅ Permissions granted!');
}

function debugDashboardData() {
  const orders = getOrdersData();
  Logger.log('Total orders in sheet: ' + orders.length);
  
  const statusTally = {};
  let totalRev = 0, totalCost = 0, paidCount = 0;
  
  orders.forEach((o, i) => {
    const status = getStatusValue(o);
    statusTally[status] = (statusTally[status] || 0) + 1;
    
    Logger.log(`Row ${i+1}: ID=${o['Order ID']} | Status="${status}" | Total=${o['Total (RM)']} | Date=${o['Date']}`);
    
    if (status === 'Paid' || status === 'Shipped') {
      paidCount++;
      totalRev += parseFloat(o['Total (RM)']) || 0;
      totalCost += parseFloat(o['Total Cost (RM)']) || 0;
    }
  });
  
  Logger.log('===== SUMMARY =====');
  Logger.log('Status breakdown: ' + JSON.stringify(statusTally));
  Logger.log('Paid/Shipped orders: ' + paidCount);
  Logger.log('Total revenue: RM ' + totalRev.toFixed(2));
  Logger.log('Total cost: RM ' + totalCost.toFixed(2));
  
  return { statusTally, paidCount, totalRev, totalCost };
}

// ============================================================
// 📱 TELEGRAM NOTIFICATIONS (with invisible-char protection)
// ============================================================
function sendTelegramNotification(message) {
  try {
    // ✅ STRIP every non-printable ASCII character (spaces, BOM, zero-width, etc.)
    var token  = String(TELEGRAM_BOT_TOKEN || '').replace(/[^\x21-\x7E]/g, '');
    var chatId = String(TELEGRAM_CHAT_ID   || '').replace(/[^\-\d]/g, '');

    if (!token || !chatId) {
      Logger.log('⚠️ Telegram not configured.');
      return { success: false, message: 'Not configured' };
    }

    var url = 'https://api.telegram.org/bot' + token + '/sendMessage';
    var options = {
      method: 'post',
      payload: {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      },
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(url, options);
    var status = response.getResponseCode();
    if (status === 200) {
      Logger.log('✅ Telegram sent');
      return { success: true };
    } else {
      Logger.log('❌ Telegram failed: ' + response.getContentText());
      return { success: false, message: response.getContentText() };
    }
  } catch (e) {
    Logger.log('❌ sendTelegramNotification error: ' + e.message);
    return { success: false, message: e.message };
  }
}

// ✅ Debug helper — shows EXACTLY what the script sees
function debugTelegram() {
  var raw = String(TELEGRAM_BOT_TOKEN || '');
  Logger.log('=== TELEGRAM DEBUG ===');
  Logger.log('Raw length: ' + raw.length);
  Logger.log('Raw content: "' + raw + '"');

  // Scan for suspicious invisible characters
  var suspicious = false;
  for (var i = 0; i < raw.length; i++) {
    var code = raw.charCodeAt(i);
    if (code < 33 || code > 126) {  // outside printable ASCII range
      Logger.log('⚠️ INVISIBLE char at position ' + i + ' — code ' + code);
      suspicious = true;
    }
  }
  if (!suspicious) Logger.log('✅ No invisible characters detected.');

  // After cleaning
  var clean = raw.replace(/[^\x21-\x7E]/g, '');
  Logger.log('Cleaned length: ' + clean.length);

  // Test getMe — this is the "who am I" endpoint
  var response = UrlFetchApp.fetch('https://api.telegram.org/bot' + clean + '/getMe', {
    muteHttpExceptions: true
  });
  Logger.log('getMe response: ' + response.getContentText());
  Logger.log('=== END DEBUG ===');
}

// ✅ Test function
function testTelegram() {
  var result = sendTelegramNotification(
    '✅ <b>Nex4UpStore</b>\nTelegram notifications are working!'
  );
  Logger.log('Test result: ' + JSON.stringify(result));
  return result;
}

// ============================================================
// 📱 TELEGRAM — FULL ORDER NOTIFICATION
// ============================================================
function sendOrderTelegramNotification(order) {
  try {
    var e = escapeTelegramHtml;

    // ============ 1. HEADER ============
    var msg = '<b>🛒 NEW ORDER RECEIVED!</b>\n\n';

    // ============ 2. ORDER ID ============
    msg += '━━━━━━━━━━━━━━━━━━━━\n';
    msg += '🆔 <b>ORDER ID</b>\n';
    msg += '<code>' + e(order.orderId) + '</code>\n\n';

    // ============ 3. CUSTOMER INFO ============
    msg += '👤 <b>CUSTOMER</b>\n';
    msg += e(order.customerData.name || 'N/A') + '\n';
    msg += '📧 ' + e(order.customerData.email || 'N/A') + '\n';
    msg += '📱 ' + e(order.customerData.phone || 'N/A') + '\n';
    msg += '💳 Payment: <b>' + e(order.pmLabel || 'N/A') + '</b>\n';
    msg += '⏰ ' + e(Utilities.formatDate(
      order.dateObj || new Date(),
      Session.getScriptTimeZone(),
      'dd MMM yyyy, h:mm a'
    )) + '\n\n';

    // ============ 4. GAME ACCOUNT DETAILS ============
    var g = order.gameIds || {};
    var rb = g.roblox || {};
    var ml = g.ml || {};
    var pb = g.pubg || {};
    var ot = g.other || {};

    var hasGameInfo = (rb.robloxUsername || rb.robloxNickname ||
                       ml.mlUserId || ml.mlZoneId ||
                       pb.pubgUserId || pb.pubgNickname ||
                       ot.otherAccountId);

    if (hasGameInfo) {
      msg += '━━━━━━━━━━━━━━━━━━━━\n';
      msg += '🎮 <b>GAME ACCOUNT</b>\n';
      if (rb.robloxUsername) msg += '🎯 Roblox Username: <b>' + e(rb.robloxUsername) + '</b>\n';
      if (rb.robloxNickname) msg += '🎯 Roblox Nickname: <b>' + e(rb.robloxNickname) + '</b>\n';
      if (ml.mlUserId)       msg += '🎯 ML User ID: <b>' + e(ml.mlUserId) + '</b>\n';
      if (ml.mlZoneId)       msg += '🎯 ML Zone ID: <b>' + e(ml.mlZoneId) + '</b>\n';
      if (pb.pubgUserId)     msg += '🎯 PUBG User ID: <b>' + e(pb.pubgUserId) + '</b>\n';
      if (pb.pubgNickname)   msg += '🎯 PUBG Nickname: <b>' + e(pb.pubgNickname) + '</b>\n';
      if (ot.otherAccountId) msg += '🎯 Account ID: <b>' + e(ot.otherAccountId) + '</b>\n';
      msg += '\n';
    }

    // ============ 5. PRODUCTS PURCHASED ============
    msg += '━━━━━━━━━━━━━━━━━━━━\n';
    msg += '🛍 <b>PRODUCTS PURCHASED</b>\n';

    var cartItems = order.cartItems || [];
    var hasVariant = false;

    for (var i = 0; i < cartItems.length; i++) {
      var item = cartItems[i];
      var unitPrice = item.price || 0;
      if (item.discount && item.discount > 0) {
        unitPrice = unitPrice * (1 - item.discount / 100);
      }
      var lineTotal = unitPrice * (item.quantity || 1);

      var line = '• ' + e(item.title);
      if (item.variantLabel) {
        line += ' <i>[' + e(item.variantLabel) + ']</i>';
        hasVariant = true;
      }
      line += ' × ' + e(item.quantity || 1);
      line += ' → <b>RM ' + lineTotal.toFixed(2) + '</b>';
      msg += line + '\n';
    }
    msg += '\n';

    // ============ 6. SHIPPING (if physical) ============
    if (order.shippingData && order.shippingData.address) {
      msg += '━━━━━━━━━━━━━━━━━━━━\n';
      msg += '📦 <b>SHIPPING DETAILS</b>\n';
      msg += '👤 ' + e(order.shippingData.name || 'N/A') + '\n';
      msg += '📱 ' + e(order.shippingData.phone || 'N/A') + '\n';
      msg += '🏠 ' + e(order.shippingData.address || '') + '\n';
      if (order.shippingData.city)     msg += '🏙 ' + e(order.shippingData.city) + '\n';
      if (order.shippingData.state)    msg += '📍 ' + e(order.shippingData.state) + '\n';
      if (order.shippingData.postcode) msg += '📮 ' + e(order.shippingData.postcode) + '\n';
      if (order.shippingFee > 0)       msg += '💵 Shipping: RM ' + order.shippingFee.toFixed(2) + '\n';
      msg += '⚠️ <i>Pre-order — ships on 13th</i>\n\n';
    }

    // ============ 7. PAYMENT SUMMARY ============
    msg += '━━━━━━━━━━━━━━━━━━━━\n';
    msg += '💰 <b>PAYMENT SUMMARY</b>\n';

    if (order.pointsUsed && order.pointsUsed > 0) {
      msg += '🎁 Points used: ' + order.pointsUsed + '\n';
    }
    if (order.promoData && order.promoData.code) {
      msg += '🏷 Promo: ' + e(order.promoData.code) +
             ' (−RM ' + (order.promoData.discountAmount || 0).toFixed(2) + ')\n';
    }
    if (order.shippingFee && order.shippingFee > 0) {
      msg += '📦 Shipping: RM ' + order.shippingFee.toFixed(2) + '\n';
    }
    msg += '\n💵 <b>TOTAL: RM ' + (order.finalTotal || 0).toFixed(2) + '</b>\n\n';

    // ============ 8. STATUS ============
    msg += '📦 Type: <b>' + e(order.productTypeLabel || 'Digital') + '</b>\n';
    msg += '⏳ Status: <b>Awaiting Payment</b>\n\n';
    msg += '<i>Customer will upload receipt soon.</i>';

    // ============ 9. SEND ============
    return sendTelegramNotification(msg);
  } catch (e) {
    Logger.log('❌ sendOrderTelegramNotification error: ' + e.message);
    return { success: false, message: e.message };
  }
}

// ✅ Escape HTML special chars for Telegram's HTML parse mode
function escapeTelegramHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ============================================================
// 💬 CUSTOMER SUPPORT MESSAGES / INBOX
// ============================================================
const MESSAGES_SHEET_NAME = 'Messages';
// 📌 All chat images are stored in the same Drive folder as receipts.
//    Change this to a new folder ID if you want them separated.
const CHAT_IMAGE_FOLDER_ID = RECEIPT_FOLDER_ID;

function _getMessagesSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(MESSAGES_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(MESSAGES_SHEET_NAME);
    const headers = ['Message ID', 'Date', 'Customer Email', 'Customer Name',
                     'Sender', 'Message', 'Image URL', 'Read By Customer', 'Read By Admin'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#1e2a3a').setFontColor('#f7d875');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function _saveChatImage(dataUrl, prefix) {
  try {
    if (!dataUrl || !dataUrl.startsWith('data:image')) return '';
    const parts = dataUrl.split(',');
    if (parts.length < 2) return '';
    const meta = parts[0];
    const data = parts[1];
    const mimeMatch = meta.match(/data:(.*?);base64/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    let ext = 'jpg';
    if (mimeType.indexOf('png') !== -1) ext = 'png';
    else if (mimeType.indexOf('webp') !== -1) ext = 'webp';
    else if (mimeType.indexOf('gif') !== -1) ext = 'gif';
    const safePrefix = String(prefix || 'chat').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const fileName = 'CHAT_' + safePrefix + '_' + new Date().getTime() + '.' + ext;
    const folder = DriveApp.getFolderById(CHAT_IMAGE_FOLDER_ID);
    const blob = Utilities.newBlob(Utilities.base64Decode(data), mimeType, fileName);
    const file = folder.createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    return 'https://lh3.googleusercontent.com/d/' + file.getId();
  } catch (e) {
    Logger.log('_saveChatImage error: ' + e.message);
    return '';
  }
}

function sendMessage(customerEmail, customerName, messageText, imageDataUrl) {
  try {
    if (!customerEmail) return { success: false, message: 'Email is required.' };
    if (!messageText && !imageDataUrl) return { success: false, message: 'Message or image required.' };

    let imageUrl = '';
    if (imageDataUrl) imageUrl = _saveChatImage(imageDataUrl, 'CUST_' + customerEmail);

    const sheet = _getMessagesSheet();
    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    const msgId = 'MSG-' + Utilities.getUuid().substring(0, 8).toUpperCase();

    sheet.appendRow([msgId, dateStr, customerEmail, customerName || '', 'customer',
                     messageText || '', imageUrl, 'Yes', 'No']);

    // Notify admin via Telegram + email
    try {
      const tg = '<b>💬 NEW SUPPORT MESSAGE</b>\n\n' +
        '👤 <b>' + escapeTelegramHtml(customerName || 'Customer') + '</b>\n' +
        '📧 ' + escapeTelegramHtml(customerEmail) + '\n\n' +
        '💭 ' + escapeTelegramHtml(messageText || '(image only)') + '\n' +
        (imageUrl ? '\n<a href="' + escapeTelegramHtml(imageUrl) + '">📎 View Image</a>' : '') +
        '\n\n<i>Reply in Admin Panel → Inbox</i>';
      sendTelegramNotification(tg);
    } catch (e) { Logger.log('TG notify: ' + e.message); }

    try {
      MailApp.sendEmail(ADMIN_NOTIFICATION_EMAIL,
        '💬 New customer message from ' + (customerName || customerEmail),
        'From: ' + (customerName || '') + ' <' + customerEmail + '>\n\n' + (messageText || '(image only)') +
        (imageUrl ? '\n\nImage: ' + imageUrl : '') +
        '\n\nReply in the admin panel → Inbox.');
    } catch (e) { Logger.log('Email notify: ' + e.message); }

    return { success: true, messageId: msgId };
  } catch (e) {
    Logger.log('sendMessage error: ' + e.message);
    return { success: false, message: e.message };
  }
}

function adminSendMessage(customerEmail, messageText, imageDataUrl) {
  try {
    if (!customerEmail) return { success: false, message: 'Customer email required.' };
    if (!messageText && !imageDataUrl) return { success: false, message: 'Message or image required.' };

    let imageUrl = '';
    if (imageDataUrl) imageUrl = _saveChatImage(imageDataUrl, 'ADMIN_' + customerEmail);

    let customerName = '';
    try {
      const c = getCustomerByEmail(customerEmail);
      if (c) customerName = c.name || '';
    } catch (e) {}

    const sheet = _getMessagesSheet();
    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    const msgId = 'MSG-' + Utilities.getUuid().substring(0, 8).toUpperCase();

    sheet.appendRow([msgId, dateStr, customerEmail, customerName, 'admin',
                     messageText || '', imageUrl, 'No', 'Yes']);

    // ✅ NEW: Send email notification to the CUSTOMER
    try {
      const subject = '💬 New reply from Nex4UpStore Support';
      const body = `Hello ${customerName || 'Customer'},\n\n` +
                   `You have a new reply from our support team:\n\n` +
                   `"${messageText || '(Image attached)'}"\n\n` +
                   (imageUrl ? `View Image: ${imageUrl}\n\n` : '') +
                   `Please log in to your account or open the chat widget on our website to reply.\n\n` +
                   `Thank you,\nNex4UpStore Team`;
      MailApp.sendEmail(customerEmail, subject, body);
    } catch (e) {
      Logger.log('Email to customer failed: ' + e.message);
    }

    return { success: true, messageId: msgId };
  } catch (e) {
    Logger.log('adminSendMessage error: ' + e.message);
    return { success: false, message: e.message };
  }
}

function getMessages(customerEmail) {
  try {
    if (!customerEmail) return [];
    const sheet = _getMessagesSheet();
    const data = sheet.getDataRange().getValues();
    const out = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][2]) !== String(customerEmail)) continue;
      out.push({
        messageId: String(data[i][0] || ''),
        date: data[i][1] instanceof Date
          ? Utilities.formatDate(data[i][1], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
          : String(data[i][1] || ''),
        email: String(data[i][2] || ''),
        name: String(data[i][3] || ''),
        sender: String(data[i][4] || ''),
        message: String(data[i][5] || ''),
        imageUrl: String(data[i][6] || '')
      });
    }
    return out;
  } catch (e) {
    Logger.log('getMessages error: ' + e.message);
    return [];
  }
}

function markMessagesRead(customerEmail, readerType) {
  try {
    if (!customerEmail || !readerType) return { success: false };
    const sheet = _getMessagesSheet();
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: true };
    const headers = data[0].map(h => String(h).trim());
    const colIdx = readerType === 'admin'
      ? headers.indexOf('Read By Admin')
      : headers.indexOf('Read By Customer');
    if (colIdx === -1) return { success: false };
    const updates = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][2]) !== String(customerEmail)) continue;
      const sender = String(data[i][4]);
      const already = String(data[i][colIdx]) === 'Yes';
      if (already) continue;
      if (readerType === 'admin' && sender === 'customer') updates.push(i + 1);
      if (readerType === 'customer' && sender === 'admin') updates.push(i + 1);
    }
    updates.forEach(rowIdx => sheet.getRange(rowIdx, colIdx + 1).setValue('Yes'));
    return { success: true, updated: updates.length };
  } catch (e) {
    Logger.log('markMessagesRead error: ' + e.message);
    return { success: false, message: e.message };
  }
}

function getCustomerUnreadCount(customerEmail) {
  try {
    if (!customerEmail) return 0;
    const sheet = _getMessagesSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const readIdx = headers.indexOf('Read By Customer');
    if (readIdx === -1) return 0;
    let n = 0;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][2]) !== String(customerEmail)) continue;
      if (String(data[i][4]) === 'admin' && String(data[i][readIdx]) !== 'Yes') n++;
    }
    return n;
  } catch (e) { return 0; }
}

function getAdminUnreadCount() {
  try {
    const sheet = _getMessagesSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const readIdx = headers.indexOf('Read By Admin');
    if (readIdx === -1) return 0;
    let n = 0;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][4]) === 'customer' && String(data[i][readIdx]) !== 'Yes') n++;
    }
    return n;
  } catch (e) { return 0; }
}

function getAllConversations() {
  try {
    const sheet = _getMessagesSheet();
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    const headers = data[0].map(h => String(h).trim());
    const readAdminIdx = headers.indexOf('Read By Admin');
    const map = {};
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const email = String(row[2] || '');
      if (!email) continue;
      const msgDate = row[1] instanceof Date
        ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
        : String(row[1] || '');
      if (!map[email]) {
        map[email] = {
          email: email,
          name: String(row[3] || ''),
          lastMessage: '', lastDate: '', unread: 0, lastSender: ''
        };
      }
      if (!map[email].lastDate || msgDate > map[email].lastDate) {
        map[email].lastDate = msgDate;
        map[email].lastMessage = String(row[5] || (row[6] ? '[Image]' : ''));
        map[email].lastSender = String(row[4] || '');
        if (row[3]) map[email].name = String(row[3]);
      }
      if (String(row[4]) === 'customer' && String(row[readAdminIdx]) !== 'Yes') {
        map[email].unread++;
      }
    }
    return Object.values(map).sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));
  } catch (e) {
    Logger.log('getAllConversations error: ' + e.message);
    return [];
  }
}

// ============================================================
// 📊 ADVANCED SALES SUMMARY (Today, Week, Month, Year, Specific Month)
// ============================================================
function getAdvancedSalesSummary(range) {
  try {
    const orders = getOrdersData();
    let totalOrders = 0;
    let grossRevenue = 0;
    let promoDiscountTotal = 0;
    let pointsDiscountTotal = 0;
    let netRevenue = 0;
    let totalCost = 0;
    const statusCounts = { Pending: 0, 'Awaiting Payment': 0, 'Awaiting Verification': 0, Paid: 0, Shipped: 0, Cancelled: 0 };

    const now = new Date();
    let startDate = new Date(0); // Epoch (All Time)
    let endDate = new Date(8640000000000000); // Max Date

    // ✅ Calculate Date Range based on Filter
    if (range === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      startDate = new Date(now.getFullYear(), now.getMonth(), diff);
    } else if (range === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else if (range && range.length === 7 && range.includes('-')) {
      // Specific Month (YYYY-MM)
      const parts = range.split('-');
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1;
      startDate = new Date(y, m, 1);
      endDate = new Date(y, m + 1, 0, 23, 59, 59); // Last day of month
    }

    orders.forEach(o => {
      const status = getStatusValue(o);
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      // Only calculate sales for Paid or Shipped orders
      if (status !== 'Paid' && status !== 'Shipped') return;

      // Filter by Date Range
      const dateStr = o['Date'] ? String(o['Date']) : '';
      if (!dateStr) return;
      const orderDate = new Date(dateStr);
      
      if (orderDate < startDate || orderDate > endDate) return;

      totalOrders++;
      const totalPaid = parseFloat(o['Total (RM)']) || 0;
      const cost = parseFloat(o['Total Cost (RM)']) || 0;
      const pointsDisc = parseFloat(o['Points Discount (RM)']) || 0;

      // Extract Promo Discount from the 'Notes' column
      let promoDisc = 0;
      const notes = o['Notes'] || '';
      const promoMatch = notes.match(/discount RM ([\d.]+)/);
      if (promoMatch) {
        promoDisc = parseFloat(promoMatch[1]) || 0;
      }

      // Gross Revenue is the amount BEFORE any discounts were applied
      grossRevenue += (totalPaid + pointsDisc + promoDisc);
      promoDiscountTotal += promoDisc;
      pointsDiscountTotal += pointsDisc;
      netRevenue += totalPaid;
      totalCost += cost;
    });

    const netProfit = netRevenue - totalCost;

    // Get Low Stock
    const lowStock = getLowStockProducts();
    
    // Get Top Selling for this date range
    let topSelling = [];
    const productMap = {};
    orders.forEach(o => {
        const status = getStatusValue(o);
        if (status !== 'Paid' && status !== 'Shipped') return;
        
        const dateStr = o['Date'] ? String(o['Date']) : '';
        if (!dateStr) return;
        const orderDate = new Date(dateStr);
        if (orderDate < startDate || orderDate > endDate) return;

        const itemsStr = o['Items'] || '';
        const parts = itemsStr.split(',').map(s => s.trim());
        parts.forEach(part => {
          const match = part.match(/^(.*?)\s*×\s*(\d+)$/);
          if (match) {
            const title = match[1].trim();
            const qty = parseInt(match[2]) || 1;
            if (!productMap[title]) productMap[title] = { title, qty: 0 };
            productMap[title].qty += qty;
          }
        });
    });
    topSelling = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

    return {
      totalOrders,
      grossRevenue,
      promoDiscount: promoDiscountTotal,
      pointsDiscount: pointsDiscountTotal,
      netRevenue,
      totalCost,
      netProfit,
      statusCounts,
      lowStock,
      topSelling
    };
  } catch (e) {
    throw new Error('Error getting advanced sales summary: ' + e.message);
  }
}

// ============================================================
// 🧑‍💼 SALES TEAM & COMMISSION FUNCTIONS
// ============================================================

function getCostSettings() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(COST_SETTINGS_SHEET_NAME);
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < data.length; i++) {
    settings[data[i][0]] = data[i][1];
  }
  return settings;
}

function updateCostSettings(settings) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(COST_SETTINGS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const key = data[i][0];
    if (settings[key] !== undefined) {
      sheet.getRange(i + 1, 2).setValue(settings[key]);
    }
  }
  return { success: true, message: 'Cost settings updated.' };
}

function getSalesTeam() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(SALES_TEAM_SHEET_NAME);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const team = [];
  for (let i = 1; i < data.length; i++) {
    team.push({
      email: data[i][0],
      name: data[i][1],
      code: data[i][2],
      rate: parseFloat(data[i][3]) || 20,
      status: data[i][4],
      dateAdded: data[i][5]
    });
  }
  return team;
}

function addSalesperson(email, name, code, rate) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(SALES_TEAM_SHEET_NAME);
  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  sheet.appendRow([email, name, code, rate, 'Active', dateStr]);

  // Send welcome email to the agent
  try {
    const siteUrl = 'https://nex4upstoremy.github.io/Nex4UpStore/';
    const agentLink = siteUrl + '?agent=' + encodeURIComponent(code);
    const body =
      'Hi ' + name + ',\n\n' +
      'You have been added as a sales agent for Nex4UpStore!\n\n' +
      'Your Agent Code: ' + code + '\n' +
      'Your Commission Rate: ' + rate + '%\n\n' +
      'HOW TO ACCESS YOUR PARTNER DASHBOARD:\n' +
      '1) Open ' + siteUrl + '\n' +
      '2) Click the profile icon (top right) → Register\n' +
      '3) IMPORTANT: Use this exact email → ' + email + '\n' +
      '4) Set your password and finish registration\n' +
      '5) Log in with that email + password\n' +
      '6) Click profile icon → Partner Dashboard\n\n' +
      'YOUR AGENT LINK (share this with customers):\n' +
      agentLink + '\n\n' +
      'When customers click your link and place an order, you earn ' + rate + '% commission.\n\n' +
      'Welcome aboard!\nNex4UpStore Team';
    MailApp.sendEmail(email, '🎉 You are now a Nex4UpStore Agent', body);
  } catch (e) {
    Logger.log('⚠️ Agent welcome email failed: ' + e.message);
  }

  return { success: true, message: 'Salesperson added + welcome email sent.' };
}

function getSalespersonDashboard(email) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const commSheet = ss.getSheetByName(COMMISSIONS_SHEET_NAME);
  if (!commSheet) return { totalSales: 0, totalCommission: 0, history: [] };
  
  const data = commSheet.getDataRange().getValues();
  let totalSales = 0;
  let totalCommission = 0;
  const history = [];
  
  const targetEmail = String(email || '').toLowerCase().trim();
  
  for (let i = 1; i < data.length; i++) {
    const rowEmail = String(data[i][2] || '').toLowerCase().trim();
    if (rowEmail === targetEmail) {
const status = String(data[i][9] || '').trim();
const rev = parseFloat(data[i][4]) || 0;
const comm = parseFloat(data[i][8]) || 0;

// Only count APPROVED commissions toward the running totals.
// Pending (unpaid/unverified) and Reversed (cancelled) are excluded
// so the agent sees only real, money-in-the-bank sales.
if (status === 'Approved') {
  totalSales += rev;
  totalCommission += comm;
}
      
      history.push({
        orderId: data[i][1],
        date: data[i][3],
        netRevenue: rev,
        netProfit: parseFloat(data[i][6]) || 0,
        rate: parseFloat(data[i][7]) || 0,
        commission: comm,
        status: data[i][9]
      });
    }
  }
  return { totalSales, totalCommission, history: history.reverse() };
}

// ============================================================
// 🔄 UPDATE ORDER STATUS (With Commission Reversal)
// ============================================================
function updateOrderStatus(orderId, newStatus) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(ORDERS_SHEET_NAME);
    const gameSheet = ss.getSheetByName(GAME_SHEET_NAME);
    if (!sheet || !gameSheet) { setupSheet(); return getOrdersData(); }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    let orderData = null;
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === orderId) {
        rowIndex = i + 1;
        const order = {};
        headers.forEach((h, idx) => { order[h] = data[i][idx]; });
        orderData = order;
        break;
      }
    }
    if (rowIndex === -1 || !orderData) return getOrdersData();

    const oldStatus = getStatusValue(orderData);
    const customerEmail = orderData['Email'];
    const orderTotal = parseFloat(orderData['Total (RM)']) || 0;
    const pointsUsedInOrder = parseInt(orderData['Points Used']) || 0;
    const pointsEarnedInOrder = parseInt(orderData['Points Earned']) || 0;

    // ✅ CASE 1: Cancelled — refund points used, deduct points earned
    if (newStatus === 'Cancelled' && oldStatus !== 'Cancelled') {
      const itemsStr = orderData['Items'] || '';
      const parts = itemsStr.split(',').map(s => s.trim());
      const games = getGamesData();
      parts.forEach(part => {
        const match = part.match(/^(.*?)\s*×\s*(\d+)$/);
        if (match) {
          const title = match[1].trim();
          const qty = parseInt(match[2]) || 1;
          const game = games.find(g => g.title === title);
          if (game) {
            const gameRow = gameSheet.getDataRange().getValues().findIndex((row, idx) => idx > 0 && row[0] === game.id) + 1;
            if (gameRow > 0) {
              const currentQty = parseInt(gameSheet.getRange(gameRow, 7).getValue()) || 0;
              gameSheet.getRange(gameRow, 7).setValue(currentQty + qty);
            }
          }
        }
      });
      if (pointsUsedInOrder > 0 && customerEmail) {
        updateCustomerPoints(customerEmail, pointsUsedInOrder);
        addPointsLedger(customerEmail, orderId, pointsUsedInOrder, 'Refund — Order Cancelled');
      }
      if (pointsEarnedInOrder > 0 && customerEmail) {
        updateCustomerPoints(customerEmail, -pointsEarnedInOrder);
        addPointsLedger(customerEmail, orderId, -pointsEarnedInOrder, 'Reversal — Order Cancelled');
        const peIdx = headers.indexOf('Points Earned');
        if (peIdx !== -1) sheet.getRange(rowIndex, peIdx + 1).setValue(0);
      }

      // ✅ Robux: release reserved stock and re-allocate FIFO
      try { releaseRobuxReservation(orderId, 'Order cancelled or payment rejected'); }
      catch (rbErr) { Logger.log('⚠️ Robux release failed: ' + rbErr.message); }
    }

    // ✅ CASE 2: Paid — award points based on final total paid (1 point per RM1)
    if (newStatus === 'Paid' && oldStatus !== 'Paid' && customerEmail && pointsEarnedInOrder === 0) {
      const pointsEarned = Math.floor(orderTotal);
      if (pointsEarned > 0) {
        updateCustomerPoints(customerEmail, pointsEarned);
        addPointsLedger(customerEmail, orderId, pointsEarned, 'Earned from Order');
        const peIdx = headers.indexOf('Points Earned');
        if (peIdx !== -1) sheet.getRange(rowIndex, peIdx + 1).setValue(pointsEarned);
      }
    }

    // ✅ Robux: a now-paid backorder may receive available stock
    if (newStatus === 'Paid' && oldStatus !== 'Paid') {
      try { allocateRobuxBackordersNow(); }
      catch (rbErr) { Logger.log('⚠️ Robux allocation failed: ' + rbErr.message); }
    }

    // ✅ Route 'Shipped' to the Fulfilment Status column, NOT Payment Status.
    // 'Shipped' is a fulfilment state; Payment Status must remain 'Paid'.
    const payColIdx    = headers.indexOf('Payment Status');
    const fulfilColIdx = headers.indexOf('Fulfilment Status');

    if (newStatus === 'Shipped') {
      const currentPay = payColIdx !== -1
        ? String(sheet.getRange(rowIndex, payColIdx + 1).getValue() || '').trim()
        : '';
      if (currentPay !== 'Paid' && currentPay !== 'Shipped') {   // tolerate legacy
        throw new Error('Cannot mark as Shipped — payment status is "' + currentPay + '". Approve payment first.');
      }
      if (fulfilColIdx === -1) {
        throw new Error('Fulfilment Status column missing. Run migrateOrdersAndReviewsForRewards() first.');
      }

      // ✅ Robux: deduct exactly once; refuse if not fully allocated
      const rbDeduct = deductRobuxOnShipped(orderId);
      if (!rbDeduct.success) {
        throw new Error(rbDeduct.message || 'Unable to deduct Robux stock.');
      }

      sheet.getRange(rowIndex, fulfilColIdx + 1).setValue('Shipped');
    } else {
      if (payColIdx === -1) {
        throw new Error('Payment Status column missing from Orders sheet.');
      }
      sheet.getRange(rowIndex, payColIdx + 1).setValue(newStatus);
    }
    
    try { confirmCouponUsage(orderId, newStatus); } catch (cErr) { Logger.log('⚠️ Coupon: ' + cErr.message); }

    // ✅ NEW: Reverse Commission if Cancelled/Refunded, or Approve if Paid/Shipped
    const commSheet = ss.getSheetByName(COMMISSIONS_SHEET_NAME);
    if (commSheet) {
      const commData = commSheet.getDataRange().getValues();
      for (let i = 1; i < commData.length; i++) {
        if (commData[i][1] === orderId) {
          if (newStatus === 'Cancelled' || newStatus === 'Refunded') {
            if (commData[i][9] !== 'Reversed') {
              commSheet.getRange(i + 1, 10).setValue('Reversed');
              Logger.log('↩️ Commission reversed for order ' + orderId);
            }
} else if (newStatus === 'Paid' || newStatus === 'Shipped') {
  // FROM:
  // if (commData[i][9] === 'Pending') {
  //   commSheet.getRange(i + 1, 10).setValue('Approved');
  // }

  // TO:
  if (commData[i][9] !== 'Approved') {
    commSheet.getRange(i + 1, 10).setValue('Approved');
  }
}
        }
      }
    }

    if (newStatus === 'Paid' || newStatus === 'Shipped') {
      try { checkReferralRewards(orderData['Email']); } catch (refError) { Logger.log('⚠️ Referral: ' + refError.message); }
      try { sendStatusUpdateEmail(orderData, newStatus); } catch (emailError) { Logger.log('⚠️ Email: ' + emailError.message); }
    }
    return getOrdersData();
  } catch (e) {
    throw new Error('Error updating order status: ' + e.message);
  }
}

// ============================================================
// 🔄 MIGRATION: Add My Orders & Rewards columns safely
// ============================================================
function migrateOrdersAndReviewsForRewards() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // --- 1. Extend Orders sheet ---
  const ordersSheet = ss.getSheetByName(ORDERS_SHEET_NAME);
  if (ordersSheet) {
    const requiredHeaders = [
      'Fulfilment Status',      // 'Awaiting Shipment', 'Shipped', 'Delivered'
      'Delivery Confirmed At',  // Timestamp when seller confirms delivery
      'Auto Confirm At',        // Timestamp = Delivery Confirmed At + 24h
      'Customer Received At',   // Timestamp when customer clicks "Order Received"
      'Review Status',          // 'Pending', 'Completed'
      'Review Submitted At',    // Timestamp of review
      'Tracking Number',        // Courier tracking number
      'Tracking URL'            // Courier tracking link
    ];
    const currentHeaders = ordersSheet.getRange(1, 1, 1, ordersSheet.getLastColumn()).getValues()[0];
    let colIndex = currentHeaders.length + 1;
    requiredHeaders.forEach(header => {
      if (currentHeaders.indexOf(header) === -1) {
        ordersSheet.getRange(1, colIndex).setValue(header)
          .setFontWeight('bold').setBackground('#1e2a3a').setFontColor('#f7d875');
        colIndex++;
      }
    });
  }

  // --- 2. Extend Reviews sheet ---
  const reviewsSheet = ss.getSheetByName(REVIEWS_SHEET_NAME);
  if (reviewsSheet) {
    const requiredHeaders = [
      'Order ID',           // Link review to specific order
      'Review Reward Paid'  // 'Yes' / 'No' to prevent duplicates
    ];
    const currentHeaders = reviewsSheet.getRange(1, 1, 1, reviewsSheet.getLastColumn()).getValues()[0];
    let colIndex = currentHeaders.length + 1;
    requiredHeaders.forEach(header => {
      if (currentHeaders.indexOf(header) === -1) {
        reviewsSheet.getRange(1, colIndex).setValue(header)
          .setFontWeight('bold').setBackground('#1e2a3a').setFontColor('#f7d875');
        colIndex++;
      }
    });
  }

  // --- 3. Ensure PointsLedger has a unique reference column ---
  const ledgerSheet = ss.getSheetByName('PointsLedger');
  if (ledgerSheet) {
    const ledgerHeaders = ledgerSheet.getRange(1, 1, 1, ledgerSheet.getLastColumn()).getValues()[0];
    if (ledgerHeaders.indexOf('Reference ID') === -1) {
      ledgerSheet.getRange(1, ledgerHeaders.length + 1).setValue('Reference ID')
        .setFontWeight('bold').setBackground('#1e2a3a').setFontColor('#f7d875');
    }
  }

  Logger.log('✅ Migration for My Orders & Rewards complete.');
}

// ============================================================
// 🆕 MY ORDERS & REWARDS: BACKEND FUNCTIONS
// ============================================================

/**
 * Returns orders for a customer, enriched for the My Orders UI.
 * Validates ownership by matching email on the backend.
 */
function getMyOrdersData(customerEmail) {
  if (!customerEmail || typeof customerEmail !== 'string') {
    return { success: false, message: 'Authentication required.' };
  }
  const email = customerEmail.toLowerCase().trim();
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const allGames = getGamesData();
  const gameIdByTitle = {};
  allGames.forEach(g => { gameIdByTitle[String(g.title)] = String(g.id); });

  // Build per-order review lookup: "orderId|gameId" → true
  const reviewsSheet = ss.getSheetByName(REVIEWS_SHEET_NAME);
  const reviewed = new Set();
  if (reviewsSheet) {
    const rv = reviewsSheet.getDataRange().getValues();
    if (rv.length > 1) {
      const rh = rv[0].map(h => String(h).trim());
      const rEmailIdx = rh.indexOf('Customer Email');
      const rGameIdx  = rh.indexOf('Game ID');
      const rOrderIdx = rh.indexOf('Order ID');
      if (rEmailIdx !== -1 && rGameIdx !== -1 && rOrderIdx !== -1) {
        for (let i = 1; i < rv.length; i++) {
          if (String(rv[i][rEmailIdx] || '').toLowerCase().trim() !== email) continue;
          const oid = String(rv[i][rOrderIdx] || '').trim();
          const gid = String(rv[i][rGameIdx] || '').trim();
          if (oid && gid) reviewed.add(oid + '|' + gid);
        }
      }
    }
  }

  // Helper: strip "(variant)" suffix and resolve to a game id
  function resolveGameId(rawName) {
    let name = String(rawName || '').trim();
    if (gameIdByTitle[name]) return gameIdByTitle[name];
    const stripped = name.replace(/\s*\([^)]*\)\s*$/, '').trim();
    return gameIdByTitle[stripped] || '';
  }

  // ✅ NEW: Fetch Gift Codes
  const codesSheet = ss.getSheetByName('DigitalCodes');
  let allGiftCodes = [];
  if (codesSheet) {
    const cData = codesSheet.getDataRange().getValues();
    const cHeaders = cData[0].map(h => String(h).trim());
    const cOidIdx = cHeaders.indexOf('Order ID');
    const cCodeIdx = cHeaders.indexOf('Redemption Code');
    const cStatusIdx = cHeaders.indexOf('Status');
    for (let i = 1; i < cData.length; i++) {
      if (String(cData[i][cStatusIdx]) === 'Sent') {
        allGiftCodes.push({
          orderId: String(cData[i][cOidIdx]),
          code: String(cData[i][cCodeIdx])
        });
      }
    }
  }

  const allOrders = getOrdersData();
  const myOrders = allOrders.filter(o =>
    String(o['Email'] || '').toLowerCase().trim() === email
  );

  const enriched = myOrders.map(order => {
    const orderId    = String(order['Order ID'] || '').trim();
    const payStatus  = String(order['Payment Status'] || 'Pending').trim();
    const fulfil     = String(order['Fulfilment Status'] || '').trim();
    const itemsStr   = String(order['Items'] || '');

    // Unique product IDs in this order
    const productIds = new Set();
    itemsStr.split(',').map(s => s.trim()).filter(Boolean).forEach(part => {
      const m = part.match(/^(.*?)\s*×\s*(\d+)$/);
      if (!m) return;
      const gid = resolveGameId(m[1]);
      if (gid) productIds.add(gid);
    });

    const reviewedIds = [];
    productIds.forEach(gid => {
      if (reviewed.has(orderId + '|' + gid)) reviewedIds.push(gid);
    });
    const allProductsReviewed = productIds.size > 0 && reviewedIds.length === productIds.size;

        // ✅ FIX: tolerate legacy data where Payment Status === 'Shipped'
    // (pre-fix bug wrote 'Shipped' into the Payment Status column).
    const legacyShipped = (payStatus === 'Shipped');
    const treatAsPaid   = (payStatus === 'Paid' || legacyShipped);
    const customerReceivedAt = String(order['Customer Received At'] || '').trim();
    const isDelivered   = (fulfil === 'Delivered') || !!customerReceivedAt;
    const isShipped     = (fulfil === 'Shipped') || legacyShipped;

    let tab = 'All';
    let customerStatus = payStatus;

    if (payStatus === 'Awaiting Payment') {
      tab = 'To Pay';
      customerStatus = 'Awaiting Payment';
    } else if (payStatus === 'Awaiting Verification') {
      tab = 'To Ship';
      customerStatus = 'Payment Verifying';
    } else if (treatAsPaid) {
      if (isDelivered) {
        tab = allProductsReviewed ? 'All' : 'To Review';
        customerStatus = 'Delivered';
      } else if (isShipped) {
        tab = 'To Receive';
        customerStatus = 'Shipped';
      } else {
        tab = 'To Ship';
        customerStatus = 'Paid — Awaiting Shipment';
      }
    } else if (payStatus === 'Cancelled') {
      tab = 'All';
      customerStatus = 'Cancelled';
    } else {
      tab = 'All';
    }

    return {
      ...order,
      _tab: tab,
      _customerStatus: customerStatus,
      _reviewedProductIds: reviewedIds,
      _allProductsReviewed: allProductsReviewed,
      _productIds: Array.from(productIds),
      _giftCodes: allGiftCodes.filter(c => c.orderId === String(order['Order ID'])) // ✅ NEW
    };
  }); // 👈 Added this closing bracket for the .map()

  return { success: true, orders: enriched }; // 👈 Added this return statement
} // 👈 Added this closing bracket for getMyOrdersData

/**
 * Customer cancels an unpaid order. Delegates to updateOrderStatus which already has
 * stock restoration, coupon reversal, and point refund logic.
 */
function cancelCustomerOrder(orderId, customerEmail) {
  const allOrders = getOrdersData();
  const order = allOrders.find(o => String(o['Order ID']) === String(orderId));
  if (!order) return { success: false, message: 'Order not found.' };
  if (String(order['Email']).toLowerCase().trim() !== customerEmail.toLowerCase().trim()) {
    return { success: false, message: 'You do not own this order.' };
  }
  const paymentStatus = String(order['Payment Status']).trim();
  if (paymentStatus !== 'Awaiting Payment') {
    return { success: false, message: 'Only unpaid orders can be cancelled.' };
  }
  // updateOrderStatus already handles stock, points, and coupon reversal.
  updateOrderStatus(orderId, 'Cancelled');
  return { success: true, message: 'Order cancelled successfully.' };
}

// ============================================================
// 🆕 Fulfilment status update (seller side)
// Allowed: 'Awaiting Shipment' | 'Shipped'
// 'Delivered' is reserved for customer confirmation only.
// ============================================================
function updateFulfilmentStatus(orderId, newStatus) {
  const allowed = ['Awaiting Shipment', 'Shipped'];
  if (!orderId || allowed.indexOf(String(newStatus).trim()) === -1) {
    return { success: false, message: 'Invalid fulfilment status. Allowed: ' + allowed.join(', ') };
  }
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(ORDERS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const oidIdx    = headers.indexOf('Order ID');
  const payIdx    = headers.indexOf('Payment Status');
  const fulfilIdx = headers.indexOf('Fulfilment Status');
  if (fulfilIdx === -1) {
    return { success: false, message: 'Fulfilment Status column missing. Run migrateOrdersAndReviewsForRewards() first.' };
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][oidIdx]) !== String(orderId)) continue;

    const payStatus = String(data[i][payIdx] || '').trim();
    const legacyShipped = (payStatus === 'Shipped');   // tolerate pre-fix data
    if (payStatus !== 'Paid' && !legacyShipped) {
      return { success: false, message: 'Cannot ship — payment status is "' + payStatus + '". Approve payment first.' };
    }

    const row = i + 1;

    if (String(newStatus).trim() === 'Shipped') {
      const rbDeduct = deductRobuxOnShipped(orderId);
      if (!rbDeduct.success) {
        return { success: false, message: rbDeduct.message || 'Unable to deduct Robux stock.' };
      }
    }

    sheet.getRange(row, fulfilIdx + 1).setValue(newStatus);

    // Self-heal legacy corrupted data on the way past
    if (legacyShipped && payIdx !== -1) {
      sheet.getRange(row, payIdx + 1).setValue('Paid');
    }

    return { success: true, message: 'Fulfilment status set to ' + newStatus + '.' };
  }
  return { success: false, message: 'Order not found: ' + orderId };
}
// ============================================================
// 🆕 PHASE 1: Fetch per-product review status for one order
// (used by frontend to hide already-reviewed items)
// ============================================================
function getOrderReviewStatus(orderId, customerEmail) {
  if (!orderId || !customerEmail) {
    return { success: false, message: 'Missing arguments.', reviewedGameIds: [] };
  }
  const email = customerEmail.toLowerCase().trim();
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const reviewsSheet = ss.getSheetByName(REVIEWS_SHEET_NAME);
  if (!reviewsSheet) return { success: true, reviewedGameIds: [] };

  const rv = reviewsSheet.getDataRange().getValues();
  const rh = rv[0].map(h => String(h).trim());
  const rEmailIdx = rh.indexOf('Customer Email');
  const rGameIdx  = rh.indexOf('Game ID');
  const rOrderIdx = rh.indexOf('Order ID');
  if (rEmailIdx === -1 || rGameIdx === -1 || rOrderIdx === -1) {
    return { success: true, reviewedGameIds: [] };
  }

  const ids = [];
  for (let i = 1; i < rv.length; i++) {
    if (String(rv[i][rEmailIdx] || '').toLowerCase().trim() !== email) continue;
    if (String(rv[i][rOrderIdx]) === String(orderId)) ids.push(String(rv[i][rGameIdx]));
  }
  return { success: true, reviewedGameIds: ids };
}

// ============================================================
// 🆕 PHASE 1: Remove the auto-confirm trigger (spec: no 24h countdown)
// Run this ONCE from the Apps Script editor after deploying.
// ============================================================
function removeAutoConfirmTrigger() {
  let removed = 0;
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'autoConfirmDeliveredOrders') {
      ScriptApp.deleteTrigger(t);
      removed++;
    }
  });
  Logger.log('✅ Removed ' + removed + ' auto-confirm trigger(s).');
  return { success: true, removed: removed };
}

/**
 * Customer clicks "Order Received" → marks as Delivered/Received.
 * Starts the 24-hour auto-confirm window.
 */
function markOrderReceived(orderId, customerEmail) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(ORDERS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const oidIdx     = headers.indexOf('Order ID');
  const emailIdx   = headers.indexOf('Email');
  const payIdx     = headers.indexOf('Payment Status');
  const fulfilIdx  = headers.indexOf('Fulfilment Status');
  const receivedIdx = headers.indexOf('Customer Received At');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][oidIdx]) !== String(orderId)) continue;

    if (String(data[i][emailIdx] || '').toLowerCase().trim() !== customerEmail.toLowerCase().trim()) {
      return { success: false, message: 'You do not own this order.' };
    }
    // ✅ Tolerate legacy data where Payment Status === 'Shipped'
    const payStatus = String(data[i][payIdx] || '').trim();
    const legacyShipped = (payStatus === 'Shipped');
    if (payStatus !== 'Paid' && !legacyShipped) {
      return { success: false, message: 'Order payment has not been approved yet.' };
    }

    const fulfil = String(data[i][fulfilIdx] || '').trim();
    const isShipped = (fulfil === 'Shipped') || legacyShipped;
    if (!isShipped) {
      return { success: false, message: 'Order has not been shipped yet.' };
    }

    if (String(data[i][receivedIdx] || '').trim()) {
      return { success: false, message: 'Order already confirmed as received.' };
    }

    const row = i + 1;
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    // Mark as Delivered + stamp customer confirmation time
    if (fulfilIdx !== -1)   sheet.getRange(row, fulfilIdx + 1).setValue('Delivered');
    if (receivedIdx !== -1) sheet.getRange(row, receivedIdx + 1).setValue(now);

    // ✅ Self-heal legacy corrupted state (this is the block you were looking for)
    if (legacyShipped && payIdx !== -1) {
      sheet.getRange(row, payIdx + 1).setValue('Paid');
    }

    return { success: true, message: 'Order marked as received! You can now review your products.' };
  }
  return { success: false, message: 'Order not found.' };
}

/**
 * Seller marks delivery as confirmed (from admin dashboard).
 * Starts the 24-hour auto-confirm window.
 */
function confirmDeliveryBySeller(orderId, trackingNumber, trackingUrl) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(ORDERS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const orderIdIdx = headers.indexOf('Order ID');
  const fulfilmentIdx = headers.indexOf('Fulfilment Status');
  const deliveryConfirmedIdx = headers.indexOf('Delivery Confirmed At');
  const autoConfirmIdx = headers.indexOf('Auto Confirm At');
  const trackingNumIdx = headers.indexOf('Tracking Number');
  const trackingUrlIdx = headers.indexOf('Tracking URL');
  const reviewStatusIdx = headers.indexOf('Review Status');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][orderIdIdx]) !== String(orderId)) continue;
    const row = i + 1;
    const now = new Date();
    const nowStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    const autoConfirm = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const autoConfirmStr = Utilities.formatDate(autoConfirm, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    if (fulfilmentIdx !== -1) sheet.getRange(row, fulfilmentIdx + 1).setValue('Shipped'); // Keep as Shipped until auto-confirm or customer action
    if (deliveryConfirmedIdx !== -1) sheet.getRange(row, deliveryConfirmedIdx + 1).setValue(nowStr);
    if (autoConfirmIdx !== -1) sheet.getRange(row, autoConfirmIdx + 1).setValue(autoConfirmStr);
    if (trackingNumIdx !== -1 && trackingNumber) sheet.getRange(row, trackingNumIdx + 1).setValue(trackingNumber);
    if (trackingUrlIdx !== -1 && trackingUrl) sheet.getRange(row, trackingUrlIdx + 1).setValue(trackingUrl);
    if (reviewStatusIdx !== -1) sheet.getRange(row, reviewStatusIdx + 1).setValue('Pending');
    return { success: true, message: 'Delivery confirmed. Customer has 24h to review.' };
  }
  return { success: false, message: 'Order not found.' };
}

/**
 * 🆕 REVIEW SUBMISSION WITH LOCK (CRITICAL)
 * - Validates purchase & delivery
 * - Prevents duplicate rewards
 * - Credits exactly 5 points
 * - Uses LockService for atomicity
 */
function addReviewWithReward(gameId, customerEmail, customerName, rating, reviewText, orderId) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(30000); }
  catch (e) { return { success: false, message: 'System busy. Please try again.' }; }

  try {
    rating = parseInt(rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      lock.releaseLock();
      return { success: false, message: 'Rating must be 1–5.' };
    }
    if (!customerEmail || !orderId || !gameId) {
      lock.releaseLock();
      return { success: false, message: 'Missing required information.' };
    }
    const email = customerEmail.toLowerCase().trim();

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const reviewsSheet = ss.getSheetByName(REVIEWS_SHEET_NAME);
    const ordersSheet  = ss.getSheetByName(ORDERS_SHEET_NAME);

    // 1. Verify ownership + delivery
    const od = ordersSheet.getDataRange().getValues();
    const oh = od[0].map(h => String(h).trim());
    const oEmail = oh.indexOf('Email');
    const oOid   = oh.indexOf('Order ID');
    const oFul   = oh.indexOf('Fulfilment Status');
    const oRec   = oh.indexOf('Customer Received At');
    const oItems = oh.indexOf('Items');
    const oRevSt = oh.indexOf('Review Status');
    const oRevAt = oh.indexOf('Review Submitted At');

    let orderRow = -1, order = null;
    for (let i = 1; i < od.length; i++) {
      if (String(od[i][oOid]) === String(orderId) &&
          String(od[i][oEmail] || '').toLowerCase().trim() === email) {
        orderRow = i + 1;
        order = od[i];
        break;
      }
    }
    if (!order) {
      lock.releaseLock();
      return { success: false, message: 'Order not found or does not belong to you.' };
    }
    const isDelivered = String(order[oFul] || '').trim() === 'Delivered' ||
                        !!String(order[oRec] || '').trim();
    if (!isDelivered) {
      lock.releaseLock();
      return { success: false, message: 'Product not yet delivered.' };
    }

    // 2. Verify product belongs to order
    const itemsStr = String(order[oItems] || '');
    const game = getGamesData().find(g => g.id == gameId);
    if (!game) {
      lock.releaseLock();
      return { success: false, message: 'Product not found.' };
    }
    const titleDirect   = itemsStr.includes(game.title);
    const titleStripped = itemsStr.includes(game.title + ' (');
    if (!titleDirect && !titleStripped) {
      lock.releaseLock();
      return { success: false, message: 'Product does not belong to this order.' };
    }

    // 3. Prevent duplicate (orderId + gameId + email)
    const rv = reviewsSheet.getDataRange().getValues();
    const rh = rv[0].map(h => String(h).trim());
    const rEmailIdx = rh.indexOf('Customer Email');
    const rGameIdx  = rh.indexOf('Game ID');
    const rOrderIdx = rh.indexOf('Order ID');

    for (let i = 1; i < rv.length; i++) {
      if (String(rv[i][rEmailIdx] || '').toLowerCase().trim() === email &&
          String(rv[i][rGameIdx]) === String(gameId) &&
          String(rv[i][rOrderIdx]) === String(orderId)) {
        lock.releaseLock();
        return { success: false, message: 'You have already reviewed this product for this order.' };
      }
    }

    // 4. Save review
    const now = new Date();
    const nowStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    const reviewId = 'REV-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    reviewsSheet.appendRow([
      reviewId, gameId, game.title, customerEmail, customerName || 'Anonymous',
      rating, reviewText || '', 'Yes', 'Approved', nowStr,
      orderId, 'Yes'
    ]);

    // 5. Credit 5 points + ledger (idempotent thanks to the duplicate check above)
    updateCustomerPoints(customerEmail, 5);
    addPointsLedger(customerEmail, orderId, 5,
      'Product Review Reward (+5 Points)', 'REVIEW-' + reviewId);

    // 6. Determine whether ALL products in this order are now reviewed
    const refreshed = reviewsSheet.getDataRange().getValues();
    const reviewedIds = new Set();
    for (let i = 1; i < refreshed.length; i++) {
      if (String(refreshed[i][rEmailIdx] || '').toLowerCase().trim() === email &&
          String(refreshed[i][rOrderIdx]) === String(orderId)) {
        reviewedIds.add(String(refreshed[i][rGameIdx]));
      }
    }
    const allGames = getGamesData();
    const titleToId = {};
    allGames.forEach(g => { titleToId[String(g.title)] = String(g.id); });
    const orderProductIds = new Set();
    itemsStr.split(',').map(s => s.trim()).filter(Boolean).forEach(part => {
      const m = part.match(/^(.*?)\s*×\s*(\d+)$/);
      if (!m) return;
      let nm = m[1].trim();
      let gid = titleToId[nm];
      if (!gid) gid = titleToId[nm.replace(/\s*\([^)]*\)\s*$/, '').trim()];
      if (gid) orderProductIds.add(gid);
    });
    const allReviewed = orderProductIds.size > 0 &&
      Array.from(orderProductIds).every(id => reviewedIds.has(id));

    if (oRevSt !== -1) ordersSheet.getRange(orderRow, oRevSt + 1)
      .setValue(allReviewed ? 'Completed' : 'Partial');
    if (oRevAt !== -1) ordersSheet.getRange(orderRow, oRevAt + 1).setValue(nowStr);

    lock.releaseLock();
    return {
      success: true,
      message: 'Thank you for your review! You have received 5 Wallet Points.',
      allReviewed: allReviewed
    };

  } catch (e) {
    try { lock.releaseLock(); } catch (_) {}
    Logger.log('addReviewWithReward error: ' + e.message);
    return { success: false, message: 'Error submitting review: ' + e.message };
  }
}

/**
 * Auto-confirms orders after 24h from delivery confirmation.
 * Run this via a time-based trigger (e.g., every hour).
 */
function autoConfirmDeliveredOrders() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(ORDERS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const autoConfirmIdx = headers.indexOf('Auto Confirm At');
  const fulfilmentIdx = headers.indexOf('Fulfilment Status');
  const customerReceivedIdx = headers.indexOf('Customer Received At');
  const reviewStatusIdx = headers.indexOf('Review Status');

  if (autoConfirmIdx === -1) return;
  const now = new Date();
  for (let i = 1; i < data.length; i++) {
    const autoConfirmAt = data[i][autoConfirmIdx];
    if (!autoConfirmAt || !(autoConfirmAt instanceof Date)) continue;
    if (autoConfirmAt <= now && String(data[i][fulfilmentIdx] || '').trim() !== 'Delivered') {
      const row = i + 1;
      sheet.getRange(row, fulfilmentIdx + 1).setValue('Delivered');
      if (customerReceivedIdx !== -1) {
        sheet.getRange(row, customerReceivedIdx + 1).setValue(
          Utilities.formatDate(autoConfirmAt, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
        );
      }
      if (reviewStatusIdx !== -1) sheet.getRange(row, reviewStatusIdx + 1).setValue('Pending');
    }
  }
  Logger.log('✅ Auto-confirm check complete.');
}

// ============================================================
// 🔧 ONE-TIME SETUP: Install the 24h auto-confirm trigger
// ============================================================
function installAutoConfirmTrigger() {
  // Delete any existing auto-confirm triggers first (avoid duplicates)
  const existing = ScriptApp.getProjectTriggers();
  existing.forEach(t => {
    if (t.getHandlerFunction() === 'autoConfirmDeliveredOrders') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Create a new hourly trigger
  ScriptApp.newTrigger('autoConfirmDeliveredOrders')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('✅ Auto-confirm trigger installed — runs every hour.');
}

// ============================================================
// 🐛 DIAGNOSTIC — read-only order inspection (Phase 5)
// ============================================================
function debugMyOrderStatus(orderId) {
  try {
    if (!orderId) return { success: false, message: 'orderId required.' };

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const ordersSheet = ss.getSheetByName(ORDERS_SHEET_NAME);
    if (!ordersSheet) return { success: false, message: 'Orders sheet missing.' };

    const od = ordersSheet.getDataRange().getValues();
    const headers = od[0].map(h => String(h).trim());
    const idx = name => headers.indexOf(name);

    const iOid    = idx('Order ID');
    const iEmail  = idx('Email');
    const iPay    = idx('Payment Status');
    const iFul    = idx('Fulfilment Status');
    const iRecv   = idx('Customer Received At');
    const iItems  = idx('Items');
    const iRevSt  = idx('Review Status');

    let row = null, rowNum = -1;
    for (let i = 1; i < od.length; i++) {
      if (String(od[i][iOid]) === String(orderId)) {
        row = od[i]; rowNum = i + 1; break;
      }
    }
    if (!row) return { success: false, message: 'Order not found: ' + orderId };

    // Build per-product review lookup
    const email = String(row[iEmail] || '').toLowerCase().trim();
    const rv = (ss.getSheetByName(REVIEWS_SHEET_NAME) || { getDataRange: () => ({ getValues: () => [[]] }) })
      .getDataRange().getValues();
    const rh = rv[0].map(h => String(h).trim());
    const rEmailIdx = rh.indexOf('Customer Email');
    const rGameIdx  = rh.indexOf('Game ID');
    const rOrderIdx = rh.indexOf('Order ID');
    const reviewed = new Set();
    for (let r = 1; r < rv.length; r++) {
      if (rEmailIdx === -1 || rGameIdx === -1 || rOrderIdx === -1) break;
      if (String(rv[r][rEmailIdx] || '').toLowerCase().trim() !== email) continue;
      if (String(rv[r][rOrderIdx]) !== String(orderId)) continue;
      reviewed.add(String(rv[r][rGameIdx]));
    }

    // Resolve products from Items column
    const allGames = getGamesData();
    const titleToId = {};
    allGames.forEach(g => { titleToId[String(g.title)] = String(g.id); });
    function resolveId(raw) {
      let n = String(raw || '').trim();
      if (titleToId[n]) return titleToId[n];
      const stripped = n.replace(/\s*\([^)]*\)\s*$/, '').trim();
      return titleToId[stripped] || '';
    }

    const itemsStr = String(row[iItems] || '');
    const purchasedIds = new Set();
    itemsStr.split(',').map(s => s.trim()).filter(Boolean).forEach(part => {
      const m = part.match(/^(.*?)\s*×\s*(\d+)$/);
      if (!m) return;
      const gid = resolveId(m[1]);
      if (gid) purchasedIds.add(gid);
    });

    const purchasedArr = Array.from(purchasedIds);
    const reviewedArr  = purchasedArr.filter(id => reviewed.has(id));
    const allReviewed  = purchasedArr.length > 0 && reviewedArr.length === purchasedArr.length;

    // Compute what getMyOrdersData() would decide
    const pay    = String(row[iPay] || '').trim();
    const fulfil = String(row[iFul] || '').trim();
    const recv   = String(row[iRecv] || '').trim();
    const legacyShipped = pay === 'Shipped';
    const isDelivered   = fulfil === 'Delivered' || !!recv;
    const isShipped     = fulfil === 'Shipped' || legacyShipped;

    let tab;
    if (pay === 'Awaiting Payment')           tab = 'To Pay';
    else if (pay === 'Awaiting Verification') tab = 'To Ship';
    else if (pay === 'Paid' || legacyShipped) {
      if (isDelivered)   tab = allReviewed ? 'All' : 'To Review';
      else if (isShipped) tab = 'To Receive';
      else                tab = 'To Ship';
    }
    else if (pay === 'Cancelled') tab = 'All';
    else tab = 'All';

    return {
      success: true,
      orderId: orderId,
      sheetRow: rowNum,
      customerEmail: row[iEmail] || '',
      rawRow: headers.reduce((o, h, i) => { o[h] = row[i]; return o; }, {}),
      paymentStatus: pay,
      fulfilmentStatus: fulfil,
      customerReceivedAt: recv,
      reviewStatus: iRevSt !== -1 ? String(row[iRevSt] || '') : '',
      purchasedProductIds: purchasedArr,
      reviewedProductIds: reviewedArr,
      purchasedCount: purchasedArr.length,
      reviewedCount: reviewedArr.length,
      allReviewed: allReviewed,
      calculatedCustomerTab: tab,
      explanation:
        'Payment="' + pay + '", Fulfilment="' + fulfil + '", ReceivedAt="' + recv + '" → tab "' + tab +
        '" (purchased=' + purchasedArr.length + ', reviewed=' + reviewedArr.length + ')'
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ============================================================
// 🔧 ONE-TIME REPAIR — fixes orders already corrupted by the bug
// Run once after deploying the fix.
// ============================================================
function migrateShippedPaymentStatus() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(ORDERS_SHEET_NAME);
  if (!sheet) return { success: false, message: 'Orders sheet missing.' };
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const payIdx    = headers.indexOf('Payment Status');
  const fulfilIdx = headers.indexOf('Fulfilment Status');
  if (payIdx === -1 || fulfilIdx === -1) {
    return { success: false, message: 'Payment Status or Fulfilment Status column missing.' };
  }

  let migrated = 0;
  const details = [];
  for (let i = 1; i < data.length; i++) {
    const pay    = String(data[i][payIdx] || '').trim();
    const fulfil = String(data[i][fulfilIdx] || '').trim();
    if (pay === 'Shipped' && fulfil !== 'Shipped' && fulfil !== 'Delivered') {
      sheet.getRange(i + 1, payIdx + 1).setValue('Paid');
      sheet.getRange(i + 1, fulfilIdx + 1).setValue('Shipped');
      migrated++;
      details.push({ row: i + 1, orderId: data[i][0] });
    }
  }
  Logger.log('migrateShippedPaymentStatus: ' + migrated + ' rows fixed → ' + JSON.stringify(details));
  return { success: true, migrated: migrated, details: details };
}

// ============================================================
// 🎁 GIFT CODE / REDEEM CODE FUNCTIONS
// ============================================================
function sendGiftCodeEmail(orderId, productId, code, email, customerName, productTitle) {
  try {
    const subject = `Your Digital Redemption Code Is Ready – Nex4UpStore`;
    const body = `
Dear ${customerName || 'Valued Customer'},

Thank you for your purchase! Your redemption code for **${productTitle}** is ready.

Order ID: ${orderId}
Product: ${productTitle}

YOUR CODE: ${code}

Redemption Instructions:
1. Go to the game's official redemption page.
2. Enter the code exactly as shown above.
3. Enjoy your rewards!

*Note: Please check for region restrictions before redeeming.*

If you have any questions, please contact us at nex4upstore@gmail.com or WhatsApp 016-533 6856.

Thank you for shopping with Nex4UpStore!
`;
    MailApp.sendEmail(email, subject, body);
    return true;
  } catch (e) {
    Logger.log('sendGiftCodeEmail error: ' + e.message);
    return false;
  }
}

function processGiftCodeAssignment(orderId, productId, code, codeIndex) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const codesSheet = ss.getSheetByName('DigitalCodes');
    const ordersSheet = ss.getSheetByName(ORDERS_SHEET_NAME);
    
    // 1. Find order
    const ordersData = ordersSheet.getDataRange().getValues();
    const oHeaders = ordersData[0].map(h => String(h).trim());
    const oidIdx = oHeaders.indexOf('Order ID');
    const emailIdx = oHeaders.indexOf('Email');
    const nameIdx = oHeaders.indexOf('Customer Name');
    const fulfilIdx = oHeaders.indexOf('Fulfilment Status');
    
    let orderRow = -1;
    let orderEmail = '';
    let orderName = '';
    for (let i = 1; i < ordersData.length; i++) {
      if (String(ordersData[i][oidIdx]) === String(orderId)) {
        orderRow = i + 1;
        orderEmail = ordersData[i][emailIdx];
        orderName = ordersData[i][nameIdx];
        break;
      }
    }
    if (orderRow === -1) return { success: false, message: 'Order not found.' };
    
    // 2. Find product title
    const games = getGamesData();
    const game = games.find(g => String(g.id) === String(productId));
    const productTitle = game ? game.title : 'Digital Product';
    
    // 3. Save to DigitalCodes
    const codeId = 'CODE-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    
    // Find the exact row for this specific code index (0 for first, 1 for second, etc.)
    const codesData = codesSheet.getDataRange().getValues();
    const cHeaders = codesData[0].map(h => String(h).trim());
    const cOidIdx = cHeaders.indexOf('Order ID');
    const cPidIdx = cHeaders.indexOf('Product ID');
    
    let matchCount = 0;
    let existingRow = -1;
    
    for (let j = 1; j < codesData.length; j++) {
      if (String(codesData[j][cOidIdx]) === String(orderId) && String(codesData[j][cPidIdx]) === String(productId)) {
        if (matchCount === parseInt(codeIndex, 10)) {
            existingRow = j + 1;
            break;
        }
        matchCount++;
      }
    }
    
    if (existingRow > 0) {
      codesSheet.getRange(existingRow, 6).setValue(code);
      codesSheet.getRange(existingRow, 7).setValue('Assigned');
      codesSheet.getRange(existingRow, 8).setValue(now);
      codesSheet.getRange(existingRow, 9).setValue('');
    } else {
      codesSheet.appendRow([codeId, orderId, productId, productTitle, orderEmail, code, 'Assigned', now, '']);
      existingRow = codesSheet.getLastRow();
    }
    
    // 4. Send Email
    const emailSent = sendGiftCodeEmail(orderId, productId, code, orderEmail, orderName, productTitle);
    
    if (emailSent) {
      codesSheet.getRange(existingRow, 7).setValue('Sent');
      codesSheet.getRange(existingRow, 9).setValue(now);
      
      // 5. Update Order Fulfilment Status to Shipped
      if (fulfilIdx !== -1) {
        ordersSheet.getRange(orderRow, fulfilIdx + 1).setValue('Shipped');
      }
      
      return { success: true, message: 'Code assigned and email sent successfully.' };
    } else {
      return { success: false, message: 'Code saved, but email failed to send.' };
    }
  } catch (e) {
    Logger.log('processGiftCodeAssignment error: ' + e.message);
    return { success: false, message: e.message };
  }
}
function getGiftCodesForOrder(orderId) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const codesSheet = ss.getSheetByName('DigitalCodes');
    if (!codesSheet) return [];
    
    const data = codesSheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const oidIdx = headers.indexOf('Order ID');
    
    const codes = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][oidIdx]) === String(orderId)) {
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = data[i][idx]; });
        codes.push(obj);
      }
    }
    return codes;
  } catch (e) {
    return [];
  }
}

function testAllAccess() {
  // 1. Test Spreadsheet access
  const ss = SpreadsheetApp.openById(SHEET_ID);
  Logger.log('✅ Spreadsheet accessed: ' + ss.getName());
  
  // 2. Test Drive access
  const folder = DriveApp.getFolderById(GAME_IMAGES_FOLDER_ID);
  Logger.log('✅ Drive folder accessed: ' + folder.getName());
  
  // 3. Test Mail access
  const quota = MailApp.getRemainingDailyQuota();
  Logger.log('✅ Mail quota remaining: ' + quota);
  
  Logger.log('🎉 SEMUA KEBENARAN TELAH DIBERIKAN!');
}

function diagnoseAllRobuxOrders() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(ORDERS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());

  const idx = name => headers.indexOf(name);
  const iOid  = idx('Order ID');
  const iPay  = idx('Payment Status');
  const iFul  = idx('Fulfilment Status');
  const iReq  = idx('Robux Required');
  const iRes  = idx('Robux Reserved');
  const iBack = idx('Robux Backorder');
  const iDed  = idx('Robux Deducted');

  Logger.log('=== COLUMN CHECK ===');
  Logger.log('Order ID: ' + iOid);
  Logger.log('Payment Status: ' + iPay);
  Logger.log('Fulfilment Status: ' + iFul);
  Logger.log('Robux Required: ' + iReq);
  Logger.log('Robux Reserved: ' + iRes);
  Logger.log('Robux Backorder: ' + iBack);
  Logger.log('Robux Deducted: ' + iDed);

  if (iReq === -1) { Logger.log('❌ "Robux Required" header is MISSING'); return; }
  if (iFul === -1) { Logger.log('❌ "Fulfilment Status" header is MISSING — run migrateOrdersAndReviewsForRewards()'); return; }

  let found = 0;
  for (let r = 1; r < data.length; r++) {
    const oid = String(data[r][iOid] || '').trim();
    const req = parseInt(data[r][iReq], 10) || 0;
    if (req <= 0) continue;   // skip non-Robux orders
    found++;

    const pay  = iPay  >= 0 ? String(data[r][iPay]  || '').trim() : '';
    const ful  = iFul  >= 0 ? String(data[r][iFul]  || '').trim() : '';
    const res  = iRes  >= 0 ? (parseInt(data[r][iRes],  10) || 0) : 0;
    const back = iBack >= 0 ? (parseInt(data[r][iBack], 10) || 0) : 0;
    const ded  = iDed  >= 0 ? String(data[r][iDed]  || '').trim() : '';

    Logger.log('============================');
    Logger.log('Order: ' + oid + '  (sheet row ' + (r+1) + ')');
    Logger.log('  Payment Status   : "' + pay + '"');
    Logger.log('  Fulfilment Status: "' + ful + '"');
    Logger.log('  Robux Required   : ' + req);
    Logger.log('  Robux Reserved   : ' + res);
    Logger.log('  Robux Backorder  : ' + back);
    Logger.log('  Robux Deducted   : "' + ded + '"');

    // Will fixStuckRobuxOrders touch it?
    const wouldFix = (ful === 'Shipped' && req > 0 && ded !== 'Yes');
    Logger.log('  → fixStuckRobuxOrders WOULD ATTEMPT: ' + (wouldFix ? 'YES' : 'NO'));

    if (!wouldFix) {
      let reasons = [];
      if (ful !== 'Shipped') reasons.push('Fulfilment Status is "' + ful + '" (must be exactly "Shipped")');
      if (ded === 'Yes')     reasons.push('Robux Deducted is already "Yes"');
      Logger.log('    ❌ SKIPPED because: ' + reasons.join(' | '));
    }

    // Will deductRobuxOnShipped succeed?
    if (ded === 'Yes') {
      Logger.log('  → deductRobuxOnShipped would: SKIP (already deducted)');
    } else if (res < req) {
      Logger.log('  → deductRobuxOnShipped would: FAIL — Reserved (' + res + ') < Required (' + req + '). Add stock + run allocateRobuxBackordersNow() first.');
    } else if (res >= req) {
      Logger.log('  → deductRobuxOnShipped would: SUCCEED and deduct ' + req + ' Robux');
    }
  }
  Logger.log('============================');
  Logger.log('Scanned ' + found + ' Robux order(s).');
}

function findRobuxOrdersByItemTitle() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(ORDERS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());

  const idx = name => headers.indexOf(name);
  const iOid  = idx('Order ID');
  const iDate = idx('Date');
  const iEm   = idx('Email');
  const iItem = idx('Items');
  const iPay  = idx('Payment Status');
  const iFul  = idx('Fulfilment Status');
  const iReq  = idx('Robux Required');
  const iRes  = idx('Robux Reserved');
  const iBack = idx('Robux Backorder');
  const iDed  = idx('Robux Deducted');

  Logger.log('=== Orders whose Items contain "robux" (case-insensitive) ===');

  let hits = 0;
  for (let r = 1; r < data.length; r++) {
    const items = String(data[r][iItem] || '');
    if (items.toLowerCase().indexOf('robux') === -1) continue;
    hits++;
    Logger.log('─────────────────────────────');
    Logger.log('Row ' + (r+1) + ' | Order: ' + data[r][iOid]);
    Logger.log('  Date   : ' + data[r][iDate]);
    Logger.log('  Email  : ' + data[r][iEm]);
    Logger.log('  Items  : ' + items);
    Logger.log('  Payment: ' + data[r][iPay]);
    Logger.log('  Fulfil: ' + data[r][iFul]);
    Logger.log('  → Robux Required : "' + data[r][iReq] + '"');
    Logger.log('  → Robux Reserved : "' + data[r][iRes] + '"');
    Logger.log('  → Robux Backorder: "' + data[r][iBack] + '"');
    Logger.log('  → Robux Deducted : "' + data[r][iDed] + '"');
  }
  if (hits === 0) Logger.log('❌ No orders have "robux" in the Items column either.');

  // ── Also dump inventory sheet ──
  Logger.log('\n=== RobuxInventory sheet state ===');
  const inv = ss.getSheetByName('RobuxInventory');
  if (inv) {
    const invData = inv.getRange(2, 1, 11, 2).getValues();
    invData.forEach(row => Logger.log('  ' + row[0] + ' = ' + row[1]));
  } else {
    Logger.log('❌ RobuxInventory sheet missing!');
  }

  // ── Scan Games sheet for Robux products ──
  Logger.log('\n=== Games sheet: titles matching Robux regex ===');
  const games = ss.getSheetByName(GAME_SHEET_NAME);
  if (games) {
    const gd = games.getDataRange().getValues();
    const regex = /([\d][\d,]*)\s*robux/i;
    gd.slice(1).forEach(r => {
      const title = String(r[1] || '');
      const m = title.match(regex);
      if (m) {
        Logger.log('  ✅ MATCH: "' + title + '" → ' + m[1] + ' Robux');
      } else if (/robux/i.test(title) || /r\$|\$r/i.test(title)) {
        Logger.log('  ❌ NO MATCH: "' + title + '" (contains robux-like text but regex fails!)');
      }
    });
  }
}

function testRobuxParser() {
  const tests = ['100 robux', '200 robux', '1000 Robux', '1,500 robux'];
  tests.forEach(t => {
    Logger.log(t + ' → ' + _parseRobuxAmountFromTitle(t));
  });
}
