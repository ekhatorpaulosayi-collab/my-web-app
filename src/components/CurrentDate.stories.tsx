import type { Meta, StoryObj } from '@storybook/react';
import CurrentDate from './CurrentDate';

/**
 * CurrentDate displays the current date in a long, readable format.
 *
 * Features:
 * - SSR-safe (no hydration warnings)
 * - Auto-refreshes at midnight
 * - Respects locale and timezone
 * - Accessible with semantic HTML
 */
const meta = {
  title: 'Components/CurrentDate',
  component: CurrentDate,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A date display component that shows the current date in "Tuesday, October 28, 2025" format. Automatically updates at midnight and respects user locale.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    locale: {
      control: 'text',
      description: 'Locale for date formatting (e.g., "en-US", "en-GB")',
      table: {
        defaultValue: { summary: 'en-US' }
      }
    },
    className: {
      control: 'text',
      description: 'CSS classes to apply to the time element'
    },
    style: {
      control: 'object',
      description: 'Inline styles to apply to the time element'
    }
  }
} satisfies Meta<typeof CurrentDate>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default date display with US English formatting
 */
export const Default: Story = {
  args: {}
};

/**
 * Date with custom styling to match header text
 */
export const HeaderStyle: Story = {
  args: {
    className: 'date-display'
  },
  decorators: [
    (Story) => (
      <div style={{
        padding: '20px',
        background: '#2063F0',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          fontSize: '24px',
          fontWeight: '600',
          marginBottom: '8px'
        }}>
          Storehouse
        </div>
        <Story />
      </div>
    )
  ]
};

/**
 * Date with small, muted styling
 */
export const Small: Story = {
  args: {
    style: {
      fontSize: '14px',
      color: '#6B778C'
    }
  }
};

/**
 * Date with large, prominent styling
 */
export const Large: Story = {
  args: {
    style: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#0F172A'
    }
  }
};

/**
 * Date with British English formatting
 */
export const BritishEnglish: Story = {
  args: {
    locale: 'en-GB'
  }
};

/**
 * Date in a card layout
 */
export const InCard: Story = {
  args: {
    className: 'text-sm text-gray-600'
  },
  decorators: [
    (Story) => (
      <div style={{
        padding: '24px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        minWidth: '300px'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: '#0F172A'
        }}>
          Dashboard
        </h3>
        <Story />
      </div>
    )
  ]
};

/**
 * Multiple dates showing different locales
 */
export const MultipleLocales: Story = {
  render: () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '20px',
      background: '#F5F8FC',
      borderRadius: '8px'
    }}>
      <div>
        <div style={{ fontSize: '12px', color: '#6B778C', marginBottom: '4px' }}>
          English (US)
        </div>
        <CurrentDate locale="en-US" />
      </div>
      <div>
        <div style={{ fontSize: '12px', color: '#6B778C', marginBottom: '4px' }}>
          English (UK)
        </div>
        <CurrentDate locale="en-GB" />
      </div>
      <div>
        <div style={{ fontSize: '12px', color: '#6B778C', marginBottom: '4px' }}>
          French
        </div>
        <CurrentDate locale="fr-FR" />
      </div>
      <div>
        <div style={{ fontSize: '12px', color: '#6B778C', marginBottom: '4px' }}>
          German
        </div>
        <CurrentDate locale="de-DE" />
      </div>
    </div>
  )
};
