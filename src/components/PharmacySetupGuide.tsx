/**
 * Pharmacy Setup Guide
 * 6-step guide for setting up barcode scanning in pharmaceutical stores
 * Automatically shown when user selects "Pharmacy & Health" business type
 */

import React, { useState } from 'react';
import { X, Check, ExternalLink } from 'lucide-react';
import './PharmacySetupGuide.css';

interface PharmacySetupGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    number: 1,
    title: 'Get a Barcode Scanner',
    icon: '🛒',
    content: (
      <>
        <p><strong>What you need:</strong> USB Barcode Scanner</p>
        <p><strong>Price:</strong> ₦15,000 - ₦50,000 (one-time cost)</p>

        <div className="guide-options">
          <h4>Recommended Scanners:</h4>
          <ul>
            <li>✅ <strong>Honeywell Voyager 1200g</strong> - ₦45,000 (Professional)</li>
            <li>✅ <strong>Zebra DS2208</strong> - ₦35,000 (Mid-range)</li>
            <li>✅ <strong>Generic USB Scanner</strong> - ₦15,000 (Budget-friendly)</li>
          </ul>
        </div>

        <div className="guide-tip">
          <strong>💡 Where to Buy:</strong>
          <ul>
            <li>Computer Village (Lagos)</li>
            <li>Slot Systems</li>
            <li>Pointek</li>
            <li>Jumia / Konga (online)</li>
          </ul>
        </div>

        <div className="guide-note">
          <strong>Alternative:</strong> You can also use your smartphone camera with barcode scanner apps (free), but USB scanners are faster for daily use.
        </div>
      </>
    )
  },
  {
    number: 2,
    title: 'Connect Your Scanner',
    icon: '🔌',
    content: (
      <>
        <p><strong>It's super easy - just plug and play!</strong></p>

        <div className="guide-steps">
          <div className="step-item">
            <span className="step-badge">1</span>
            <div>Plug the USB cable into your laptop/desktop</div>
          </div>
          <div className="step-item">
            <span className="step-badge">2</span>
            <div>Windows/Mac will automatically install the driver (no software needed)</div>
          </div>
          <div className="step-item">
            <span className="step-badge">3</span>
            <div>Test it: Open Notepad and scan any barcode</div>
          </div>
          <div className="step-item">
            <span className="step-badge">4</span>
            <div>You should see numbers appear automatically - that's it! ✓</div>
          </div>
        </div>

        <div className="guide-tip">
          <strong>💡 Pro Tip:</strong> The scanner works like a keyboard - it types the barcode numbers automatically and presses Enter.
        </div>
      </>
    )
  },
  {
    number: 3,
    title: 'Add Your First Medicine',
    icon: '💊',
    content: (
      <>
        <p><strong>Let's add a product with barcode scanning:</strong></p>

        <div className="guide-steps">
          <div className="step-item">
            <span className="step-badge">1</span>
            <div>Click <strong>"Add Item"</strong> button on your dashboard</div>
          </div>
          <div className="step-item">
            <span className="step-badge">2</span>
            <div>In the form, scroll to <strong>"Barcode / SKU"</strong> field</div>
          </div>
          <div className="step-item">
            <span className="step-badge">3</span>
            <div>Click inside the barcode field</div>
          </div>
          <div className="step-item">
            <span className="step-badge">4</span>
            <div><strong>Scan the medicine barcode</strong> - numbers appear automatically</div>
          </div>
          <div className="step-item">
            <span className="step-badge">5</span>
            <div>Enter product name: <em>"Paracetamol 500mg Tablets"</em></div>
          </div>
          <div className="step-item">
            <span className="step-badge">6</span>
            <div>Fill in quantity and prices</div>
          </div>
          <div className="step-item">
            <span className="step-badge">7</span>
            <div>Click <strong>"Save Item"</strong></div>
          </div>
        </div>

        <div className="guide-example">
          <strong>Example:</strong>
          <div className="example-box">
            <div className="example-field">
              <label>Barcode:</label>
              <code>8901234567890</code>
            </div>
            <div className="example-field">
              <label>Product Name:</label>
              <span>Paracetamol 500mg Tablets</span>
            </div>
            <div className="example-field">
              <label>Quantity:</label>
              <span>100 tablets</span>
            </div>
          </div>
        </div>
      </>
    )
  },
  {
    number: 4,
    title: 'Make Your First Sale',
    icon: '💳',
    content: (
      <>
        <p><strong>Selling is even easier than adding stock!</strong></p>

        <div className="guide-steps">
          <div className="step-item">
            <span className="step-badge">1</span>
            <div>Customer requests a medicine</div>
          </div>
          <div className="step-item">
            <span className="step-badge">2</span>
            <div>Click <strong>"Record Sale"</strong> button</div>
          </div>
          <div className="step-item">
            <span className="step-badge">3</span>
            <div>In the search box, <strong>scan the medicine barcode</strong></div>
          </div>
          <div className="step-item">
            <span className="step-badge">4</span>
            <div>Product appears instantly ⚡</div>
          </div>
          <div className="step-item">
            <span className="step-badge">5</span>
            <div>Enter quantity sold (e.g., 2 packs)</div>
          </div>
          <div className="step-item">
            <span className="step-badge">6</span>
            <div>Click <strong>"Complete Sale"</strong></div>
          </div>
        </div>

        <div className="guide-tip">
          <strong>⚡ Speed Comparison:</strong>
          <ul>
            <li><strong>Manual typing:</strong> 30-45 seconds per sale</li>
            <li><strong>With barcode:</strong> 5 seconds per sale (10x faster!)</li>
          </ul>
        </div>

        <div className="guide-note">
          <strong>Multiple Items:</strong> Selling a prescription with 5 medicines? Just scan each barcode one by one. Add to cart. Done!
        </div>
      </>
    )
  },
  {
    number: 5,
    title: 'Daily Workflow Tips',
    icon: '📋',
    content: (
      <>
        <p><strong>Make barcode scanning part of your routine:</strong></p>

        <div className="workflow-section">
          <h4>🌅 Morning Routine:</h4>
          <ul>
            <li>Receive delivery from supplier</li>
            <li>Scan each medicine barcode while unpacking</li>
            <li>Add to inventory (30 seconds per product)</li>
            <li><strong>Result:</strong> 100 products stocked in 30 minutes!</li>
          </ul>
        </div>

        <div className="workflow-section">
          <h4>☀️ During the Day:</h4>
          <ul>
            <li>Customer requests medicine</li>
            <li>Pick from shelf → Scan at counter → Complete sale</li>
            <li>Each sale: 5 seconds</li>
            <li><strong>Result:</strong> Serve 6x more customers!</li>
          </ul>
        </div>

        <div className="workflow-section">
          <h4>🌙 Evening Routine:</h4>
          <ul>
            <li>Quick stock check before closing</li>
            <li>Scan medicines on shelf to verify quantities</li>
            <li>Update any discrepancies</li>
            <li><strong>Result:</strong> Full stock count in 20 minutes!</li>
          </ul>
        </div>

        <div className="guide-tip">
          <strong>💰 Time Savings:</strong>
          <ul>
            <li>Before: 20 hours/month on inventory tasks</li>
            <li>After: 2 hours/month (90% time saved!)</li>
            <li><strong>Value:</strong> ₦90,000+/month in saved labor</li>
          </ul>
        </div>
      </>
    )
  },
  {
    number: 6,
    title: 'Pro Tips for Success',
    icon: '🏆',
    content: (
      <>
        <p><strong>Get the most out of barcode scanning:</strong></p>

        <div className="pro-tips">
          <div className="tip-card">
            <div className="tip-icon">📦</div>
            <div className="tip-content">
              <h4>Batch Number Tracking</h4>
              <p>Use the <strong>Description field</strong> to store batch numbers and expiry dates for medicines.</p>
              <p className="tip-example">Example: "Batch: AB1234, Exp: Dec 2025"</p>
            </div>
          </div>

          <div className="tip-card">
            <div className="tip-icon">🔍</div>
            <div className="tip-content">
              <h4>Manual Search Still Works</h4>
              <p>Don't have your scanner? You can still type the barcode number manually in the search box.</p>
            </div>
          </div>

          <div className="tip-card">
            <div className="tip-icon">📱</div>
            <div className="tip-content">
              <h4>Mobile Backup</h4>
              <p>Keep a barcode scanner app on your phone as backup for when you're away from the counter.</p>
            </div>
          </div>

          <div className="tip-card">
            <div className="tip-icon">⚡</div>
            <div className="tip-content">
              <h4>Low Stock Alerts</h4>
              <p>Set reorder levels for critical medicines. Storehouse will alert you before stock runs out.</p>
            </div>
          </div>

          <div className="tip-card">
            <div className="tip-icon">💊</div>
            <div className="tip-content">
              <h4>Medicine Categories</h4>
              <p>Organize by category: Antibiotics, Painkillers, Vitamins, etc. Makes inventory management easier.</p>
            </div>
          </div>

          <div className="tip-card">
            <div className="tip-icon">🎓</div>
            <div className="tip-content">
              <h4>Train Your Staff</h4>
              <p>Show your staff this guide. Barcode scanning is so easy, they'll learn in 5 minutes!</p>
            </div>
          </div>
        </div>

        <div className="guide-success">
          <h4>🎉 You're All Set!</h4>
          <p>You now have a professional pharmacy inventory system with barcode scanning - just like the big chains!</p>
          <p><strong>Need help?</strong> Contact support or check our help center.</p>
        </div>
      </>
    )
  }
];

export function PharmacySetupGuide({ isOpen, onClose }: PharmacySetupGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  if (!isOpen) return null;

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleMarkComplete = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
  };

  const currentStepData = STEPS[currentStep];
  const progress = ((completedSteps.size / STEPS.length) * 100);

  return (
    <div className="pharmacy-guide-overlay">
      <div className="pharmacy-guide-modal">
        {/* Header */}
        <div className="pharmacy-guide-header">
          <div className="pharmacy-guide-title">
            <span className="pharmacy-icon">💊</span>
            <div>
              <h2>Pharmacy Setup Guide</h2>
              <p className="pharmacy-subtitle">6 steps to set up barcode scanning for your pharmacy</p>
            </div>
          </div>
          <button onClick={onClose} className="pharmacy-guide-close" aria-label="Close guide">
            <X size={24} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="pharmacy-guide-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-text">
            {completedSteps.size} of {STEPS.length} steps completed
          </div>
        </div>

        {/* Step navigation */}
        <div className="pharmacy-guide-steps">
          {STEPS.map((step, index) => (
            <button
              key={index}
              onClick={() => handleStepClick(index)}
              className={`step-button ${currentStep === index ? 'active' : ''} ${completedSteps.has(index) ? 'completed' : ''}`}
            >
              <div className="step-number">
                {completedSteps.has(index) ? (
                  <Check size={16} />
                ) : (
                  step.number
                )}
              </div>
              <div className="step-title">{step.title}</div>
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="pharmacy-guide-content">
          <div className="step-header">
            <span className="step-icon">{currentStepData.icon}</span>
            <h3>Step {currentStepData.number}: {currentStepData.title}</h3>
          </div>
          <div className="step-content">
            {currentStepData.content}
          </div>
        </div>

        {/* Footer actions */}
        <div className="pharmacy-guide-footer">
          <div className="footer-left">
            {currentStep > 0 && (
              <button onClick={handlePrevious} className="btn-secondary">
                ← Previous
              </button>
            )}
          </div>
          <div className="footer-right">
            {!completedSteps.has(currentStep) && (
              <button onClick={handleMarkComplete} className="btn-outline">
                Mark Complete
              </button>
            )}
            {currentStep < STEPS.length - 1 ? (
              <button onClick={handleNext} className="btn-primary">
                Next Step →
              </button>
            ) : (
              <button onClick={onClose} className="btn-success">
                Done! Start Using Storehouse
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
