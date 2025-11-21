/**
 * Direct Image Test
 * Tests images using direct Firebase Storage URLs
 */

export default function DirectImageTest() {
  // Direct URLs from your Firebase Storage
  const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/storehouse-67e67.firebasestorage.app/o/';

  // Encode the path: products/variants/0a65e6ea2b634367/test jpg-800w.jpeg
  const imagePath = 'products%2Fvariants%2F0a65e6ea2b634367%2Ftest%20jpg-800w.jpeg';
  const imageUrl = `${baseUrl}${imagePath}?alt=media`;

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🔧 Direct Image Test</h1>

      <p style={{ marginBottom: '30px', color: '#666' }}>
        Testing direct access to your processed images
      </p>

      {/* Test 1: Direct JPEG */}
      <div style={{ marginBottom: '40px' }}>
        <h2>Test 1: Direct Storage URL (800w JPEG)</h2>
        <img
          src={imageUrl}
          alt="Direct test"
          style={{ maxWidth: '100%', border: '2px solid #e5e7eb', borderRadius: '8px' }}
          onLoad={() => console.log('✅ Image loaded successfully!')}
          onError={(e) => console.error('❌ Image failed to load:', e)}
        />
      </div>

      {/* Image URL for reference */}
      <div style={{
        marginTop: '20px',
        padding: '20px',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        wordBreak: 'break-all'
      }}>
        <strong>Image URL:</strong><br />
        {imageUrl}
      </div>

      <div style={{
        marginTop: '20px',
        padding: '20px',
        backgroundColor: '#fef3c7',
        borderRadius: '8px'
      }}>
        <strong>🔍 Troubleshooting:</strong>
        <ol style={{ marginTop: '10px' }}>
          <li>Check browser console (F12) for errors</li>
          <li>If you see the image, the variants were created successfully</li>
          <li>If you see a broken image, check Firebase Storage permissions</li>
        </ol>
      </div>
    </div>
  );
}
