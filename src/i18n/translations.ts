/**
 * حَرِّك | HARRIK — Bilingual Arabic RTL / English LTR Localization Dictionary
 */

export const translations = {
  ar: {
    // Brand & Header
    brandName: "حَرِّك",
    brandLockup: "حَرِّك | HARRIK",
    tagline: "سيارة حاجزاك؟ حَرِّك يحلها.",
    descriptor: "نظام التواصل الذكي لمواقف المدرسة",

    // Navigation
    navSearch: "البحث",
    navInbox: "تنبيهاتي",
    navAdmin: "لوحة الإدارة",
    navStaff: "دليل الموظفين",
    navVehicles: "دليل السيارات",
    navAlerts: "إدارة التنبيهات",
    navUnknown: "سيارات غير معروفة",
    navImport: "استيراد البيانات",
    navSettings: "الإعدادات",
    navAudit: "سجل العمليات",
    logout: "تسجيل الخروج",
    login: "تسجيل الدخول",

    // Plate Search Hero
    searchHeroTitle: "سيارة حاجزاك؟",
    searchHeroSubtitle: "اكتب رقم اللوحة للوصول لصاحب السيارة بسرعة.",
    plateInputPlaceholder: "مثال: ٤٨٢٧٣١ أو 482731",
    searchButton: "ابحث عن السيارة",
    searching: "جارٍ البحث...",
    clearInput: "مسح",
    partialNotice: "تم العثور على أكثر من سيارة تنتهي بهذا الرقم. اختر سيارتك:",

    // Vehicle Card
    ownerTitle: "صاحب السيارة",
    departmentLabel: "القسم",
    employeeIdLabel: "الرقم الوظيفي",
    mobileLabel: "رقم الجوال",
    primaryVehicle: "السيارة الرئيسية",
    secondaryVehicle: "سيارة إضافية",
    callAction: "اتصال هاتفي",
    whatsappAction: "تواصل عبر واتساب",
    sendAlertAction: "إرسال تنبيه موقف",

    // Parking Alerts
    alertModalTitle: "إرسال تنبيه لمالك السيارة",
    alertModalSubtitle: "اختر نوع التنبيه ليتم إخطار الزميل فورًا",
    alertType_BLOCKING: "سيارتك حاجزة سيارتي",
    alertType_LIGHTS_ON: "أنوار السيارة مفتوحة",
    alertType_WINDOW_OPEN: "نافذة السيارة مفتوحة",
    alertType_CHECK_VEHICLE: "يرجى التوجه للسيارة",
    alertType_CONTACT_ME: "يرجى التواصل معي",
    sendAlertBtn: "إرسال التنبيه الآن",
    alertSentSuccess: "تم إرسال التنبيه بنجاح!",
    alertStatus_pending: "بانتظار الاستجابة",
    alertStatus_acknowledged: "تم الاستلام — جاري التحريك",
    alertStatus_resolved: "تم الحل — تحركت السيارة",
    ackButton: "جاي حالًا 🏃‍♂️",
    resolveButton: "تم تحريك السيارة ✅",

    // Unregistered Vehicle
    noResultTitle: "السيارة غير مسجلة في النظام",
    noResultSubtitle: "لم نعثر على صاحب هذه اللوحة في قاعدة بيانات المدرسة.",
    tryAgainBtn: "إعادة المحاولة",
    reportUnknownBtn: "الإبلاغ عن سيارة غير معروفة",
    reportUnknownTitle: "تسجيل بلاغ سيارة غير معروفة",
    makePlaceholder: "نوع السيارة (مثال: تويوتا)",
    modelPlaceholder: "الموديل (مثال: لاندكروزر)",
    colorPlaceholder: "اللون (مثال: أبيض)",
    notePlaceholder: "ملاحظات إضافية (المكان، وقت الملاحظة...)",
    submitReportBtn: "تسجيل البلاغ",
    reportSubmittedSuccess: "تم تسجيل بلاغ السيارة غير المعروفة لفرق الأمن والإدارة.",

    // Dashboard & Metrics
    dashboardGreeting: "مساء الخير 👋",
    dashboardOverviewTitle: "نظرة عامة على مواقف المدرسة",
    metric_registeredStaff: "الموظفون المسجلون",
    metric_registeredVehicles: "السيارات المسجلة",
    metric_coverage: "نسبة تسجيل السيارات",
    metric_searchesToday: "عمليات البحث اليوم",
    metric_successRate: "نسبة نجاح البحث",
    metric_alertsToday: "تنبيهات اليوم",
    metric_activeIncidents: "الحالات النشطة",
    metric_resolutionRate: "نسبة الحل",
    metric_avgAckTime: "متوسط وقت الاستجابة",
    metric_avgResTime: "متوسط وقت الحل",
    currentIssuesTitle: "الحالات النشطة حاليًا",
    allClear: "لا توجد مشكلات مواقف نشطة حاليًا 🎉",
    oldestActiveLabel: "أقدم حالة نشطة",
    liveActivityTitle: "النشاط المباشر",
    trendChartTitle: "معدل البحث والتنبيهات (آخر 7 أيام)",

    // Bulk Import
    importTitle: "استيراد بيانات الموظفين والسيارات",
    importSubtitle: "قم برفع ملف Excel (XLSX) أو CSV يحتوي على بيانات الكادر ومواقف السيارات.",
    downloadTemplate: "تحميل نموذج الملف المعتمد",
    previewTitle: "معاينة الملف قبل الاستيراد",
    readyRows: "جاهز للاستيراد",
    warningRows: "تنبيهات",
    errorRows: "أخطاء تمنع الاستيراد",
    confirmImportBtn: "تأكيد الاستيراد وحفظ البيانات",

    // Language & Theme
    switchLang: "English",
    themeLight: "فاتح",
    themeDark: "داكن",
    themeSystem: "تلقائي",
  },
  en: {
    // Brand & Header
    brandName: "HARRIK",
    brandLockup: "حَرِّك | HARRIK",
    tagline: "Car blocking you? HARRIK solves it.",
    descriptor: "Smart School Parking Contact System",

    // Navigation
    navSearch: "Plate Search",
    navInbox: "My Alerts",
    navAdmin: "Admin Dashboard",
    navStaff: "Staff Directory",
    navVehicles: "Vehicle Directory",
    navAlerts: "Parking Alerts",
    navUnknown: "Unknown Vehicles",
    navImport: "Bulk Import",
    navSettings: "Settings",
    navAudit: "Audit Logs",
    logout: "Log Out",
    login: "Log In",

    // Plate Search Hero
    searchHeroTitle: "Who owns this car?",
    searchHeroSubtitle: "Enter the plate number to quickly reach the vehicle owner.",
    plateInputPlaceholder: "e.g. 482731 or 4827",
    searchButton: "Find Vehicle",
    searching: "Searching...",
    clearInput: "Clear",
    partialNotice: "Multiple vehicles match this suffix. Select your target:",

    // Vehicle Card
    ownerTitle: "Vehicle Owner",
    departmentLabel: "Department",
    employeeIdLabel: "Employee ID",
    mobileLabel: "Mobile",
    primaryVehicle: "Primary Vehicle",
    secondaryVehicle: "Secondary Vehicle",
    callAction: "Phone Call",
    whatsappAction: "Contact via WhatsApp",
    sendAlertAction: "Send Parking Alert",

    // Parking Alerts
    alertModalTitle: "Send Parking Alert",
    alertModalSubtitle: "Select the alert reason to notify the colleague immediately",
    alertType_BLOCKING: "Blocking my vehicle",
    alertType_LIGHTS_ON: "Lights are on",
    alertType_WINDOW_OPEN: "Window is open",
    alertType_CHECK_VEHICLE: "Check your vehicle",
    alertType_CONTACT_ME: "Please contact me",
    sendAlertBtn: "Send Alert Now",
    alertSentSuccess: "Parking alert sent successfully!",
    alertStatus_pending: "Awaiting Response",
    alertStatus_acknowledged: "Acknowledged — Moving car",
    alertStatus_resolved: "Resolved — Car moved",
    ackButton: "On my way 🏃‍♂️",
    resolveButton: "Vehicle Moved ✅",

    // Unregistered Vehicle
    noResultTitle: "Vehicle Not Registered",
    noResultSubtitle: "We could not find this plate number in the school database.",
    tryAgainBtn: "Try Again",
    reportUnknownBtn: "Report Unknown Vehicle",
    reportUnknownTitle: "Report Unregistered Vehicle",
    makePlaceholder: "Vehicle Make (e.g. Toyota)",
    modelPlaceholder: "Model (e.g. Land Cruiser)",
    colorPlaceholder: "Color (e.g. White)",
    notePlaceholder: "Additional notes (location, gate...)",
    submitReportBtn: "Submit Report",
    reportSubmittedSuccess: "Unknown vehicle report logged for Security & Admin review.",

    // Dashboard & Metrics
    dashboardGreeting: "Good Evening 👋",
    dashboardOverviewTitle: "School Parking Overview",
    metric_registeredStaff: "Registered Staff",
    metric_registeredVehicles: "Registered Vehicles",
    metric_coverage: "Vehicle Coverage",
    metric_searchesToday: "Searches Today",
    metric_successRate: "Search Success Rate",
    metric_alertsToday: "Alerts Today",
    metric_activeIncidents: "Active Incidents",
    metric_resolutionRate: "Resolution Rate",
    metric_avgAckTime: "Avg Response Time",
    metric_avgResTime: "Avg Resolution Time",
    currentIssuesTitle: "Current Active Issues",
    allClear: "All clear! No active parking issues 🎉",
    oldestActiveLabel: "Oldest Active Issue",
    liveActivityTitle: "Live Operational Activity",
    trendChartTitle: "Searches & Alerts Trend (Last 7 Days)",

    // Bulk Import
    importTitle: "Staff & Vehicles Bulk Import",
    importSubtitle: "Upload an Excel (XLSX) or CSV file with staff and vehicle registry records.",
    downloadTemplate: "Download Sample Template",
    previewTitle: "Import Preview & Validation",
    readyRows: "Ready to Import",
    warningRows: "Warnings",
    errorRows: "Errors (Blocking)",
    confirmImportBtn: "Confirm & Commit Import",

    // Language & Theme
    switchLang: "العربية",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
  },
};

export type Language = "ar" | "en";
export type TranslationKey = keyof typeof translations.ar;
