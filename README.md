# urban-mobility-data-explorer

## Running the Flask App

1. **Create and activate a virtual environment (recommended):**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   or on windows
   venv\Scripts\activate
   ```

2. **Install dependencies** (if not already):
   ```bash
   pip install flask python-dotenv pandas numpy mysql-connector-python
   ```

3. **Set environment variables**
   - Create a `.env` file in the project root with the following variables:
     ```env
     DB_HOST=your_db_host
     DB_USER=your_db_user
     DB_PASSWORD=your_db_password
     DB_NAME=your_db_name
     SCHEMA_FILE=path/to/nyc_trip.sql
     DATA_FILE=path/to/train.csv  # Optional, defaults to train.csv
     ```

4. **Run the app (PyCharm style)**
   - Set the following environment variables:
     ```bash
     export FLASK_APP=app.py
     export FLASK_ENV=development
     export FLASK_DEBUG=0
     ```
     ### on windows
     ```bash
     $env:FLASK_APP = "app.py"
     $env:FLASK_ENV = "development"
     $env:FLASK_DEBUG = "0"
     ```


   - If using a virtual environment, ensure it is activated:
     ```bash
     source .venv/bin/activate
     ```
   - Then run:
     ```bash
     python -m flask run
     ### or on windows
     python3 -m flask run
     ```
   - Or, if you are in PyCharm, set these environment variables in your run configuration and use the IDE's run button.

5. **Access the app**
   - Open your browser and go to: [http://127.0.0.1:5000/](http://127.0.0.1:5000/)

## API Endpoints

### GET /api/trips
Query trip records with various filters.

**Parameters:**
- `start_date`, `end_date` - date range (YYYY-MM-DD format)
- `hour_of_day` - 0-23
- `day_of_week` - 0 (Monday) through 6 (Sunday)
- `is_weekend` - true/false
- `distance_category` - short, medium, long, or very_long
- `min_speed`, `max_speed` - speed range in km/h
- `passenger_count` - number of passengers
- `limit` - results per page (default 100)
- `offset` - pagination offset (default 0)

**Examples:**
```bash
# basic query
curl "http://127.0.0.1:5000/api/trips?limit=5"

# morning rush hour trips in January
curl "http://127.0.0.1:5000/api/trips?start_date=2015-01-01&end_date=2015-01-31&hour_of_day=8&limit=10"

# weekend solo riders
curl "http://127.0.0.1:5000/api/trips?is_weekend=true&passenger_count=1&limit=10"

# using PowerShell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/trips?limit=5" | ConvertTo-Json -Depth 6
```

### GET /api/trips/statistics
Aggregate trip stats without pulling raw data.

**Parameters:**
- `start_date`, `end_date` - optional date range
- `group_by` - one of: hour_of_day, day_of_week, month, distance_category
- `metrics` - one or more of:
  - avg_speed
  - avg_duration
  - avg_distance
  - trip_count

**Examples:**
```bash
# hourly patterns for January
curl "http://127.0.0.1:5000/api/trips/statistics?group_by=hour_of_day&metrics=avg_speed&metrics=trip_count&start_date=2015-01-01&end_date=2015-01-31"

# weekly breakdown
curl "http://127.0.0.1:5000/api/trips/statistics?group_by=day_of_week&metrics=avg_duration&metrics=trip_count"

# PowerShell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/trips/statistics?group_by=hour_of_day&metrics=avg_speed&metrics=trip_count" | ConvertTo-Json -Depth 6
```

**Sample response:**
```json
{
  "group": "hour_of_day",
  "data": [
    {"hour_of_day": 0, "avg_speed": 25.3, "trip_count": 12453},
    {"hour_of_day": 1, "avg_speed": 28.1, "trip_count": 8932}
  ]
}
```

## Notes
- Make sure MySQL is running before starting the app
- The first run will process and load your CSV data into the database
- All endpoints return JSON - works great with visualization tools
- Use limit/offset params when dealing with large result sets
