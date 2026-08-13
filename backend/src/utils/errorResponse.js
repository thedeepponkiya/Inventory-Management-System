// Every controller's catch block used to do res.status(500).json({ message: err.message }),
// echoing raw Postgres/driver error text (constraint names, query fragments, occasionally
// schema details) straight back to any authenticated client on an unexpected failure. Only
// intentional, already-validated application errors - the ones explicitly thrown with a
// `statusCode` attached (e.g. materialInward.controller.js's pending-qty check,
// invoice.controller.js's overpayment check) - are safe to show verbatim, since those
// messages were written for the end user. Anything else is logged server-side (so it's still
// debuggable) and replaced with a generic message before it reaches the response.
function sendServerError(res, err) {
  console.error(err);
  if (err.statusCode) {
    return res.status(err.statusCode).json({ status: false, message: err.message, data: null });
  }
  return res.status(500).json({ status: false, message: 'Something went wrong. Please try again.', data: null });
}

module.exports = { sendServerError };
