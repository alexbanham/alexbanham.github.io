# GitHub.io Site Performance Improvements

## Current Issues Identified

### 🔴 Critical Issues

1. **Video File Size: 81.76 MB**
   - The hero video (`SD BG Footage.mp4`) is extremely large
   - Takes several seconds to load even on fast connections
   - On slower connections or mobile, this creates a poor user experience
   - **Impact**: High bounce rate, poor Core Web Vitals (LCP)

2. **No Image Lazy Loading**
   - Project images load immediately, even when below the fold
   - Wastes bandwidth and slows initial page load

3. **No Video Poster Image**
   - Users see blank/loading state while video loads
   - No visual feedback during the 3-5 second load time

### 🟡 Medium Priority Issues

4. **Image Format Optimization**
   - PNG files (0.39MB, 0.1MB) could be converted to WebP (typically 30-50% smaller)
   - JPG (0.8MB) could be further compressed
   - No modern format fallbacks (WebP/AVIF)

5. **No Image Dimensions Specified**
   - Missing `width` and `height` attributes on images
   - Causes layout shift (CLS) as images load

6. **Video Format Optimization**
   - Only MP4 format provided
   - No WebM alternative (often smaller, better compression)
   - No multiple quality options

### 🟢 Low Priority / Nice to Have

7. **Font Loading**
   - Could add `font-display: swap` for faster text rendering
   - Currently using Google Fonts with preconnect (good)

8. **Resource Hints**
   - Could add `preload` for critical resources
   - Could add `dns-prefetch` for external domains

---

## Recommended Solutions

### 1. Video Optimization (HIGHEST PRIORITY)

**Option A: Compress the Video (Recommended)**
- Re-encode video to reduce size by 80-90%
- Target: 5-10MB instead of 81.76MB
- Use H.264 codec with optimized settings
- Reduce resolution if needed (1080p → 720p often sufficient)
- Reduce frame rate if high (30fps is usually enough)
- Tools: FFmpeg, HandBrake, or online tools like CloudConvert

**Option B: Replace with Animated Background**
- Use CSS animations or the existing WebGL canvas
- Remove video entirely
- Pros: Instant load, no bandwidth concerns
- Cons: Less dynamic visual

**Option C: Use External Video Hosting**
- Upload to YouTube (unlisted) or Vimeo
- Embed with their player (handles compression/streaming)
- Pros: Better compression, adaptive streaming
- Cons: External dependency, potential branding

**Option D: Multiple Video Qualities**
- Create 3 versions: high (1080p), medium (720p), low (480p)
- Use JavaScript to detect connection speed
- Load appropriate quality based on network

**Recommended Approach**: **Option A + Poster Image**
- Compress video to ~5-8MB
- Add a poster image (first frame or custom)
- Keep existing lazy-loading logic

### 2. Image Optimization

**Actions:**
1. Convert PNGs to WebP format with PNG fallback
2. Compress JPG further (aim for 60-70% quality)
3. Add `loading="lazy"` to all below-fold images
4. Add explicit `width` and `height` attributes
5. Use `<picture>` element for format fallbacks

**Example:**
```html
<picture>
  <source srcset="./media/fantasyapp.webp" type="image/webp">
  <img src="./media/fantasyapppng.PNG" 
       alt="..." 
       width="800" 
       height="450"
       loading="lazy">
</picture>
```

### 3. Add Video Poster Image

**Action:**
- Extract first frame from video or create custom poster
- Add `poster` attribute to video element
- Shows immediately while video loads

```html
<video poster="./media/video-poster.jpg" ...>
```

### 4. Implement Image Lazy Loading

**Action:**
- Add `loading="lazy"` to project card images
- Already supported in modern browsers
- Polyfill available for older browsers if needed

### 5. Add Image Dimensions

**Action:**
- Measure actual image dimensions
- Add `width` and `height` attributes
- Prevents Cumulative Layout Shift (CLS)

---

## Implementation Priority

### Phase 1: Critical (Do First)
1. ✅ Compress video to 5-10MB
2. ✅ Add video poster image
3. ✅ Add lazy loading to images
4. ✅ Add image dimensions

### Phase 2: Important (Do Next)
5. ✅ Convert images to WebP with fallbacks
6. ✅ Further compress JPG
7. ✅ Add font-display: swap

### Phase 3: Optimization (Nice to Have)
8. ⚪ Add WebM video format alternative
9. ⚪ Implement responsive images (srcset)
10. ⚪ Add resource hints (preload, dns-prefetch)

---

## Tools & Resources

### Video Compression
- **FFmpeg** (command line): `ffmpeg -i input.mp4 -vcodec h264 -crf 28 -preset slow output.mp4`
- **HandBrake** (GUI): Free, open-source
- **CloudConvert** (online): No installation needed
- **Target settings**: H.264, CRF 28-30, 720p or 1080p, 30fps

### Image Optimization
- **Squoosh** (online): Google's image compression tool
- **ImageOptim** (Mac) / **FileOptimizer** (Windows)
- **Sharp** (Node.js): For batch processing
- **cwebp** (command line): Convert to WebP

### Testing
- **PageSpeed Insights**: https://pagespeed.web.dev/
- **WebPageTest**: https://www.webpagetest.org/
- **Chrome DevTools**: Network tab, Lighthouse

---

## Expected Results

After implementing Phase 1:
- **Initial Load Time**: 2-3 seconds → <1 second
- **Video Load Time**: 5-10 seconds → 1-2 seconds
- **Total Page Weight**: ~83MB → ~10-15MB
- **LCP (Largest Contentful Paint)**: Significantly improved
- **CLS (Cumulative Layout Shift)**: Reduced to near zero

---

## GitHub Pages Limitations

✅ **Works on GitHub Pages:**
- Static file hosting (all media files)
- HTML/CSS/JS optimizations
- Lazy loading attributes
- Modern image formats (WebP, AVIF)
- Video compression

❌ **Doesn't Work on GitHub Pages:**
- Server-side processing
- Dynamic compression
- Custom headers/CORS
- Service Workers (limited support)

---

## Next Steps

1. Review this document
2. Choose video optimization approach (I recommend Option A)
3. I can help implement:
   - Image lazy loading
   - Image dimensions
   - WebP conversion (if you provide optimized images)
   - Video poster image setup
   - Code optimizations

Let me know which improvements you'd like to tackle first!

