// Server-side mirror of the CRM role checks the frontend already applies (see
// CrmLeadsPage.tsx's canManageCrm/canEditLead and their sibling copies in
// CrmSourcesPage.tsx/CrmSettingsPage.tsx/CrmFollowupsPage.tsx/CrmDashboardPage.tsx). Those were
// previously UI-only - every CRM write endpoint accepted a request from ANY authenticated user
// regardless of role, so a Sales User could still create/delete leads or edit a lead's own
// fields via a direct API call even though every button/dropdown for that was hidden or
// disabled in the UI. Shared here (rather than duplicated per controller) so the frontend and
// backend can never quietly drift out of sync on who's allowed to do what.

// Only Admin (or the hidden Super Admin account, which bypasses every restriction in this
// app - see databaseReset.controller.js for the same pattern) may create/delete a CRM record
// (lead, source, pipeline stage) or delete a follow-up.
function isCrmAdmin(req) {
  return Boolean(req.user?.isHidden) || req.user?.roleId === 'Admin';
}

// Sales User specifically (every other role keeps normal edit access) can't edit a lead's own
// fields - see LeadDetailDrawer.tsx's canEdit.
function canEditLead(req) {
  return Boolean(req.user?.isHidden) || req.user?.roleId !== 'Sales User';
}

// Sales User only ever sees the leads assigned to them (and, by extension, only the
// follow-ups belonging to those leads) - every other role (Admin, Sales Manager, etc.) still
// sees every lead, same as before. Returns the user id to filter by, or null when the caller
// shouldn't be scoped at all (so callers can do `assignedTo ? WHERE ... : <no filter>`
// without a separate branch).
function leadScopeUserId(req) {
  if (req.user?.isHidden) return null;
  if (req.user?.roleId !== 'Sales User') return null;
  return req.user.id;
}

module.exports = { isCrmAdmin, canEditLead, leadScopeUserId };
