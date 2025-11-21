/**
 * All Variants Test
 * Shows all 18 processed variants
 */

export default function AllVariantsTest() {
  const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/storehouse-67e67.firebasestorage.app/o/';
  const hash = '0a65e6ea2b634367';

  // All 18 variants
  const variants = [
    { size: '400w', format: 'avif' },
    { size: '400w', format: 'webp' },
    { size: '400w', format: 'jpeg' },
    { size: '800w', format: 'avif' },
    { size: '800w', format: 'webp' },
    { size: '800w', format: 'jpeg' },
    { size: '1200w', format: 'avif' },
    { size: '1200w', format: 'webp' },
    { size: '1200w', format: 'jpeg' },
    { size: '1600w', format: 'avif' },
    { size: '1600w', format: 'webp' },
    { size: '1600w', format: 'jpeg' },
    { size: '2000w', format: 'avif' },
    { size: '2000w', format: 'webp' },
    { size: '2000w', format: 'jpeg' },
    { size: '2400w', format: 'avif' },
    { size: '2400w', format: 'webp' },
    { size: '2400w', format: 'jpeg' },
  ];

  const getImageUrl = (size: string, format: string) => {
    const path = `products%2Fvariants%2F${hash}%2Ftest%20jpg-${size}.${format}`;
    return `${baseUrl}${path}?alt=media`;
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>🎨 All 18 Enhanced Variants</h1>

      <p style={{ marginBottom: '30px', color: '#666' }}>
        Your <strong>test.jpg</strong> was automatically processed into 18 optimized variants:
      </p>

      <div style={{
        marginBottom: '40px',
        padding: '20px',
        backgroundColor: '#f0f9ff',
        borderRadius: '8px',
        border: '1px solid #0ea5e9'
      }}>
        <strong>🔑 Content Hash:</strong> <code style={{
          backgroundColor: '#e0f2fe',
          padding: '4px 8px',
          borderRadius: '4px',
          fontFamily: 'monospace'
        }}>{hash}</code>
        <br/><br/>
        <strong>✨ Enhancements Applied:</strong>
        <ul style={{ marginTop: '10px' }}>
          <li>Filmic tone curve (shadow lift, highlight protection)</li>
          <li>Color enhancement (vibrance, saturation, dehaze)</li>
          <li>Adaptive sharpening (scales with size)</li>
          <li>Professional compression (AVIF 50%, WebP 82%, JPEG 86%)</li>
        </ul>
      </div>

      {/* Size groups */}
      {['400w', '800w', '1200w', '1600w', '2000w', '2400w'].map(size => (
        <div key={size} style={{ marginBottom: '60px' }}>
          <h2 style={{ marginBottom: '20px' }}>
            📐 {size.replace('w', '')}px Width
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {['avif', 'webp', 'jpeg'].map(format => (
              <div key={format} style={{
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: '#fafafa'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '10px',
                  color: '#374151'
                }}>
                  {format.toUpperCase()}
                  {format === 'avif' && ' 🏆'}
                  {format === 'webp' && ' ⚡'}
                  {format === 'jpeg' && ' 🔄'}
                </div>
                <img
                  src={getImageUrl(size, format)}
                  alt={`${size} ${format}`}
                  style={{
                    width: '100%',
                    borderRadius: '4px',
                    display: 'block'
                  }}
                  onLoad={() => console.log(`✅ Loaded: ${size}.${format}`)}
                  onError={() => console.error(`❌ Failed: ${size}.${format}`)}
                />
                <div style={{
                  fontSize: '12px',
                  marginTop: '8px',
                  color: '#6b7280',
                  fontFamily: 'monospace'
                }}>
                  test jpg-{size}.{format}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div style={{
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#fef3c7',
        borderRadius: '8px'
      }}>
        <strong>📊 Format Comparison:</strong>
        <ul style={{ marginTop: '10px' }}>
          <li><strong>🏆 AVIF:</strong> Best compression (60-80% smaller than JPEG) - Modern browsers</li>
          <li><strong>⚡ WebP:</strong> Great compression (30-50% smaller) - Wide support</li>
          <li><strong>🔄 JPEG:</strong> Universal fallback - Works everywhere</li>
        </ul>
      </div>
    </div>
  );
}
