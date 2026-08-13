// Frontend mirror of lib/permissions.js (backend).
//
//  - super_admin / mega_region_admin / mega_region_it are the "management"
//    roles (users, org units, presentation dates, compliance).
//  - mega_region_overseer may VIEW users (read-only) but never manage them.
//  - Security Log is super-admin-only.

export const MANAGEMENT_ROLES = ['mega_region_admin', 'mega_region_it'];

export const isSuperAdmin = (user) => !!user && (user.isSuperAdmin || user.role === 'super_admin');

export const isManagementUser = (user) => isSuperAdmin(user) || MANAGEMENT_ROLES.includes(user?.role);

export const canManageUsers = isManagementUser;
export const canManageOrgUnits = isManagementUser;
export const canManagePresentationDates = isManagementUser;
export const canAccessComplianceRules = isManagementUser;

export const canViewUsers = (user) => isManagementUser(user) || user?.role === 'mega_region_overseer';

export const canViewSecurityLog = isSuperAdmin;
