# Design System

## Color Palette

### Blues
- **Blue Light** - `#c8e6fd`
  - Use for subtle backgrounds, hover states, and secondary elements
- **Blue Mid** - `#81bfee`
  - Use for primary interactive elements, buttons, and links
- **Blue Dark** - `#003c6a`
  - Use for text on light backgrounds, primary actions
- **Blue Very Dark** - `#08263c`
  - Use for headers, emphasis text, and dark mode backgrounds

### Accent Colors
- **Red** - `#bf2025`
  - Use for error states, destructive actions, and important alerts
- **Green** - `#2e9b64`
  - Use for success states, positive actions, and confirmations
- **Yellow** - `#d1c246`
  - Use for warnings, pending states, and highlighting

### Neutrals
- **Silver** - `#ececec`
  - Use for borders, dividers, and subtle backgrounds
- **White** - `#ffffff`
  - Use for primary backgrounds and text on dark backgrounds
- **Black** - `#000000`
  - Use sparingly for maximum contrast when needed
- **Charcoal** - `#333333`
  - Use for body text and secondary text elements

## Typography

### Font Family
The project uses **Maven Pro** as the primary font family throughout the application. This modern, clean font provides excellent readability across all screen sizes and platforms.

### Font Usage Guidelines
1. **Headers**
   ```typescript
   fontFamily: 'MavenPro-Bold'
   ```

2. **Body Text**
   ```typescript
   fontFamily: 'MavenPro-Regular'
   ```

3. **Interactive Elements**
   ```typescript
   fontFamily: 'MavenPro-Medium'
   ```

### Implementation

Add these styles to your component:

```typescript
const styles = StyleSheet.create({
  header: {
    fontFamily: 'MavenPro-Bold',
    color: '#08263c', // Blue Very Dark
  },
  body: {
    fontFamily: 'MavenPro-Regular',
    color: '#333333', // Charcoal
  },
  button: {
    fontFamily: 'MavenPro-Medium',
    backgroundColor: '#81bfee', // Blue Mid
    color: '#ffffff', // White
  },
});
```

## Usage Examples

### Primary Button
```typescript
{
  backgroundColor: '#81bfee', // Blue Mid
  color: '#ffffff',
  fontFamily: 'MavenPro-Medium',
  padding: 12,
  borderRadius: 6,
}
```

### Secondary Button
```typescript
{
  backgroundColor: '#c8e6fd', // Blue Light
  color: '#003c6a', // Blue Dark
  fontFamily: 'MavenPro-Medium',
  padding: 12,
  borderRadius: 6,
}
```

### Alert Messages
```typescript
{
  error: {
    backgroundColor: '#bf2025', // Red
    color: '#ffffff',
  },
  success: {
    backgroundColor: '#2e9b64', // Green
    color: '#ffffff',
  },
  warning: {
    backgroundColor: '#d1c246', // Yellow
    color: '#333333', // Charcoal
  }
}
```

## Best Practices

1. **Consistency**
   - Always use the defined color palette
   - Maintain consistent spacing and typography
   - Use the Maven Pro font family for all text elements

2. **Accessibility**
   - Ensure sufficient color contrast for text readability
   - Use appropriate font sizes for different screen sizes
   - Provide clear visual feedback for interactive elements

3. **Responsive Design**
   - Scale font sizes appropriately for different devices
   - Maintain consistent spacing ratios
   - Ensure touch targets are adequately sized

4. **Component Hierarchy**
   - Use color and typography to establish visual hierarchy
   - Maintain consistent styling across similar components
   - Follow established patterns for interactive elements 