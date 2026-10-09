function ok(res, data, meta) {
  res.status(200).json(meta ? { success: true, data, meta } : { success: true, data });
}

function created(res, data) {
  res.status(201).json({ success: true, data });
}

function noContent(res) {
  res.status(204).end();
}

module.exports = { ok, created, noContent };
