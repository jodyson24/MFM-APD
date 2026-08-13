// Role-based capability helper. Mirrored in frontend/src/utils/permissions.js.
//
// Per stakeholder decision (MASTER_PLAN.md §8.3 amendment):
//  - super_admin, mega_region_admin and mega_region_it are the "management"
//    roles: they manage users, org units, presentation dates and compliance
//    rules. mega_region_admin / mega_region_it are capped to their own mega
//    region by the scope middleware.
//  - mega_region_overseer may VIEW users (read-only) but never manage them.
//  - All other roles can create/enter activities within their own scope.

const MANAGEMENT_ROLES = ['super_admin', 'mega_region_admin', 'mega_region_it'];

function isSuperAdmin(user) {
  return !!user && (user.isSuperAdmin || user.role === 'super_admin');
}

function isManagementUser(user) {
  return isSuperAdmin(user) || MANAGEMENT_ROLES.includes(user && user.role);
}

const canManageUsers = isManagementUser;
const canManageOrgUnits = isManagementUser;
const canManagePresentationDates = isManagementUser;
const canAccessComplianceRules = isManagementUser;

// mega_region_overseer sees the Users page read-only
function canViewUsers(user) {
  return isManagementUser(user) || (user && user.role === 'mega_region_overseer');
}

function canViewSecurityLog(user) {
  return isSuperAdmin(user);
}

// Role -> allowed OrgUnit type (null = any). Enforced on user create/update so
// overseer/pastor roles can never be attached to the wrong tree level.
const ROLE_ORG_TYPES = {
  super_admin: null,
  mega_region_admin: 'mega_region',
  mega_region_it: 'mega_region',
  mega_region_overseer: 'mega_region',
  region_admin: 'region',
  region_overseer: 'region',
  zone_admin: 'zone',
  zonal_pastor: 'zone',
  branch_admin: 'branch',
  branch_pastor: 'branch',
  pastor: 'branch',
  it_official: null,
};

module.exports = {
  MANAGEMENT_ROLES,
  isSuperAdmin,
  isManagementUser,
  canManageUsers,
  canManageOrgUnits,
  canManagePresentationDates,
  canAccessComplianceRules,
  canViewUsers,
  canViewSecurityLog,
  ROLE_ORG_TYPES,
};
