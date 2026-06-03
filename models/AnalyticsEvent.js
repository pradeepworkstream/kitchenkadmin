import mongoose from "mongoose";

const AnalyticsEventSchema = new mongoose.Schema({
  event: { type: String, required: true },
  variant: { type: String, default: "unknown" },
  page: { type: String },
  itemId: { type: String },
  vendor: { type: String },
  category: { type: String },
  method: { type: String },
  count: { type: Number },
  meta: { type: mongoose.Schema.Types.Mixed },
  receivedAt: { type: Date, default: () => new Date() },
}, { timestamps: true });

const AnalyticsEvent = mongoose.models.AnalyticsEvent || mongoose.model("AnalyticsEvent", AnalyticsEventSchema);
export default AnalyticsEvent;
