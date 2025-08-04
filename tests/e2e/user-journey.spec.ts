import { test, expect, Page } from '@playwright/test';

test.describe('Critical User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('User Registration → Mask Selection → Chat Flow', () => {
    test('should complete full user onboarding flow', async ({ page }) => {
      // Step 1: User Registration
      await test.step('Navigate to registration', async () => {
        await page.click('text=Sign Up');
        await expect(page).toHaveURL('/register');
      });

      await test.step('Fill registration form', async () => {
        const email = `test${Date.now()}@example.com`;
        await page.fill('[data-testid="email-input"]', email);
        await page.fill('[data-testid="username-input"]', `user${Date.now()}`);
        await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
        await page.fill('[data-testid="confirm-password-input"]', 'SecurePassword123!');
        
        await page.click('[data-testid="register-button"]');
      });

      await test.step('Verify registration success', async () => {
        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
        await expect(page).toHaveURL('/mask-selection');
      });

      // Step 2: Mask Selection
      await test.step('Select a mask', async () => {
        await expect(page.locator('[data-testid="mask-grid"]')).toBeVisible();
        
        // Select the first available mask
        await page.click('[data-testid="mask-card"]:first-child');
        await page.click('[data-testid="select-mask-button"]');
      });

      await test.step('Verify mask selection', async () => {
        await expect(page.locator('[data-testid="mask-selected-notification"]')).toBeVisible();
        await expect(page).toHaveURL('/chat');
      });

      // Step 3: Enter Chat
      await test.step('Join a chat room', async () => {
        await expect(page.locator('[data-testid="room-list"]')).toBeVisible();
        
        // Join the first available room
        await page.click('[data-testid="room-card"]:first-child');
        await page.click('[data-testid="join-room-button"]');
      });

      await test.step('Verify chat room entry', async () => {
        await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
        await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
        await expect(page.locator('[data-testid="send-button"]')).toBeVisible();
      });

      // Step 4: Send a Message
      await test.step('Send first message', async () => {
        const testMessage = 'Hello everyone! This is my first message.';
        await page.fill('[data-testid="message-input"]', testMessage);
        await page.click('[data-testid="send-button"]');
      });

      await test.step('Verify message sent', async () => {
        await expect(page.locator('[data-testid="message-item"]').last()).toContainText('Hello everyone!');
      });
    });

    test('should handle mask timer expiration', async ({ page }) => {
      // Simulate user with expired mask
      await page.evaluate(() => {
        localStorage.setItem('userSession', JSON.stringify({
          user: { id: '1', username: 'testuser' },
          mask: { 
            id: '1', 
            name: 'TestMask', 
            expiresAt: new Date(Date.now() - 1000).toISOString() // Expired
          }
        }));
      });

      await page.reload();

      await test.step('Redirect to mask selection on expiration', async () => {
        await expect(page).toHaveURL('/mask-selection');
        await expect(page.locator('[data-testid="mask-expired-message"]')).toBeVisible();
      });
    });
  });

  test.describe('Anonymous Chat Features', () => {
    test('should enable anonymous messaging', async ({ page }) => {
      // Setup authenticated user
      await setupAuthenticatedUser(page);
      await page.goto('/chat');

      await test.step('Join chat room', async () => {
        await page.click('[data-testid="room-card"]:first-child');
        await page.click('[data-testid="join-room-button"]');
      });

      await test.step('Send anonymous message', async () => {
        await page.fill('[data-testid="message-input"]', 'This is an anonymous message');
        await page.click('[data-testid="send-button"]');
        
        await expect(page.locator('[data-testid="message-item"]').last())
          .not.toContainText('testuser'); // Should not show real username
      });

      await test.step('Verify mask identity shown', async () => {
        await expect(page.locator('[data-testid="message-item"]').last())
          .toContainText('Anonymous'); // Should show mask name
      });
    });

    test('should support message reactions', async ({ page }) => {
      await setupAuthenticatedUser(page);
      await page.goto('/chat');

      await test.step('Join room and send message', async () => {
        await page.click('[data-testid="room-card"]:first-child');
        await page.click('[data-testid="join-room-button"]');
        
        await page.fill('[data-testid="message-input"]', 'React to this message!');
        await page.click('[data-testid="send-button"]');
      });

      await test.step('Add reaction to message', async () => {
        await page.hover('[data-testid="message-item"]:last-child');
        await page.click('[data-testid="reaction-button"]');
        await page.click('[data-testid="reaction-emoji-😀"]');
      });

      await test.step('Verify reaction added', async () => {
        await expect(page.locator('[data-testid="message-reactions"]').last())
          .toContainText('😀 1');
      });
    });
  });

  test.describe('Truth or Dare Features', () => {
    test('should play truth game', async ({ page }) => {
      await setupAuthenticatedUser(page);
      await page.goto('/truth');

      await test.step('Start truth game', async () => {
        await page.click('[data-testid="start-truth-button"]');
        await expect(page.locator('[data-testid="truth-question"]')).toBeVisible();
      });

      await test.step('Answer truth question', async () => {
        await page.fill('[data-testid="truth-answer"]', 'This is my honest answer.');
        await page.click('[data-testid="submit-answer-button"]');
      });

      await test.step('Verify answer submitted', async () => {
        await expect(page.locator('[data-testid="answer-success"]')).toBeVisible();
      });
    });

    test('should view truth feed', async ({ page }) => {
      await setupAuthenticatedUser(page);
      await page.goto('/truth');

      await test.step('Navigate to truth feed', async () => {
        await page.click('[data-testid="truth-feed-tab"]');
        await expect(page.locator('[data-testid="truth-feed"]')).toBeVisible();
      });

      await test.step('Verify truth posts visible', async () => {
        await expect(page.locator('[data-testid="truth-post"]').first()).toBeVisible();
      });

      await test.step('Interact with truth post', async () => {
        await page.click('[data-testid="truth-post"]:first-child [data-testid="like-button"]');
        await expect(page.locator('[data-testid="like-count"]').first()).not.toHaveText('0');
      });
    });
  });

  test.describe('Location-based Features', () => {
    test('should access dropzone with location permission', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      // Mock geolocation
      await page.context().grantPermissions(['geolocation']);
      await page.setGeolocation({ latitude: 40.7128, longitude: -74.0060 });

      await page.goto('/dropzone');

      await test.step('Request location access', async () => {
        await page.click('[data-testid="enable-location-button"]');
      });

      await test.step('Verify map interface', async () => {
        await expect(page.locator('[data-testid="map-container"]')).toBeVisible();
        await expect(page.locator('[data-testid="nearby-secrets"]')).toBeVisible();
      });

      await test.step('Create secret drop', async () => {
        await page.click('[data-testid="create-secret-button"]');
        await page.fill('[data-testid="secret-content"]', 'This is a secret message!');
        await page.click('[data-testid="drop-secret-button"]');
      });

      await test.step('Verify secret created', async () => {
        await expect(page.locator('[data-testid="secret-success"]')).toBeVisible();
      });
    });
  });

  test.describe('Explore Feed', () => {
    test('should browse and filter content', async ({ page }) => {
      await setupAuthenticatedUser(page);
      await page.goto('/explore');

      await test.step('View explore feed', async () => {
        await expect(page.locator('[data-testid="explore-feed"]')).toBeVisible();
        await expect(page.locator('[data-testid="content-card"]').first()).toBeVisible();
      });

      await test.step('Apply content filter', async () => {
        await page.click('[data-testid="filter-button"]');
        await page.click('[data-testid="filter-category-truth"]');
        await page.click('[data-testid="apply-filter-button"]');
      });

      await test.step('Verify filtered results', async () => {
        await expect(page.locator('[data-testid="filter-active"]')).toContainText('Truth');
      });

      await test.step('Interact with content', async () => {
        await page.click('[data-testid="content-card"]:first-child [data-testid="like-button"]');
        await page.click('[data-testid="content-card"]:first-child [data-testid="comment-button"]');
        
        await page.fill('[data-testid="comment-input"]', 'Great content!');
        await page.click('[data-testid="submit-comment-button"]');
      });
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      await setupAuthenticatedUser(page);
      
      // Simulate network failure
      await page.route('**/api/**', route => route.abort());
      
      await page.goto('/chat');

      await test.step('Show offline indicator', async () => {
        await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      });

      await test.step('Queue messages when offline', async () => {
        await page.fill('[data-testid="message-input"]', 'Offline message');
        await page.click('[data-testid="send-button"]');
        
        await expect(page.locator('[data-testid="message-queued"]')).toBeVisible();
      });
    });

    test('should handle authentication errors', async ({ page }) => {
      // Invalid token
      await page.evaluate(() => {
        localStorage.setItem('authToken', 'invalid_token');
      });

      await page.goto('/chat');

      await test.step('Redirect to login on auth error', async () => {
        await expect(page).toHaveURL('/login');
        await expect(page.locator('[data-testid="auth-error"]')).toBeVisible();
      });
    });
  });

  test.describe('Performance', () => {
    test('should load pages within performance budget', async ({ page }) => {
      const loadStart = Date.now();
      await page.goto('/');
      const loadTime = Date.now() - loadStart;

      expect(loadTime).toBeLessThan(3000); // 3 second budget

      await test.step('Verify critical elements load quickly', async () => {
        await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
        await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
      });
    });

    test('should handle large chat rooms efficiently', async ({ page }) => {
      await setupAuthenticatedUser(page);
      await page.goto('/chat');

      // Simulate large chat room
      await page.evaluate(() => {
        // Mock large message history
        window.__mockLargeMessageHistory = Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          content: `Message ${i}`,
          timestamp: new Date().toISOString(),
          user: `User${i % 10}`
        }));
      });

      await test.step('Join large room', async () => {
        await page.click('[data-testid="room-card"]:first-child');
        await page.click('[data-testid="join-room-button"]');
      });

      await test.step('Verify smooth scrolling in message history', async () => {
        const messageList = page.locator('[data-testid="message-list"]');
        await messageList.scrollIntoViewIfNeeded();
        
        // Should not freeze or lag
        await page.waitForTimeout(1000);
        expect(await page.locator('[data-testid="message-item"]').count()).toBeGreaterThan(0);
      });
    });
  });
});

// Helper function to setup authenticated user
async function setupAuthenticatedUser(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem('authToken', 'mock_valid_token');
    localStorage.setItem('userSession', JSON.stringify({
      user: { 
        id: '1', 
        username: 'testuser', 
        email: 'test@example.com' 
      },
      mask: { 
        id: '1', 
        name: 'Anonymous', 
        expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
      }
    }));
  });
}
