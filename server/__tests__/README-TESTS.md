# Integration Tests for FXNS Platform

## Overview

Comprehensive integration tests have been created for the critical features of the FXNS platform, covering both backend and frontend functionality.

## Test Files Created

### Backend Tests

#### 1. Tool Builder Tests (`server/__tests__/tool-builder.test.ts`)
Comprehensive tests for the visual tool builder service covering:

**Logic Step Types:**
- ✅ Calculation logic steps (mathematical formulas)
- ✅ Condition logic steps (if/else, else-if)
- ✅ Transform logic steps (data transformation)
- ✅ Switch/case logic steps
- ✅ API call logic steps
- ✅ AI analysis logic steps

**Output View Designer:**
- ✅ Text format output
- ✅ JSON format output
- ✅ Table format output
- ✅ Markdown format output
- ✅ Card format output

**Form Field Types:**
- ✅ Text, Number, Email fields
- ✅ Boolean (checkbox) fields
- ✅ Select/dropdown fields
- ✅ Textarea fields
- ✅ Field validation

**Draft Lifecycle:**
- ✅ Create draft
- ✅ Update draft
- ✅ Test draft
- ✅ Publish draft
- ✅ Load and restore draft state

**Error Handling:**
- ✅ Invalid formula errors
- ✅ Missing required field validation
- ✅ API error handling

#### 2. Workflow Tests (`server/__tests__/workflows.test.ts`)
Comprehensive tests for the workflow engine covering:

**All 7 Node Types:**
- ✅ Trigger nodes (manual, schedule, webhook, event)
- ✅ Action nodes (email, log, etc.)
- ✅ Condition nodes (AND/OR operators)
- ✅ Transform nodes (map, filter, sort, aggregate)
- ✅ API Call nodes (GET/POST)
- ✅ AI Task nodes (GPT integration)
- ✅ Loop nodes (forEach, while)
- ✅ Tool-as-Node functionality

**Node Connections:**
- ✅ Single connections between nodes
- ✅ Multiple connections from one node
- ✅ Conditional branching (true/false paths)
- ✅ Edge persistence

**Workflow Execution:**
- ✅ Simple linear workflows
- ✅ Complex multi-step workflows
- ✅ Data transformation pipelines
- ✅ API integration workflows
- ✅ AI-powered workflows
- ✅ Loop iteration

**Persistence:**
- ✅ Save workflow with nodes and edges
- ✅ Load workflow and restore state
- ✅ Update workflow and preserve changes
- ✅ Node position preservation
- ✅ Configuration persistence

**Error Handling:**
- ✅ Workflow execution errors
- ✅ Missing trigger node errors
- ✅ Invalid configuration handling
- ✅ API call failures
- ✅ Step failure handling

### Frontend Tests

#### 3. Tool Builder Flow Tests (`client/src/__tests__/tools/tool-builder-flow.test.tsx`)
End-to-end tests for the visual tool builder UI:

**Complete Workflow:**
- ✅ Create tool from scratch
- ✅ Fill tool metadata (name, description, category)
- ✅ Design input form
- ✅ Build logic flow
- ✅ Configure output view
- ✅ Test tool execution
- ✅ Publish tool

**Logic Step Types (UI):**
- ✅ Add calculation steps
- ✅ Add condition steps (if/else)
- ✅ Add switch/case steps
- ✅ Add transform steps
- ✅ Add API call steps
- ✅ Add AI analysis steps

**Output Formats (UI):**
- ✅ Configure text output
- ✅ Configure JSON output
- ✅ Configure table output
- ✅ Configure markdown output
- ✅ Configure card output

**Form Fields (UI):**
- ✅ Add text fields
- ✅ Add number fields
- ✅ Add email fields
- ✅ Add checkbox fields
- ✅ Add select/dropdown fields

**Draft Persistence (UI):**
- ✅ Auto-save on step changes
- ✅ Load existing drafts

**Error Handling (UI):**
- ✅ Save failure handling
- ✅ Test execution errors
- ✅ Validation errors

#### 4. Workflow Editor Tests (`client/src/__tests__/workflows/workflow-editor.test.tsx`)
End-to-end tests for the workflow editor UI:

**Workflow Loading:**
- ✅ Load existing workflow
- ✅ Display all node types
- ✅ Render workflow canvas

**Node Addition (UI):**
- ✅ Add Trigger nodes
- ✅ Add Action nodes
- ✅ Add Condition nodes
- ✅ Add Transform nodes
- ✅ Add API Call nodes
- ✅ Add AI Task nodes
- ✅ Add Loop nodes
- ✅ Add Tool nodes

**Node Connections (UI):**
- ✅ Create edges between nodes
- ✅ Multiple connections
- ✅ Conditional branching

**Node Configuration (UI):**
- ✅ Configure Trigger properties
- ✅ Configure Action properties
- ✅ Configure Condition properties

**Persistence (UI):**
- ✅ Save workflow changes
- ✅ Preserve node positions
- ✅ Restore workflow state

**Execution (UI):**
- ✅ Execute workflow from UI
- ✅ Display execution status
- ✅ Show results

**Error Handling (UI):**
- ✅ Load errors
- ✅ Save errors
- ✅ Execution errors

## Running the Tests

### Backend Tests

```bash
# Run tool builder tests
npm test -- --config vitest.backend.config.ts --run server/__tests__/tool-builder.test.ts

# Run workflow tests
npm test -- --config vitest.backend.config.ts --run server/__tests__/workflows.test.ts

# Run all backend tests
npm test -- --config vitest.backend.config.ts --run server/__tests__/
```

### Frontend Tests

```bash
# Run tool builder flow tests
npm test -- --run client/src/__tests__/tools/tool-builder-flow.test.tsx

# Run workflow editor tests
npm test -- --run client/src/__tests__/workflows/workflow-editor.test.tsx

# Run all frontend integration tests
npm test -- --run client/src/__tests__/
```

### All Tests

```bash
# Run all integration tests
npm test -- --run
```

## Test Setup

### Database Setup for Backend Tests

Backend tests require a test user in the database. The tests attempt to create a test user in the `beforeAll` hook:

```typescript
const TEST_USER_ID = '00000000-0000-0000-0000-000000000124'; // or 125 for workflows

await db.insert(users).values({
  id: TEST_USER_ID,
  name: 'test-user-builder',
  email: 'builder@example.com',
  passwordHash: 'hashed-password'
}).onConflictDoNothing();
```

**Note:** If tests fail due to foreign key constraints, you may need to manually create the test users in your database first, or adjust the test user IDs to match existing users.

### Mocking External Dependencies

Tests mock external services to avoid actual API calls:

- **OpenAI API**: Mocked to return predictable responses
- **External APIs**: Mocked for API call logic steps
- **Authentication**: Mocked to always authenticate test user

## Test Coverage

### Critical Paths Tested

1. **Tool Creation Flow**
   - Draft → Edit → Test → Publish
   - All logic step types
   - All output formats
   - All form field types

2. **Workflow Execution Flow**
   - All 7 node types
   - Node connections and branching
   - Multi-step execution
   - Error handling

3. **Data Persistence**
   - Draft saving and loading
   - Workflow saving and loading
   - Configuration persistence

4. **Error Scenarios**
   - Invalid data handling
   - API failures
   - Validation errors
   - Execution errors

## Key Testing Patterns

### Backend Testing
- Uses Supertest for API endpoint testing
- Uses Vitest for test framework
- Mocks external dependencies (OpenAI, etc.)
- Tests actual database operations
- Validates end-to-end execution

### Frontend Testing
- Uses React Testing Library
- Uses user-event for realistic interactions
- Mocks API calls with vitest
- Tests component rendering and state
- Validates user workflows

## Known Issues and Limitations

1. **Database Constraints**: Backend tests require proper test user setup in database
2. **React Flow Mocking**: Workflow editor tests mock React Flow components
3. **Async Operations**: Some tests have longer timeouts (20-30s) for complex operations
4. **External APIs**: All external API calls are mocked to ensure test reliability

## Future Improvements

1. Add visual regression testing for UI components
2. Add performance benchmarking for workflow execution
3. Add load testing for concurrent workflow executions
4. Add E2E tests with Playwright/Cypress
5. Add test coverage reporting
6. Add mutation testing for critical paths

## Maintenance

- Update mocks when external API contracts change
- Update test data when schema changes
- Keep test assertions aligned with business requirements
- Review and update tests when features change
