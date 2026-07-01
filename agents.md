# Agents Coding Directives & Constraints

## Dynamic Test Case Tracking
- A `test cases.md` file must be maintained in the `/documents` directory.
- For every new feature, API addition, or interface block introduced, a detailed, step-by-step test case with expected results must be appended.
- **CRITICAL CONSTRAINT:** Under no circumstances should existing test cases be modified or watered down during code updates to force tests to pass. The test suite must remain a true metric of regression correctness.
- **CRITICAL CONSTRAINT:** Always make sure the test case passes, but only because it really passes. Never rewrite a test case to pass a test.

## Channel360 Integration
- **Reply Endpoint:** When replying to an inbound message from a user, the C360 endpoint requires the `appUserId` (not the mobile number) in the URL path.
- **Notification Endpoint:** When sending templates, the endpoint (e.g., `https://www.channel360.co.za/v1.1/org/{{orgId}}/notification`) requires the customer's mobile number inside the request payload/body to successfully route the template message.
