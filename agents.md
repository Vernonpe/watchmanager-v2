# Agents Coding Directives & Constraints

## Dynamic Test Case Tracking
- A `test cases.md` file must be maintained in the `/documents` directory.
- For every new feature, API addition, or interface block introduced, a detailed, step-by-step test case with expected results must be appended.
- **CRITICAL CONSTRAINT:** Under no circumstances should existing test cases be modified or watered down during code updates to force tests to pass. The test suite must remain a true metric of regression correctness.
- **CRITICAL CONSTRAINT:** Always make sure the test case passes, but only because it really passes. Never rewrite a test case to pass a test.
