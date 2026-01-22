const mongoose = require('mongoose');

const tenderSchema = new mongoose.Schema({
    // Extracted ID (primary identifier for our logic, though Mongo has _id)
    tenderId: { type: String, required: true, unique: true, index: true },

    // Core List Fields
    sNo: String,
    reference: String,
    title: String,
    ministry: String,
    typeMethod: String,
    dates: String,
    publicationDate: String,
    closingDate: String,
    status: String,
    originalLink: String,

    // Status Flags
    detailed_full_scraping_complete: { type: Boolean, default: false },

    // Dynamic Detailed Fields
    // We can use a map or strict: false, but explicit fields for known ones are better for indexing
    dtl_ministry: String,
    dtl_organization: String,
    dtl_procuring_entity_name: String,
    dtl_district: String,
    dtl_procurement_nature: String,
    dtl_budget_type: String,

    // Social Fields
    likes: [{ type: String }],

    // Catch-all for other scraped details
    extraDetails: { type: Map, of: String }
}, {
    timestamps: true,
    strict: false // Allow saving other dtl_ fields directly to the root if we want, or use extraDetails
});

module.exports = mongoose.model('Tender', tenderSchema);
