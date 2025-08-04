import React from 'react';
import { render, screen } from '@testing-library/react';
import { AdminGuard } from '../AdminGuard';

// Mock the useAdminAuth hook
jest.mock('@/hooks/useAdminAuth', () => ({
  useAdminAuth: () => ({
    admin: {
      id: '1',
      username: 'testadmin',
      role: 'super_admin',
      permissions: ['all']
    },
    isAuthenticated: true,
    isLoading: false,
    hasPermission: jest.fn().mockReturnValue(true),
    isRole: jest.fn().mockReturnValue(true),
  }),
}));

describe('AdminGuard', () => {
  it('renders children when admin is authenticated with correct role', () => {
    render(
      <AdminGuard requiredRole="super_admin">
        <div>Protected Content</div>
      </AdminGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows loading state when authentication is loading', () => {
    // Mock loading state
    jest.doMock('@/hooks/useAdminAuth', () => ({
      useAdminAuth: () => ({
        admin: null,
        isAuthenticated: false,
        isLoading: true,
        hasPermission: jest.fn().mockReturnValue(false),
        isRole: jest.fn().mockReturnValue(false),
      }),
    }));

    render(
      <AdminGuard requiredRole="super_admin">
        <div>Protected Content</div>
      </AdminGuard>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows access denied when admin lacks required role', () => {
    jest.doMock('@/hooks/useAdminAuth', () => ({
      useAdminAuth: () => ({
        admin: {
          id: '1',
          username: 'testadmin',
          role: 'moderator',
          permissions: ['limited']
        },
        isAuthenticated: true,
        isLoading: false,
        hasPermission: jest.fn().mockReturnValue(false),
        isRole: jest.fn().mockReturnValue(false),
      }),
    }));

    render(
      <AdminGuard requiredRole="super_admin">
        <div>Protected Content</div>
      </AdminGuard>
    );

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });
});
