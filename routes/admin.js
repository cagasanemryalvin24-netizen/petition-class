const router = require("express").Router();
const User = require("../models/User");
const Petition = require("../models/Petition");
const Approval = require("../models/Approval");
const Notification = require("../models/Notification");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth, requireRole("admin"));

router.get("/users", async (req, res) => {
  try {
    res.json(await User.find().select("-passwordHash").sort({ createdAt: -1 }));
  } catch (e) { res.status(500).json({ message: "Server error." }); }
});

// Admin queue: endorsed petitions awaiting final approval
router.get("/petitions", async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : { status: "Endorsed" };
    res.json(await Petition.find(filter)
      .populate("requestedBy", "fullName email")
      .sort({ updatedAt: -1 }));
  } catch (e) { res.status(500).json({ message: "Server error." }); }
});

// Admin makes the final decision after reviewer endorsement
router.post("/petitions/:id/decision", async (req, res) => {
  try {
    const { decision, comments } = req.body;
    if (!["Approved", "Rejected"].includes(decision))
      return res.status(400).json({ message: "Final decision must be Approved or Rejected." });
    if (typeof comments !== "string" || !comments.trim())
      return res.status(400).json({ message: "Please provide an admin comment." });

    const petition = await Petition.findById(req.params.id);
    if (!petition) return res.status(404).json({ message: "Petition not found." });
    if (petition.status !== "Endorsed")
      return res.status(400).json({ message: "Only endorsed petitions can receive a final admin decision." });

    await Approval.create({
      petitionId: petition._id,
      adminId: req.user.id,
      stage: 2,
      decision,
      comments: comments.trim()
    });
    petition.status = decision;
    await petition.save();

    await Notification.create({
      userId: petition.requestedBy,
      petitionId: petition._id,
      message: `Your petition for ${petition.subjectCode} received the final admin decision: ${decision}.`
    });
    res.json(petition);
  } catch (e) {
    if (e.name === "CastError") return res.status(404).json({ message: "Petition not found." });
    console.error(e);
    res.status(500).json({ message: "Server error." });
  }
});

router.patch("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    if (!["student", "reviewer", "admin"].includes(role))
      return res.status(400).json({ message: "Invalid role." });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  } catch (e) { res.status(500).json({ message: "Server error." }); }
});

module.exports = router;
