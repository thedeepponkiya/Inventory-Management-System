const UserModel = require('../models/user.model');

// Deliberately minimal read-only list for CRM's Assigned-To dropdown only (Module 2).
// Does not replace/migrate the mock-data-backed Users page (frontend/src/components/users/Users.tsx) -
// that's a separate, out-of-scope effort.
async function getAssignableUsers(req, res) {
  try {
    const users = await UserModel.getAllBasic();
    res.json({ status: true, message: 'Users fetched successfully', data: users });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

module.exports = { getAssignableUsers };
