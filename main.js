const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mongoose = require("mongoose");
const cors = require("cors");
const skill = require("./skills");

require("dotenv").config()

const app = express();
app.use(cors());
app.use(express.json( {limit: '50mb'} ));

mongoose.connect(process.env.URI);

const Job = mongoose.model("Job", new mongoose.Schema({}, { strict: false }));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


function extractSkills(text) {
  return skill.filter((skill) => text.includes(skill));
}

//  API: Fetch All Jobs from MongoDB 
app.get("/jobs", async (req, res) => {
  try {
    const jobs = await Job.find()
    res.json(jobs);
  }catch (error) {
    res.status(500).json({ error: "Error fetching jobs" });
  }
});

//  API: Fetch all Jobs from MongoDB with Pagination
app.get('/alljobs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    limit = 20;
    const skip = (page - 1) * limit;
    const items = await Job.find().skip(skip).limit(limit);
    const totalItems = await Job.countDocuments();

    res.json({
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
      data: items,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//  API: Fetch Single Job Details
app.get("/job/:id", async (req, res) => {
  try {
    const job = await Job.findOne({ job_id: req.params.id });
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: "Error fetching job details" });
  }
});

//  API: Upload Resume & Fetch Matching Jobs
app.post("/upload-resume", upload.single("resume"), async (req, res) => {
  try {
    const data = await pdfParse(req.file.buffer);
    const extractedSkills = extractSkills(data.text);

    if (extractedSkills.length === 0) {
      return res.json({ message: "No matching jobs found", jobs: [] });
    }
    // Fetch Jobs from MongoDB Matching Extracted Skills
    const matchedJobs = await Job.find({
      skills: { $in: extractedSkills },
    });

    res.json({ skills: extractedSkills, jobs: matchedJobs });
  } catch (error) {
    res.status(500).json({ error: "Error processing resume" });
  }
});

//  API:  Fav jobs from MongoDB
app.get('/favjobs', async (req, res) => {
  try {
    const ids = req.query.ids; // ids = 'job123,job456,job789'

    if (!ids) {
      return res.status(400).json({ error: 'No job IDs provided' });
    }
    const idArray = ids.split(',');
    const jobs = await Job.find({ job_id: { $in: idArray } });
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start Server
app.listen(5000, () => console.log("✅ Server running on port 5000"));
