# Images Folder

This folder contains all image assets for the Avila Protocol frontend application.

## 📁 Folder Structure

```
src/assets/images/
├── README.md          # This file
├── logos/             # Company and protocol logos
│   ├── avila-circular-logo.svg    # Main circular logo with waves and bird
│   ├── avila-text-logo.svg        # AVILA text logo with gradient
│   ├── avila-favicon.svg          # Favicon version of circular logo
│   ├── Avilatokenlogo.jpg        # Avila token logo (replaces warning icons)
│   └── Avilatext.jpg             # Avila text logo in JPG format
├── icons/             # Custom icons and symbols
│   └── options-icon.svg           # Options trading icon
├── backgrounds/       # Background images and patterns
├── ui/                # UI-specific images and graphics
│   └── trading-chart-bg.svg      # Subtle grid background for charts
└── content/           # Content-related images
```

## 🎯 Purpose

- **Logos**: Protocol branding and company logos
- **Icons**: Custom icons not available in icon libraries
- **Backgrounds**: Background images, patterns, and textures
- **UI Graphics**: Interface elements, buttons, and visual components
- **Content Images**: Images related to trading, blockchain, and DeFi

## 🆕 Current Assets

### **Logos:**
- **`avila-circular-logo.svg`** - Main circular logo featuring wave-like elements and bird silhouette
- **`avila-text-logo.svg`** - Stylized AVILA text with teal-to-lime gradient
- **`avila-favicon.svg`** - Favicon version optimized for small sizes
- **`Avilatokenlogo.jpg`** - Avila token logo used in testnet banners and warnings
- **`Avilatext.jpg`** - Avila text logo in JPG format

### **Icons:**
- **`options-icon.svg`** - Options trading icon with chart line and call/put arrows

### **UI Graphics:**
- **`trading-chart-bg.svg`** - Subtle grid background pattern for trading charts

## 📱 Usage in Components

### **Import Images:**
```tsx
import circularLogo from '../assets/images/logos/avila-circular-logo.svg';
import textLogo from '../assets/images/logos/avila-text-logo.svg';
import favicon from '../assets/images/logos/avila-favicon.svg';
import tokenLogo from '../assets/images/logos/Avilatokenlogo.jpg';
import optionsIcon from '../assets/images/icons/options-icon.svg';
import chartBg from '../assets/images/ui/trading-chart-bg.svg';
```

### **Use in Components:**
```tsx
// Logo usage
<img src={circularLogo} alt="Avila Protocol Logo" className="w-16 h-16" />
<img src={textLogo} alt="Avila Protocol" className="h-8" />
<img src={tokenLogo} alt="Avila Protocol Logo" className="w-8 h-8 rounded-full" />

// Icon usage
<img src={optionsIcon} alt="Options Trading" className="w-6 h-6" />

// Background usage
<div style={{ backgroundImage: `url(${chartBg})` }}>
  {/* Trading chart content */}
</div>
```

### **Favicon Setup:**
```tsx
// In your index.html
<link rel="icon" type="image/svg+xml" href="/src/assets/images/logos/avila-favicon.svg" />
```

## 🚀 Best Practices

### **File Formats:**
- **PNG**: For logos, icons, and images with transparency
- **JPG/JPEG**: For photographs and complex images
- **SVG**: For scalable icons and simple graphics (recommended for logos)
- **WebP**: For modern browsers (with fallbacks)

### **Naming Convention:**
- Use **kebab-case** for file names
- Be **descriptive** and **specific**
- Include **dimensions** if relevant
- Example: `avila-circular-logo.svg`

### **Optimization:**
- **Compress images** before adding to the folder
- Use **appropriate dimensions** for the intended use
- Consider **responsive images** for different screen sizes
- **Lazy load** large images when possible
- **SVG is preferred** for logos and icons (scalable, small file size)

## 🎨 Design System

### **Color Palette:**
- **Primary Green**: `#0f4c3a` (Dark teal)
- **Secondary Green**: `#1a7a6b` (Medium teal)
- **Accent Green**: `#2d9d8a` (Light teal)
- **Bright Green**: `#32d74b` (Lime green)
- **Neutral**: `#6b7280` (Gray)

### **Logo Variations:**
- **Circular Logo**: Use for app icons, profile pictures, and branding
- **Text Logo**: Use for headers, navigation, and horizontal layouts
- **Favicon**: Use for browser tabs and bookmarks
- **Token Logo**: Use for testnet banners, warnings, and small branding elements

## 🔄 Adding New Images

1. **Place image file** in appropriate subfolder
2. **Update this README** with new asset information
3. **Import and use** in your React components
4. **Commit changes** to git

## 📚 Resources

- [Image Optimization Guide](https://web.dev/fast/#optimize-your-images)
- [SVG Best Practices](https://css-tricks.com/optimizing-svgs-for-web/)
- [Responsive Images](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)
- [Favicon Generator](https://realfavicongenerator.net/) 