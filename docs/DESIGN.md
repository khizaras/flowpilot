# FlowPilot Design System

This document describes the visual design and user experience guidelines for FlowPilot.

## Design Principles

### Premium SaaS Experience
FlowPilot aims to provide a professional, polished experience similar to leading SaaS products. The interface should feel:
- Clean and modern
- Intuitive and consistent
- Accessible to all users
- Responsive and fast

### Visual Hierarchy
- Clear distinction between primary and secondary actions
- Consistent use of typography and spacing
- Meaningful visual feedback for user interactions
- Appropriate use of color to convey status and importance

## Color Palette

### Primary Colors
- **Primary Blue**: #3B82F6 (for main actions and highlights)
- **Secondary Blue**: #60A5FA (for secondary actions and accents)
- **Success Green**: #10B981 (for successful actions)
- **Warning Amber**: #F59E0B (for warnings and cautions)
- **Error Red**: #EF4444 (for errors and destructive actions)

### Neutral Colors
- **Background**: #F8FAFC (light background)
- **Surface**: #FFFFFF (content surfaces)
- **Text Primary**: #111827 (primary text)
- **Text Secondary**: #6B7280 (secondary text)
- **Border**: #E5E7EB (borders and dividers)

## Typography

### Font Family
- **Primary**: Inter (or system-ui fallback)
- **Code**: Monospace (for technical content)

### Typography Scale
- **Display**: 20-24px (page titles)
- **Heading**: 16-18px (section titles)
- **Body**: 13-14px (main content)
- **Secondary**: 12px (small text, labels)

### Weight and Style
- **Bold**: Used for headings and important labels
- **Regular**: Default for body text
- **Italic**: For emphasis in secondary content

## Spacing System

### Base Units
- **Small**: 4px
- **Medium**: 8px
- **Large**: 12px
- **X-Large**: 16px
- **XX-Large**: 24px

### Component Spacing
- **Card**: 16px padding
- **Button**: 12px horizontal padding, 8px vertical padding
- **Form Elements**: 8px spacing between elements
- **Navigation**: 16px horizontal spacing

## Component Library

### Buttons
- **Primary**: Blue background, white text, rounded corners
- **Secondary**: White background, blue border, blue text
- **Destructive**: Red background, white text
- **Icon**: Minimal design, transparent background

### Cards
- **Background**: White
- **Shadow**: Light shadow for depth
- **Padding**: 16px
- **Border Radius**: 8px

### Forms
- **Input Fields**: 32px height, 8px border radius
- **Labels**: 12px font size, 4px bottom margin
- **Validation**: Red error text with icon

### Navigation
- **Tabs**: Underlined active state, hover effects
- **Sidebar**: Collapsible navigation
- **Breadcrumbs**: Light text with separators

## UI States

### Interactive States
- **Hover**: Slight color change or shadow
- **Active**: Pressed state with darker color
- **Focus**: Blue outline for accessibility
- **Disabled**: Reduced opacity and no interaction

### Status States
- **Success**: Green checkmark, success message
- **Warning**: Amber icon, warning message
- **Error**: Red icon, error message
- **Loading**: Spinner or progress bar

## Responsive Design

### Breakpoints
- **Mobile**: 320px - 767px
- **Tablet**: 768px - 1023px
- **Desktop**: 1024px and above

### Layout
- **Mobile First**: Start with mobile design
- **Flexible Grid**: Responsive grid system
- **Touch Targets**: Minimum 44px for touch targets

## Accessibility

### WCAG Compliance
- **Color Contrast**: Minimum 4.5:1 for normal text
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels for interactive elements
- **Focus Management**: Clear focus indicators

### Semantic HTML
- Proper use of heading tags
- Landmark roles for navigation
- Descriptive link text
- Form labels for inputs

## Animation

### Transitions
- **Duration**: 150-250ms for smooth interactions
- **Timing**: Ease-out for natural feel
- **Properties**: Focus on opacity, transform, and color

### Loading States
- **Spinners**: Circular indicators for loading
- **Skeleton**: Gray placeholders during load
- **Progress Bars**: For long-running operations

## Iconography

### Icon Set
- **Action Icons**: For primary actions (play, stop, save)
- **Status Icons**: For states (success, warning, error)
- **Navigation Icons**: For menu items and navigation

### Icon Style
- **Line Style**: Consistent stroke width
- **Size**: 16px for small, 24px for medium
- **Color**: Based on component context

## Empty States

### Design Elements
- **Illustration**: Simple, relevant illustrations
- **Text**: Clear, actionable copy
- **Button**: Prominent call-to-action
- **Consistency**: Match overall design language

## Error States

### Error Handling
- **Inline Validation**: Real-time feedback
- **Error Messages**: Specific and actionable
- **Recovery Options**: Clear paths to resolution
- **Visual Feedback**: Clear error indicators

## Loading States

### Loading Patterns
- **Skeleton Screens**: For content areas
- **Progress Indicators**: For operations
- **Spinners**: For short loading periods
- **Placeholders**: For images and content

## Data Visualization

### Charts and Graphs
- **Consistent Colors**: Use established palette
- **Clear Labels**: Readable text and labels
- **Responsive**: Adapt to different screen sizes
- **Accessible**: Include data tables for screen readers

## Onboarding

### Welcome Flow
- **Introduction**: Clear value proposition
- **Tour**: Interactive walkthrough
- **Quick Start**: Simple first steps
- **Documentation**: Easy access to help

## Feedback and Notifications

### Toast Notifications
- **Success**: Green with checkmark
- **Warning**: Amber with exclamation
- **Error**: Red with error icon
- **Info**: Blue with information icon

### Modal Dialogs
- **Clear Purpose**: Single, focused action
- **Consistent Styling**: Match overall design
- **Escape Handling**: Close with ESC key
- **Focus Management**: Proper tab order

## Forms

### Form Design
- **Clear Labels**: Descriptive labels for all fields
- **Validation**: Real-time and submission validation
- **Help Text**: Contextual guidance
- **Grouping**: Logical field grouping

## Tables

### Data Presentation
- **Clear Headers**: Distinct column headers
- **Alternating Rows**: Better readability
- **Sorting**: Clickable headers
- **Pagination**: For large datasets

## Performance Considerations

### Loading Optimization
- **Lazy Loading**: Non-critical content
- **Code Splitting**: Smaller bundles
- **Caching**: Strategic caching of assets
- **Minification**: Production optimization

## Internationalization

### Language Support
- **Text Direction**: Support for RTL languages
- **Date/Time Formats**: Regional formats
- **Number Formatting**: Locale-specific
- **String Resources**: Separate translation files