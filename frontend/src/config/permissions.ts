
export enum UserRole {
    SALES_MANAGER = 'sales_manager',
    LOGISTICS_MANAGER = 'logistics_manager',
    TELECALLER = 'telecaller',
    MARKETING_MANAGER = 'marketing_manager',
    BUSINESS_ANALYST = 'business_analyst',
    PRODUCT_MANAGER = 'product_manager',
    DEVELOPER = 'developer',
    ADMIN = 'admin'
}

export type Permission = string;

export const PERMISSIONS = {
    // Dashboard & General
    VIEW_DASHBOARD: 'view_dashboard',
    VIEW_CUSTOMERS: 'view_customers',
    VIEW_SALES: 'view_sales',
    VIEW_DISTRIBUTORS: 'view_distributors',
    VIEW_ORDERS: 'view_orders',
    VIEW_PAYMENTS: 'view_payments',

    // Sales
    MANAGE_SALES_ORDERS: 'manage_sales_orders', // Sales manager
    COLLECT_PAYMENTS: 'collect_payments', // Sales manager
    ADD_NEW_SALES: 'add_new_sales', // Sales manager
    INPUT_DISPATCH_DETAILS: 'input_dispatch_details', // Sales manager
    VIEW_CALLING_LIST: 'view_calling_list', // Sales manager, Telecallers
    VIEW_PENDING_ORDERS: 'view_pending_orders', // Sales manager, Logistics manager

    // Logistics
    MANAGE_ALL_ORDERS: 'manage_all_orders', // Logistics manager
    DISPATCH_ORDERS: 'dispatch_orders', // Logistics manager
    RETURN_STOCK: 'return_stock', // Logistics manager
    MANAGE_INVENTORY: 'manage_inventory', // Logistics manager (stock in/out)
    MANAGE_PRODUCT_MATERIALS: 'manage_product_materials', // Logistics manager
    MANAGE_ROUTES: 'manage_routes', // Logistics manager, Marketing manager

    // Telecalling
    VIEW_PENDING_PAYMENTS: 'view_pending_payments', // Telecallers

    // Marketing
    GENERATE_LEADS: 'generate_leads', // Marketing manager
    INPUT_CUSTOMER_DATA: 'input_customer_data', // Marketing manager
    ANALYZE_CUSTOMER_DATA: 'analyze_customer_data', // Marketing manager
    PREDICTION_ANALYSIS: 'prediction_analysis', // Marketing manager
    VIEW_MAPS: 'view_maps', // Marketing manager

    // Business Analysis
    VIEW_ALL_ANALYSIS: 'view_all_analysis', // Business Analyst

    // Admin / Product
    ADMIN_ACCESS: 'admin_access', // Product manager, Developer
    CHANGE_MANAGEMENT: 'change_management', // Product manager, Developer

    // System
    FULL_ACCESS: 'full_access', // Developer
    RUN_ALGORITHM: 'run_algorithm', // Sales Manager, Business Analyst, Admin
} as const;

export const ROLE_PERMISSIONS: Record<UserRole | string, Permission[]> = {
    [UserRole.SALES_MANAGER]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.MANAGE_SALES_ORDERS,
        PERMISSIONS.COLLECT_PAYMENTS,
        PERMISSIONS.ADD_NEW_SALES,
        PERMISSIONS.INPUT_DISPATCH_DETAILS,
        PERMISSIONS.VIEW_CALLING_LIST,
        PERMISSIONS.VIEW_PENDING_ORDERS,
        PERMISSIONS.INPUT_CUSTOMER_DATA,
        PERMISSIONS.VIEW_CUSTOMERS,
        PERMISSIONS.VIEW_SALES,
        PERMISSIONS.VIEW_PAYMENTS,
        PERMISSIONS.GENERATE_LEADS, // Can schedule demos
        PERMISSIONS.VIEW_ORDERS, // Can view order status
        PERMISSIONS.VIEW_DISTRIBUTORS,
        PERMISSIONS.VIEW_ALL_ANALYSIS, // Restore access to reports
        PERMISSIONS.RUN_ALGORITHM, // Can run Mantri scoring algorithm
    ],

    [UserRole.LOGISTICS_MANAGER]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.MANAGE_ALL_ORDERS,
        PERMISSIONS.DISPATCH_ORDERS, // dispatch orders
        PERMISSIONS.RETURN_STOCK,
        PERMISSIONS.MANAGE_INVENTORY, // stock inwards & outwards
        PERMISSIONS.MANAGE_PRODUCT_MATERIALS,
        PERMISSIONS.VIEW_PENDING_ORDERS,
        PERMISSIONS.MANAGE_ROUTES,
        PERMISSIONS.VIEW_ORDERS,
        PERMISSIONS.VIEW_DISTRIBUTORS,
        PERMISSIONS.VIEW_SALES, // Needs to see sales to dispatch
    ],

    [UserRole.TELECALLER]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_CALLING_LIST,
        PERMISSIONS.VIEW_PENDING_PAYMENTS,
        PERMISSIONS.VIEW_PAYMENTS, // To see payment list
        PERMISSIONS.VIEW_CUSTOMERS, // Needs to see customer details to call
    ],

    [UserRole.MARKETING_MANAGER]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.GENERATE_LEADS,
        PERMISSIONS.INPUT_CUSTOMER_DATA,
        PERMISSIONS.ANALYZE_CUSTOMER_DATA,
        PERMISSIONS.PREDICTION_ANALYSIS,
        PERMISSIONS.VIEW_MAPS,
        PERMISSIONS.MANAGE_ROUTES,
        PERMISSIONS.VIEW_CUSTOMERS,
        PERMISSIONS.VIEW_DISTRIBUTORS,
        PERMISSIONS.VIEW_SALES, // Analyze sales trends
    ],

    [UserRole.BUSINESS_ANALYST]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_ALL_ANALYSIS,
        PERMISSIONS.ANALYZE_CUSTOMER_DATA,
        // "Full access / no change management access" implies read-only on most things?
        PERMISSIONS.PREDICTION_ANALYSIS,
        PERMISSIONS.VIEW_SALES,
        PERMISSIONS.VIEW_CUSTOMERS,
        PERMISSIONS.RUN_ALGORITHM,
    ],

    [UserRole.PRODUCT_MANAGER]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.ADMIN_ACCESS,
        PERMISSIONS.CHANGE_MANAGEMENT,
    ],

    [UserRole.DEVELOPER]: [
        // Developer has everything
        PERMISSIONS.FULL_ACCESS,
        ...Object.values(PERMISSIONS)
    ],

    [UserRole.ADMIN]: [
        // Admin has everything
        PERMISSIONS.FULL_ACCESS,
        PERMISSIONS.ADMIN_ACCESS,
        ...Object.values(PERMISSIONS)
    ]
};

export const hasPermission = (userRole: string | undefined, permission: Permission): boolean => {
    if (!userRole) return false;

    // Developer & Admin override
    if (userRole === UserRole.DEVELOPER || userRole === UserRole.ADMIN) return true;

    const allowedPermissions = ROLE_PERMISSIONS[userRole] || [];
    return allowedPermissions.includes(permission) || allowedPermissions.includes(PERMISSIONS.FULL_ACCESS);
};
