# 🌾 Beehive & Crop Tracker Backend

This is a Node.js + Express.js + MongoDB backend system to log beehive placements, track crop flowering windows, and discover nearby crop opportunities for pollination.

---

## 🚀 Setup Instructions

1. **Clone the repo**
   ```bash
   git clone https://github.com/Ayush-Mahariya/Beehive-Crop-Tracker-Backend
   cd beehive-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run MongoDB locally**
   Make sure MongoDB is running at `mongodb://localhost:27017`.

4. **Start the server**
   ```bash
   node server.js
   ```

   Server will run at [http://localhost:3000](http://localhost:3000)

---

## 🔌 API Endpoints

### 1. **Add Hive**
```
POST /api/hives
```
**Request Body:**
```json
{
  "hiveId": "HIVE004",
  "datePlaced": "2025-04-08",
  "latitude": 28.7041,
  "longitude": 77.1025,
  "numColonies": 5
}
```

### 2. **Get Hive Logs**
```
GET /api/hives
```
**Query Params (optional):**
- `startDate=YYYY-MM-DD`
- `endDate=YYYY-MM-DD`
- `type=past | future`
- `page=1`
- `limit=10`

Returns a paginated list of hive logs.

---

### 3. **Add Crop Entry**
```
POST /api/crops
```
**Request Body:**
```json
{
  "name": "Sunflower",
  "floweringStart": "2025-04-10",
  "floweringEnd": "2025-04-25",
  "latitude": 26.9124,
  "longitude": 75.7873,
  "recommendedHiveDensity": 5
}
```

✅ Checks for overlapping flowering windows in 2km area before saving.

---

### 4. **Nearby Crop Opportunities**
```
GET /api/crops/nearby
```
**Query Params:**
- `latitude`
- `longitude`
- `radius` (in km, default = 100)
- `date` (optional, default = today)

Returns crops within radius that are flowering on given date.

---

## 🧪 Sample Postman Collection

You can import [this Postman collection](./BeeHive.postman_collection.json) to test the APIs.

---

## 🧠 Explanation of Key Logic

- **Hive Schema:** Stores geolocation and timestamped placement details.
- **Crop Schema:** Includes geospatial data, flowering window, and hive density.
- **Overlap Prevention:** New crop entries are blocked if another crop of the same name overlaps in flowering window within 2km.
- **Geospatial Queries:** Uses MongoDB 2dsphere indexing for fast radius searches.
- **Time Filtering:** Supports past vs future logs via `type=past|future`.

---

## 🧩 Bonus & Assumptions

- ✅ Assumes local MongoDB instance
- ✅ Flowering window overlap check is exact and limited to 2km radius
