const router = require("express").Router();
const Application = require("../models/Application");
const allowedStatuses = ["Saved", "Applied", "Assessment", "Interview", "Offered", "Rejected", "Withdrawn"];

router.get("/stats", async (req, res) => {
  try {
    const items = await Application.find({ user: req.userId });
    const count = status => items.filter(x => x.status === status).length;
    res.json({
      total: items.length, interviews: count("Interview"), offers: count("Offered"),
      rejections: count("Rejected"), applied: count("Applied") + count("Assessment"),
      responseRate: items.length ? Math.round(((count("Interview") + count("Offered") + count("Rejected")) / items.length) * 100) : 0,
      byStatus: allowedStatuses.map(status => ({ status, count: count(status) }))
    });
  } catch (err) { res.status(500).json({ message: "Could not load statistics.", error: err.message }); }
});
router.get("/", async (req, res) => {
  try {
    const filter = { user: req.userId };
    if (req.query.status && allowedStatuses.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.type && ["Job", "Internship"].includes(req.query.type)) filter.type = req.query.type;
    if (req.query.q) filter.$or = ["company", "role", "location"].map(k => ({ [k]: { $regex: req.query.q, $options: "i" } }));
    const items = await Application.find(filter).sort({ updatedAt: -1 });
    res.json(items);
  } catch (err) { res.status(500).json({ message: "Could not load applications.", error: err.message }); }
});
router.post("/", async (req, res) => {
  try {
    const { company, role } = req.body;
    if (!company || !role) return res.status(400).json({ message: "Company and role are required." });
    const item = await Application.create({ ...req.body, user: req.userId });
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ message: "Could not save application.", error: err.message }); }
});
router.put("/:id", async (req, res) => {
  try {
    const item = await Application.findOneAndUpdate({ _id: req.params.id, user: req.userId }, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: "Application not found." });
    res.json(item);
  } catch (err) { res.status(400).json({ message: "Could not update application.", error: err.message }); }
});
router.delete("/:id", async (req, res) => {
  try {
    const item = await Application.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!item) return res.status(404).json({ message: "Application not found." });
    res.json({ message: "Application deleted." });
  } catch (err) { res.status(500).json({ message: "Could not delete application.", error: err.message }); }
});
module.exports = router;
