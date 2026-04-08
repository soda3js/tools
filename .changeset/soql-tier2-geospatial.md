---
"@soda3js/soql": minor
---

## Features

### Date/Time Functions

Eight date_extract_* functions for year, month, day, hour, minute, second, day-of-week, and week-of-year. Three date_trunc_* functions for year, year-month, and year-month-day truncation.

### Geospatial Functions

- `withinCircle(col, lat, lng, radius)` for proximity search
- `withinBox(col, nwLat, nwLng, seLat, seLng)` for bounding box queries
- `distanceInMeters(point1, point2)` for distance calculations

### Additional Functions

- `contains(col, substring)` for text search within columns
- `length(col)` for string length
- `median(col)` aggregate function
- `count(col, { distinct: true })` for COUNT(DISTINCT) queries
- `toNumber(col)` and `toText(col)` type casting functions

### Builder Enhancements

- `whereRaw(expression)` convenience method for raw WHERE clauses
