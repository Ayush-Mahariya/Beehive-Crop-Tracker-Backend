import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";

const app = express();

app.use(bodyParser.urlencoded({extended : true}));

mongoose.connect("mongodb://localhost:27017/beehiveDB")
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

app.get("/", (req, res) => {
    res.send("<h1>Welcome to server</h1>");
});

const hiveSchema = new mongoose.Schema({
        hiveId: { 
            type: String, 
            required: true, 
            unique: true 
        },
        datePlaced: { 
            type: Date, 
            required: true 
        },
        latitude: {
            type: Number,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        },
        location: {
            type: {
                type: String,
                enum: ['Point']
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: true
            }
        },
        numColonies: Number
    },
    {
        timestamps: true  // This automatically adds `createdAt` and `updatedAt`
    }
);

hiveSchema.index({ location: '2dsphere' });

const Hive = mongoose.model("Hive", hiveSchema); 

const cropSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    floweringStart: { 
        type: Date, 
        required: true 
    },
    floweringEnd: { 
        type: Date, 
        required: true 
    },
    latitude: { 
        type: Number, 
        required: true 
    },
    longitude: { 
        type: Number, 
        required: true 
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },
    recommendedHiveDensity: { type: Number, required: true, min: 1 }
}, { timestamps: true });

// Geospatial index
cropSchema.index({ location: '2dsphere' });

const Crop = mongoose.model('Crop', cropSchema);

app.post('/api/hives', async (req, res) => {
  try {
    const { hiveId, datePlaced, latitude, longitude, numColonies } = req.body;

    const hive = new Hive({
      hiveId,
      datePlaced,
      latitude,
      longitude,
      numColonies,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      }
    });

    await hive.save();
    res.status(201).json({ message: 'Hive added successfully', hive });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


app.get('/api/hives', async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    const query = {};

    // Optional date filters (filter based on datePlaced)
    if (startDate || endDate) {
      query.datePlaced = {};
      if (startDate) query.datePlaced.$gte = new Date(startDate);
      if (endDate) query.datePlaced.$lte = new Date(endDate);
    }

    const newHives = await Hive.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ datePlaced: -1 }); // optional: latest first

    const total = await Hive.countDocuments(query);

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      data: newHives
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function isValidCoord(lat, lng) {
  return (
    !isNaN(lat) && !isNaN(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

app.post('/api/crops', async (req, res) => {
  try {
    const {
      name,
      floweringStart,
      floweringEnd,
      latitude,
      longitude,
      recommendedHiveDensity
    } = req.body;

    // Check for overlapping flowering windows in nearby area (2km radius)
    const overlapping = await Crop.find({
      name,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: 2000
        }
      },
      $or: [
        {
          floweringStart: { $lte: new Date(floweringEnd) },
          floweringEnd: { $gte: new Date(floweringStart) }
        }
      ]
    });

    if (overlapping.length > 0) {
      return res.status(409).json({ message: 'Overlapping crop exists in the same area' });
    }

    const crop = new Crop({
      name,
      floweringStart,
      floweringEnd,
      latitude,
      longitude,
      recommendedHiveDensity,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      }
    });

    await crop.save();
    res.status(201).json({ message: 'Crop entry added successfully', crop });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/crops/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 100, date } = req.query;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (!isValidCoord(lat, lng)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    const searchDate = date ? new Date(date) : new Date();

    const crops = await Crop.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseFloat(radius) * 1000 // convert km to meters
        }
      },
      floweringStart: { $lte: searchDate },
      floweringEnd: { $gte: searchDate }
    });

    if (crops.length === 0) {
      return res.json({ message: 'No flowering crops found nearby.', crops: [] });
    }

    res.json({ crops });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server is up and running at http://localhost:3000"));