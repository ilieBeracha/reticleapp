# Implementation Plan

- [x] 1. Create enhanced authentication infrastructure

  - Create singleton AuthenticatedClient class that automatically handles token injection
  - Update auth context to provide getClient() method alongside existing functionality
  - Add consistent error types for authentication and service failures
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 4.1, 4.2_

- [x] 2. Refactor service layer to eliminate token parameters
- [x] 2.1 Update sessionService to use AuthenticatedClient

  - Remove token parameters from all service functions
  - Update service functions to use AuthenticatedClient.getClient()
  - Maintain backward compatibility with deprecated wrapper functions
  - _Requirements: 1.1, 1.5, 3.1, 3.4_

- [x] 2.2 Update weaponsModels service to use AuthenticatedClient

  - Remove token parameter from getWeaponsModelsService
  - Update to use automatic authentication
  - _Requirements: 1.1, 1.5, 3.1_

- [x] 2.3 Update detectionService to use AuthenticatedClient

  - Remove token parameters from detection-related service functions
  - Ensure consistent error handling across all detection operations
  - _Requirements: 1.1, 1.5, 3.1, 4.1_

- [x] 3. Simplify store layer to remove token passing
- [x] 3.1 Update sessionsStore to use simplified services

  - Remove token parameters from all store actions
  - Update store to use refactored services without token passing
  - Maintain existing state management patterns
  - _Requirements: 1.1, 2.3, 3.1_

- [x] 3.2 Update weaponModelsStore to use simplified services

  - Remove token parameters from weapon model store actions
  - Update to use refactored weapon models service
  - _Requirements: 1.1, 2.3, 3.1_

- [x] 3.3 Update detectionStore to use simplified services

  - Remove token parameters from detection store actions
  - Update to use refactored detection services
  - _Requirements: 1.1, 2.3, 3.1_

- [x] 4. Create direct service hooks for simple use cases
- [x] 4.1 Create useSessionsQuery hook using React Query pattern

  - Implement direct service hook for simple session operations
  - Use React Query for caching and state management
  - Provide clear example of when to use vs store pattern
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 4.2 Create useWeaponModels hook for simple weapon model fetching

  - Implement direct service hook for weapon model operations
  - Demonstrate pattern for read-only data fetching
  - _Requirements: 2.1, 2.2, 2.4_

- [ ]\* 4.3 Create useDetection hook for simple detection operations

  - Implement direct service hook for basic detection operations
  - Show pattern for operations that don't require complex state management
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 5. Update components to use simplified patterns
- [x] 5.1 Update session-related components to use new patterns

  - Migrate components from manual token handling to simplified store usage
  - Update CreateSessionModal and related components
  - Choose appropriate pattern (direct hook vs store) based on complexity
  - _Requirements: 1.3, 2.1, 2.2_

- [x] 5.2 Update organization switching components

  - Simplify organization switch flow to use enhanced authentication
  - Remove manual token passing from organization-related operations
  - _Requirements: 1.3, 2.1, 2.2_

- [ ]\* 5.3 Update detection and camera components

  - Migrate detection-related components to use simplified patterns
  - Remove token complexity from camera detection flow
  - _Requirements: 1.3, 2.1, 2.2_

- [ ] 6. Add comprehensive error handling and recovery
- [ ] 6.1 Implement automatic authentication error recovery

  - Add automatic token refresh handling in AuthenticatedClient
  - Implement automatic redirect to login on authentication failures
  - Add retry logic for transient network errors
  - _Requirements: 3.2, 3.3, 4.1, 4.2, 4.3_

- [ ] 6.2 Add consistent error messaging and logging

  - Implement user-friendly error messages for common failure scenarios
  - Add proper error logging for debugging purposes
  - Create error boundary components for graceful error handling
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 7. Create migration documentation and examples
  - Document the new patterns and when to use each approach
  - Create examples showing migration from old to new patterns
  - Add guidelines for choosing between direct hooks vs stores
  - _Requirements: 2.4, 2.5_
