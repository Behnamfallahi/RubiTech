# Google Maps Geocoding Integration

This document describes the Google Maps Geocoding API integration added to the RubiTech backend.

## Overview

The system now supports converting student addresses (stored as strings in `Student.location`) to latitude/longitude coordinates and storing them in `Laptop.locationLat` and `Laptop.locationLng` fields.

## New Endpoint

### POST /students/:id/geocode

Converts a student's address to coordinates and updates all linked laptops.

**Authentication:** Required (JWT token)
**Authorization:** ADMIN or AMBASSADOR roles only
- ADMIN: Can geocode any student
- AMBASSADOR: Can only geocode students they introduced

**Request:**
```http
POST /students/123/geocode
Authorization: Bearer <jwt-token>
```

**Response (Success):**
```json
{
  "message": "مختصات جغرافیایی با موفقیت به‌روزرسانی شد",
  "student": {
    "id": 123,
    "name": "علی احمدی",
    "location": "تهران، خیابان ولیعصر، پلاک 123"
  },
  "coordinates": {
    "lat": 35.7219,
    "lng": 51.3890
  },
  "updatedLaptops": 2
}
```

**Response (Error):**
```json
{
  "error": "آدرس قابل جغرافیایی نیست",
  "details": "ZERO_RESULTS"
}
```

## Environment Configuration

Add the following to your `.env` file:

```env
GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
```

## Updated Endpoints

### GET /locations

The locations endpoint now includes student information for fallback display:

```json
[
  {
    "id": 1,
    "serialNumber": "LT001",
    "laptopName": "Dell Inspiron",
    "locationLat": 35.7219,
    "locationLng": 51.3890,
    "student": {
      "id": 123,
      "name": "علی احمدی",
      "location": "تهران، خیابان ولیعصر، پلاک 123"
    }
  }
]
```

## WebSocket Updates

WebSocket connections now receive the same data structure as the `/locations` endpoint, including student information for laptops without coordinates.

## Error Handling

- **403 Forbidden:** User not authorized (not ADMIN or AMBASSADOR)
- **404 Not Found:** Student not found
- **400 Bad Request:** No address, no linked laptops, or geocoding failed
- **500 Internal Server Error:** Missing API key or server error

## API Restrictions

- All geocoding requests are restricted to Iran (`components=country:IR`)
- Only students with linked laptops can be geocoded
- Ambassadors can only geocode their own students

## Usage Example

```javascript
// Geocode a student's address
const response = await fetch('/students/123/geocode', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
if (response.ok) {
  console.log('Coordinates updated:', result.coordinates);
  console.log('Updated laptops:', result.updatedLaptops);
} else {
  console.error('Error:', result.error);
}
```
