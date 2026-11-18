const mongoose = require("mongoose");
module.exports = mongoose.model("Approval", new mongoose.Schema({
  petitionId: { type: mongoose.Schema.Types.ObjectId, ref: "Petition", required: true, index: true },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  stage: { type: Number, default: 1 },
  decision: { type: String, enum: ["Under Review", "Returned", "Endorsed", "Approved", "Rejected"], required: true },
  comments: String,
  decidedAt: { type: Date, default: Date.now }
}));
