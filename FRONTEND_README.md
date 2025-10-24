# Robitic Frontend - Home Page

A React frontend application for the Robitic nonprofit laptop donation project, featuring a beautiful Persian RTL interface.

## Features

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **RTL Support**: Full Persian language support with proper RTL layout
- **Interactive Map**: Iran map with blue markers showing student locations
- **Smooth Animations**: Framer Motion animations for enhanced user experience
- **Modern UI**: Clean, professional design matching the provided wireframes

## Tech Stack

- **React 18** with Create React App
- **Tailwind CSS** for styling with RTL support
- **React Router** for navigation
- **React Leaflet** for interactive maps
- **Framer Motion** for animations
- **Axios** for API calls
- **Vazir Font** for Persian typography

## Project Structure

```
src/
├── components/
│   ├── Header.js          # Fixed header with menu and FAQ
│   ├── HeroSection.js     # Main hero section with images
│   ├── MapSection.js      # Interactive Iran map with markers
│   ├── TeamSection.js     # Team members showcase
│   ├── CtaModal.js        # Registration modal
│   ├── Footer.js          # Footer with social links
│   └── index.js           # Components export
├── pages/
│   └── Home.js            # Main home page
├── services/
│   └── api.js             # API service with mock data
└── App.js                 # Main app with routing
```

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm start
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```

## Features Implemented

### Header Component
- Fixed navigation with hamburger menu
- Persian title "روبیتیک" with snowflake icons
- Expandable FAQ accordion
- Mobile-responsive sidebar menu

### Hero Section
- Group photo and laptops images
- Persian text content
- Call-to-action buttons
- Orange overlay design

### Map Section
- Interactive Iran map using Leaflet
- Blue markers for student locations
- Mock data with 8+ locations
- Video call integration image
- Descriptive text about the program

### Team Section
- Circular team member photos
- Persian names and titles
- Hover effects and animations
- Large CTA button "آینده‌ساز شو"

### CTA Modal
- Backdrop blur effect
- Two registration cards (Safir/Donator)
- Gradient backgrounds
- Smooth animations

### Footer
- Social media links (LinkedIn, Instagram)
- Persian copyright text
- Decorative elements
- Blue gradient background

## Mock Data

The application includes mock data for:
- **Map Locations**: 8 student locations across Iran
- **API Responses**: Simulated network delays
- **Error Handling**: Graceful fallbacks

## Responsive Breakpoints

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

## RTL Support

- Full Persian language support
- Proper text direction (right-to-left)
- Mirrored layouts for RTL reading
- Vazir font for optimal Persian typography

## Animations

- Fade-in effects on scroll
- Hover animations for interactive elements
- Modal transitions
- Loading animations
- Smooth scroll-to-top functionality

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Notes

- All images are loaded from external URLs (PostImg)
- API calls fallback to mock data
- No authentication implemented (as requested)
- Clean, maintainable code structure
- No console errors or warnings

## Future Enhancements

- Backend API integration
- User authentication
- Registration forms
- Admin dashboard
- Payment processing
- Email notifications

---

Built with ❤️ for a better future through education.