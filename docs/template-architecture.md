# Template Architecture

## The Burger Model

Templates are built in 3 layers

### Layer 1: Content

Raw data transformation - no styling decisions.

- Escape strings
- Format bullet points
- Handle empty values

### Layer 2: Sections

How each section is laid out and formatted.

- Work experience layout
- Education format
- Project presentation

### Layer 3

Document-wide settings and utilities.

- Fonts, colors, margins
- Page setup
- Global helper functions

## Future: Mix & Match

Users can :

- Keep same data
- Swap section styles
- Change to another predefined template
