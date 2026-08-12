const path = require('path');
const fs = require('fs');

const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

// Deletes one previously-uploaded file given its DB-stored relative URL (e.g.
// "/uploads/products/Year_2026/Aug/xxx.jpg"). Best-effort and fire-and-forget: a missing
// file (already gone, or a value that was never a real upload) is not an error, and this
// must never block or fail the DB operation that triggered it - it only exists to stop
// uploads/ from accumulating orphaned files when a record or image reference is deleted.
function deleteUploadedFile(relativeUrlPath) {
  if (!relativeUrlPath || typeof relativeUrlPath !== 'string' || !relativeUrlPath.startsWith('/uploads/')) return;
  const withinUploads = relativeUrlPath.replace(/^\/uploads\//, '');
  const absolutePath = path.resolve(UPLOADS_ROOT, withinUploads);
  // Guards a stored path containing "../" from ever resolving outside uploads/.
  if (!absolutePath.startsWith(`${path.resolve(UPLOADS_ROOT)}${path.sep}`)) return;
  fs.unlink(absolutePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error(`[imageCleanup] Failed to delete ${absolutePath}:`, err.message);
    }
  });
}

function deleteAllImages(paths) {
  (Array.isArray(paths) ? paths : []).forEach(deleteUploadedFile);
}

// Deletes only the files present in `previousPaths` but no longer in `nextPaths` - i.e. the
// ones actually removed/replaced by this update, not every image still on the record.
function deleteRemovedImages(previousPaths, nextPaths) {
  const previous = Array.isArray(previousPaths) ? previousPaths : [];
  const next = new Set(Array.isArray(nextPaths) ? nextPaths : []);
  previous.filter((p) => !next.has(p)).forEach(deleteUploadedFile);
}

module.exports = { deleteUploadedFile, deleteAllImages, deleteRemovedImages };
