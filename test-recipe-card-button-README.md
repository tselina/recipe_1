# Recipe Card Button Unit Tests (Task 11.1)

## Overview

This test suite provides comprehensive unit tests for the "New from this" button on recipe cards, implementing Task 11.1 from the recipe-continuation spec.

## Requirements Tested

- **Requirement 1.4**: When Recipe1 has no remaining ingredients (all remaining_weight equals 0), the "New from this" button SHALL be disabled and display a tooltip indicating "No remaining ingredients"
- **Requirement 1.5**: Where Recipe1 has remaining ingredients, the "New from this" button SHALL be enabled

## Test Files

### 1. `test-recipe-card-button.html`
Browser-based test runner with visual interface. This is the recommended way to run the tests.

**How to run:**
1. Open `test-recipe-card-button.html` in a web browser
2. Click "Run All Tests" button
3. View results with pass/fail indicators

**Features:**
- Visual test results with color-coded pass/fail indicators
- Grouped test results by category
- Progress bar and summary statistics
- Detailed error messages for failed tests

### 2. `test-recipe-card-button.js`
Node.js-based test runner for command-line execution.

**How to run:**
```bash
node test-recipe-card-button.js
```

**Requirements:**
- Node.js installed
- jsdom package installed (`npm install`)

## Test Coverage

### Test Group 1: Button Rendering with Remaining Ingredients
Tests that verify the button is properly rendered and enabled when ingredients remain:

1. ✓ Button exists when recipe has remaining ingredients
2. ✓ Button is enabled when recipe has remaining ingredients
3. ✓ Button is enabled with multiple remaining ingredients
4. ✓ Button is enabled when only one ingredient has remaining weight
5. ✓ Button has correct CSS classes
6. ✓ Button has correct text content
7. ✓ Button has correct recipe ID data attribute

### Test Group 2: Button Disabled State (Requirement 1.4)
Tests that verify the button is disabled when no ingredients remain:

8. ✓ Button is disabled when all ingredients have zero weight
9. ✓ Button is disabled when single ingredient has zero weight
10. ✓ Button disabled attribute is properly set in HTML

### Test Group 3: Tooltip Text (Requirement 1.4)
Tests that verify the tooltip displays correctly:

11. ✓ Tooltip exists when button is disabled
12. ✓ Tooltip contains "No remaining ingredients" text
13. ✓ Tooltip text matches specification exactly
14. ✓ No tooltip when button is enabled

### Test Group 4: Edge Cases
Tests that verify correct behavior in edge cases:

15. ✓ Button enabled with very small remaining weight (0.1g)
16. ✓ Button enabled with large remaining weight (10000g)
17. ✓ Button enabled with mixed zero and non-zero weights
18. ✓ Button is in correct position within recipe card
19. ✓ Multiple recipe cards have independent buttons

## Total Tests: 19

## Test Implementation Details

### Mock Objects
The tests use a `MockStorageManager` to simulate data persistence without requiring actual storage operations.

### Test Utilities
- `assertEqual(actual, expected, message)` - Asserts two values are equal
- `assertTrue(value, message)` - Asserts value is true
- `assertFalse(value, message)` - Asserts value is false
- `assertNotNull(value, message)` - Asserts value is not null/undefined
- `assertContains(str, substring, message)` - Asserts string contains substring

### Test Structure
Each test:
1. Creates a recipe with specific ingredient configurations
2. Generates a recipe card using `uiController.createRecipeCard()`
3. Queries for the "New from this" button
4. Asserts expected behavior

## Expected Results

All 19 tests should pass, confirming:
- Button renders correctly with proper styling and attributes
- Button is enabled when at least one ingredient has weight > 0
- Button is disabled when all ingredients have weight = 0
- Tooltip displays "No remaining ingredients" when button is disabled
- No tooltip displays when button is enabled
- Edge cases are handled correctly

## Integration with Spec

This test suite is part of the recipe-continuation feature implementation plan:

**Spec Path:** `.kiro/specs/recipe-continuation/`

**Task:** 11.1 Write unit tests for recipe card button
- Test button rendering with remaining ingredients ✓
- Test button disabled state when no remaining ingredients ✓
- Test tooltip text for disabled button ✓
- Requirements: 1.4, 1.5 ✓

## Next Steps

After these unit tests pass, the following tasks remain:
- Task 11.2: Write unit tests for modal rendering
- Task 11.3: Write unit tests for form validation
- Task 11.4-11.7: Write property-based tests
- Task 11.8: Write integration test for full continuation flow
