import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, BookOpen, Clock, ChevronRight, Star, TrendingUp } from 'lucide-react';
import { DOCUMENTATION } from '../data/documentation';
import { Documentation } from '../types/documentation';
import DocViewer from '../components/DocViewer';

/**
 * Help Center - Browse all documentation
 * Beautiful, searchable knowledge base for users
 */
export default function HelpCenter() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<Documentation | null>(null);

  // Category information
  const categories = [
    { id: 'all', label: 'All Guides', icon: '📚', count: DOCUMENTATION.length },
    { id: 'getting-started', label: 'Getting Started', icon: '🚀', count: DOCUMENTATION.filter(d => d.category === 'getting-started').length },
    { id: 'products', label: 'Products', icon: '📦', count: DOCUMENTATION.filter(d => d.category === 'products').length },
    { id: 'sales', label: 'Sales & Revenue', icon: '💰', count: DOCUMENTATION.filter(d => d.category === 'sales').length },
    { id: 'staff', label: 'Staff', icon: '👥', count: DOCUMENTATION.filter(d => d.category === 'staff').length },
    { id: 'reports', label: 'Reports', icon: '📊', count: DOCUMENTATION.filter(d => d.category === 'reports').length },
    { id: 'settings', label: 'Settings', icon: '⚙️', count: DOCUMENTATION.filter(d => d.category === 'settings').length },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: '🔧', count: DOCUMENTATION.filter(d => d.category === 'troubleshooting').length },
    { id: 'advanced', label: 'Advanced', icon: '🎯', count: DOCUMENTATION.filter(d => d.category === 'advanced').length },
  ];

  // Filter and search documentation
  const filteredDocs = useMemo(() => {
    let docs = DOCUMENTATION;

    // Filter by category
    if (selectedCategory !== 'all') {
      docs = docs.filter(doc => doc.category === selectedCategory);
    }

    // Search by query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      docs = docs.filter(doc =>
        doc.title.toLowerCase().includes(query) ||
        doc.description.toLowerCase().includes(query) ||
        doc.keywords.some(k => k.toLowerCase().includes(query))
      );
    }

    // Sort by priority (high to low)
    return docs.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }, [searchQuery, selectedCategory]);

  // Popular/Featured guides (high priority)
  const popularGuides = useMemo(() => {
    return DOCUMENTATION
      .filter(doc => (doc.priority || 0) >= 85)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, 6);
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#10b981'; // green
      case 'intermediate': return '#f59e0b'; // orange
      case 'advanced': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'getting-started': '#8b5cf6',
      'products': '#3b82f6',
      'sales': '#10b981',
      'staff': '#f59e0b',
      'reports': '#06b6d4',
      'settings': '#6b7280',
      'troubleshooting': '#ef4444',
      'advanced': '#ec4899',
    };
    return colors[category] || '#6b7280';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '24px 16px',
        color: '#fff'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer',
              marginBottom: '24px'
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 8px 0' }}>
            Help Center
          </h1>
          <p style={{ fontSize: '16px', opacity: 0.9, margin: 0 }}>
            Everything you need to succeed with Storehouse
          </p>

          {/* Search bar */}
          <div style={{ marginTop: '24px', position: 'relative' }}>
            <Search
              size={20}
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }}
            />
            <input
              type="text"
              placeholder="Search for help... (e.g., 'add product', 'record sale')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px 14px 48px',
                fontSize: '16px',
                border: 'none',
                borderRadius: '12px',
                outline: 'none',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Popular Guides Section */}
        {!searchQuery && selectedCategory === 'all' && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Star size={20} color="#f59e0b" fill="#f59e0b" />
              <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
                Popular Guides
              </h2>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px'
            }}>
              {popularGuides.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  style={{
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    border: '2px solid #e5e7eb',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = getCategoryColor(doc.category);
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Category badge */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: getCategoryColor(doc.category),
                    color: '#fff',
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    {doc.category.replace('-', ' ')}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <TrendingUp size={20} color={getCategoryColor(doc.category)} />
                    <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, paddingRight: '80px' }}>
                      {doc.title}
                    </h3>
                  </div>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                    {doc.subtitle}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#9ca3af' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} />
                      {doc.estimatedTime}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: `${getDifficultyColor(doc.difficulty)}22`,
                      color: getDifficultyColor(doc.difficulty),
                      fontWeight: '600'
                    }}>
                      {doc.difficulty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          marginBottom: '24px',
          paddingBottom: '8px'
        }}>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: selectedCategory === cat.id ? '#667eea' : '#fff',
                color: selectedCategory === cat.id ? '#fff' : '#374151',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                boxShadow: selectedCategory === cat.id ? '0 4px 6px rgba(102, 126, 234, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span style={{
                background: selectedCategory === cat.id ? 'rgba(255, 255, 255, 0.3)' : '#f3f4f6',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Results count */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            {filteredDocs.length} {filteredDocs.length === 1 ? 'guide' : 'guides'} found
          </p>
        </div>

        {/* Documentation List */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px'
        }}>
          {filteredDocs.map(doc => (
            <div
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                border: '1px solid #e5e7eb',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = getCategoryColor(doc.category);
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={20} color={getCategoryColor(doc.category)} />
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: getCategoryColor(doc.category),
                    textTransform: 'uppercase'
                  }}>
                    {doc.category.replace('-', ' ')}
                  </span>
                </div>
                <ChevronRight size={20} color="#d1d5db" />
              </div>

              {/* Content */}
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 6px 0', color: '#111827' }}>
                  {doc.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, lineHeight: '1.6' }}>
                  {doc.description}
                </p>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#9ca3af' }}>
                  <Clock size={14} />
                  {doc.estimatedTime}
                </div>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: `${getDifficultyColor(doc.difficulty)}22`,
                  color: getDifficultyColor(doc.difficulty)
                }}>
                  {doc.difficulty}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* No results */}
        {filteredDocs.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: '#fff',
            borderRadius: '12px',
            border: '2px dashed #e5e7eb'
          }}>
            <Search size={48} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', color: '#374151' }}>
              No guides found
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              Try adjusting your search or category filter
            </p>
          </div>
        )}
      </div>

      {/* DocViewer Modal */}
      {selectedDoc && (
        <DocViewer
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </div>
  );
}
