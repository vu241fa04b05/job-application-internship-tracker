const mongoose = require("mongoose");
const applicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  company: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  type: { type: String, enum: ["Job", "Internship"], default: "Job" },
  location: { type: String, trim: true, default: "" },
  workMode: { type: String, enum: ["On-site", "Hybrid", "Remote"], default: "On-site" },
  salary: { type: String, default: "" },
  status: { type: String, enum: ["Saved", "Applied", "Assessment", "Interview", "Offered", "Rejected", "Withdrawn"], default: "Applied" },
  appliedDate: { type: Date, default: Date.now },
  deadline: { type: Date, default: null },
  interviewDate: { type: Date, default: null },
  jobUrl: { type: String, default: "" },
  notes: { type: String, maxlength: 3000, default: "" }
}, { timestamps: true });
applicationSchema.index({ user: 1, status: 1 });
module.exports = mongoose.model("Application", applicationSchema);
