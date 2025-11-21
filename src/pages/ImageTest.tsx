/**
 * Image Enhancement Test Page
 *
 * Quick test to see your enhanced images working!
 */

import { SmartPicture } from '../components/SmartPicture';

export default function ImageTest() {
  // This is the content hash from your uploaded image (test.jpg)
  const testImageHash = '0a65e6ea2b634367';

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>🎨 Smart Image Enhancement Test</h1>

      <p style={{ marginBottom: '30px', color: '#666' }}>
        Testing the advanced image enhancement system with 18 variants (6 sizes × 3 formats)
      </p>

      {/* Test 1: Full width */}
      <div style={{ marginBottom: '60px' }}>
        <h2 style={{ marginBottom: '15px' }}>Test 1: Full Width (Responsive)</h2>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '10px' }}>
          Browser will automatically choose the best format (AVIF → WebP → JPEG) and size
        </p>
        <SmartPicture
          contentHash={testImageHash}
          alt="Enhanced Product Image - Full Width"
          className="test-image-full"
        />
      </div>

      {/* Test 2: Grid layout */}
      <div style={{ marginBottom: '60px' }}>
        <h2 style={{ marginBottom: '15px' }}>Test 2: Grid Layout</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '10px' }}>400px variant</p>
            <SmartPicture
              contentHash={testImageHash}
              alt="Enhanced Product - Small"
              width={400}
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </div>
          <div>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '10px' }}>800px variant</p>
            <SmartPicture
              contentHash={testImageHash}
              alt="Enhanced Product - Medium"
              width={800}
              sizes="(max-width: 768px) 100vw, 800px"
            />
          </div>
          <div>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '10px' }}>1200px variant</p>
            <SmartPicture
              contentHash={testImageHash}
              alt="Enhanced Product - Large"
              width={1200}
              sizes="(max-width: 768px) 100vw, 1200px"
            />
          </div>
        </div>
      </div>

      {/* Test 3: Compare original vs enhanced */}
      <div style={{ marginBottom: '60px' }}>
        <h2 style={{ marginBottom: '15px' }}>Test 3: Professional Enhancements Applied ✨</h2>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '10px' }}>
          Filmic tone curve, color enhancement, adaptive sharpening, and blur-up effect
        </p>
        <SmartPicture
          contentHash={testImageHash}
          alt="Enhanced Product with Professional Processing"
          width={1600}
          priority={true}
        />
      </div>

      {/* Info Section */}
      <div style={{
        marginTop: '60px',
        padding: '30px',
        backgroundColor: '#f0f9ff',
        borderRadius: '8px',
        border: '1px solid #0ea5e9'
      }}>
        <h3 style={{ marginBottom: '15px', color: '#0369a1' }}>✅ What Just Happened:</h3>
        <ul style={{ lineHeight: '1.8', color: '#0c4a6e' }}>
          <li>✨ <strong>18 variants</strong> automatically generated (6 sizes × 3 formats)</li>
          <li>🎨 <strong>Professional enhancements</strong> applied (tone curves, sharpening, color correction)</li>
          <li>⚡ <strong>AVIF format</strong> served to modern browsers (60-80% smaller)</li>
          <li>🖼️ <strong>WebP fallback</strong> for Safari and older browsers</li>
          <li>📱 <strong>Responsive</strong> - perfect size for every screen</li>
          <li>🌊 <strong>Blur-up effect</strong> for smooth loading</li>
          <li>🚀 <strong>CDN-ready</strong> with 1-year cache</li>
        </ul>

        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '4px' }}>
          <strong>Content Hash:</strong> <code style={{
            backgroundColor: '#e0f2fe',
            padding: '4px 8px',
            borderRadius: '4px',
            fontFamily: 'monospace'
          }}>{testImageHash}</code>
        </div>
      </div>

      {/* Open DevTools hint */}
      <div style={{
        marginTop: '20px',
        padding: '20px',
        backgroundColor: '#fef3c7',
        borderRadius: '8px',
        border: '1px solid #f59e0b'
      }}>
        <strong>💡 Pro Tip:</strong> Open DevTools (F12) → Network tab → Reload page →
        Check the image that loaded. You'll see it served <strong>AVIF or WebP</strong> format
        at the perfect size for your screen!
      </div>
    </div>
  );
}
