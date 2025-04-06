// src/app/(superadmin)/superadmin/users/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // Assuming AuthContext provides user role info
import { listAllUsers, updateUserStatus, updateUserRole } from '@/lib/api'; // Need to implement these API calls
import { UserProfile } from '@/types'; // Assuming UserProfile includes is_super_admin
import LoadingSpinner from '@/components/shared/LoadingSpinner'; // Assuming shared spinner exists
// Removed Button and Switch imports from shadcn/ui
import { toast } from 'sonner'; // Corrected import for sonner

// Basic table styling (replace with your actual table component/styling if available)
const tableStyles: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '20px',
};
const thStyles: React.CSSProperties = {
  border: '1px solid #ddd',
  padding: '8px',
  textAlign: 'left',
  backgroundColor: '#f2f2f2',
};
const tdStyles: React.CSSProperties = {
  border: '1px solid #ddd',
  padding: '8px',
};

export default function SuperAdminUsersPage() {
  const { user } = useAuth(); // Get user info, including role/is_super_admin
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedUsers = await listAllUsers(); // Implement this API call
      setUsers(fetchedUsers);
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
      setError(err.message || 'Failed to load users.');
      toast.error("Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Ensure only super admins can access this page (redundant if layout/guard handles it, but good practice)
    if (user && user.is_super_admin) {
      fetchUsers();
    } else {
      // Handle unauthorized access attempt (e.g., redirect or show error)
      // This might be handled by a layout guard already
      setError("Access Denied: Super Admin privileges required.");
      setIsLoading(false);
      console.warn("Non-superadmin attempted to access superadmin users page.");
    }
  }, [user, fetchUsers]);

  const handleStatusChange = async (userId: string, currentStatus: boolean) => {
    const isActive = !currentStatus; // Toggle the status
    try {
        await updateUserStatus(userId, isActive); // Implement this API call
        setUsers(prevUsers => 
            prevUsers.map(u => 
                u.id === userId ? { ...u, subscription_status: isActive ? 'active' : 'inactive' } : u
            )
        );
        toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully.`);
    } catch (err: any) {
        console.error("Failed to update user status:", err);
        toast.error(`Failed to update user status: ${err.message || 'Unknown error'}`);
    }
  };

  const handleRoleChange = async (userId: string, currentIsSuperAdmin: boolean) => {
      const isSuperAdmin = !currentIsSuperAdmin; // Toggle the role
      if (userId === user?.id) {
          toast.error("You cannot change your own super admin status.");
          return;
      }
      try {
          await updateUserRole(userId, isSuperAdmin); // Implement this API call
          setUsers(prevUsers =>
              prevUsers.map(u =>
                  u.id === userId ? { ...u, is_super_admin: isSuperAdmin } : u
              )
          );
          toast.success(`User role updated successfully.`);
      } catch (err: any) {
          console.error("Failed to update user role:", err);
          toast.error(`Failed to update user role: ${err.message || 'Unknown error'}`);
      }
  };


  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  // Ensure user is checked again in case context hasn't updated yet
  if (!user || !user.is_super_admin) {
     return <div className="text-red-500 p-4">Access Denied: Super Admin privileges required.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">User Management (Super Admin)</h1>
      
      <table style={tableStyles}>
        <thead>
          <tr>
            <th style={thStyles}>Email</th>
            <th style={thStyles}>Username</th>
            <th style={thStyles}>Company</th>
            <th style={thStyles}>Tier</th>
            <th style={thStyles}>Status</th>
            <th style={thStyles}>Created At</th>
            <th style={thStyles}>Sub End Date</th>
            <th style={thStyles}>API Key?</th>
            <th style={thStyles}>Is Super Admin</th>
          </tr>
        </thead>
        <tbody>{/* Ensure no whitespace before map */}
          {users.map((u) => (
            <tr key={u.id}>
              <td style={tdStyles}>{u.email}</td>
              <td style={tdStyles}>{u.username}</td>
              <td style={tdStyles}>{u.company_name || '-'}</td>
              <td style={tdStyles}>{u.subscription_tier}</td>
              <td style={tdStyles}>{u.subscription_status}</td>
              <td style={tdStyles}>{new Date(u.created_at).toLocaleDateString()}</td>
              <td style={tdStyles}>{u.subscription_end_date ? new Date(u.subscription_end_date).toLocaleDateString() : '-'}</td>
              <td style={tdStyles}>{u.api_key ? 'Yes' : 'No'}</td>
              <td style={tdStyles}>
                 <input
                    type="checkbox"
                    checked={u.is_super_admin}
                    onChange={() => handleRoleChange(u.id, u.is_super_admin)}
                    disabled={u.id === user?.id} // Prevent changing own role
                    aria-label={`Toggle super admin role for user ${u.email}`}
                    style={{ cursor: u.id === user?.id ? 'not-allowed' : 'pointer' }}
                 />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
