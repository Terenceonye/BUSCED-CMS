const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema({
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty",
    required: true,
  },
  department: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
  ],
  program: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Program", required: true },
  ],
  profileImage: {
    filename: String,
    url: String,
    originalName: String,
  },
  fullName: String,
  title: String,
  position: String,

  specialization: [String],
  phone: { type: String, required: true },
  email: { type: String, required: true },
  // address: String,
  affiliation: String,
  externalLinks: {
    googleScholar: String,
    researchGate: String,
    collaborationNetwork: String,
  },
  about: {
    bio: String,
    degrees: [String],
  },
  researchOutputs: [
    {
      title: String,
      date: Date,
      collaborators: [String],
      pdfUrl: String,
      viewLink: String,
    },
  ],
  research: {
    interests: [String],
    grants: [
      new mongoose.Schema(
        {
          title: String,
          date: Date,
          tag: String,
          description: String,
        },
        { _id: false }
      ),
    ],
  },

  professionalActivities: [
    new mongoose.Schema(
      {
        type: String,
        title: String,
        date: Date,
        description: String,
      },
      { _id: false }
    ),
  ],
  teachingActivities: [
    new mongoose.Schema(
      {
        tag: String,
        title: String,
        startDate: Date,
        endDate: Date,
        link: String,
      },
      { _id: false }
    ),
  ],
});

module.exports = mongoose.model("Staff", staffSchema);
