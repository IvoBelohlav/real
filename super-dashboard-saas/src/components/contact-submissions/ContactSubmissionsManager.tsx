'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { fetchApi } from '@/lib/api';
import { ContactSubmission } from '@/types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

// Helper to format date
const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString();
  } catch (e) {
    return dateString; // Return original if formatting fails
  }
};

const ContactSubmissionsManager: React.FC = () => {
  const queryClient = useQueryClient();

  // Fetch Submissions
  const { data: submissions, isLoading, isError, error } = useQuery<ContactSubmission[], Error>({
    queryKey: ['contactSubmissions'],
    queryFn: () => fetchApi('/api/contact-admin-submissions/'), // Matches backend endpoint
  });

  // --- Mutations ---

  // Update Status Mutation
  const updateStatusMutation = useMutation<void, Error, { id: string; completed: boolean }>({
    mutationFn: ({ id, completed }) => fetchApi(`/api/contact-admin-submissions/${id}/status?completed=${completed}`, {
      method: 'PUT',
    }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contactSubmissions'] });
      toast.success(`Submission status updated to ${variables.completed ? 'Completed' : 'Pending'}.`);
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  // Delete Submission Mutation
  const deleteSubmissionMutation = useMutation<void, Error, string>({
    mutationFn: (submissionId) => fetchApi(`/api/contact-admin-submissions/${submissionId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactSubmissions'] });
      toast.success('Submission deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete submission: ${error.message}`);
    },
  });

  // --- Handlers ---
  const handleToggleComplete = (submission: ContactSubmission) => {
    if (!submission.id) return;
    updateStatusMutation.mutate({ id: submission.id, completed: !submission.completed });
  };

  const handleDelete = (submissionId?: string) => {
    if (!submissionId) return;
    if (window.confirm('Are you sure you want to delete this submission?')) {
      deleteSubmissionMutation.mutate(submissionId);
    }
  };

  // --- Render Logic ---
  if (isLoading) {
    return <div className="flex justify-center p-4"><LoadingSpinner /></div>;
  }

  if (isError) {
    return <div className="text-red-600 bg-red-100 p-4 rounded">Error loading submissions: {error?.message}</div>;
  }

  return (
    <div className="space-y-6">
       <h2 className="text-xl font-semibold text-gray-800">Received Submissions</h2>
      {/* Submissions List/Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {submissions && submissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted At</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(sub.submittedAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sub.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-md whitespace-normal">{sub.message}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        sub.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sub.completed ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleToggleComplete(sub)}
                        disabled={updateStatusMutation.isPending && updateStatusMutation.variables?.id === sub.id}
                        className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                        title={sub.completed ? 'Mark as Pending' : 'Mark as Completed'}
                      >
                        {sub.completed ? 'Undo' : 'Complete'}
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id)}
                        disabled={deleteSubmissionMutation.isPending && deleteSubmissionMutation.variables === sub.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-6">No contact submissions found.</p>
        )}
      </div>
    </div>
  );
};

export default ContactSubmissionsManager;
