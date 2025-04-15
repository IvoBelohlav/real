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
    // Dark theme error styling
    return <div className="text-red-500 bg-red-900/20 border border-red-500/50 p-4 rounded-md">Error loading submissions: {error?.message}</div>;
  }

  return (
    // Use background for the page area if needed, card provides the main container bg
    <div className="space-y-6 p-4 sm:p-6 lg:p-8"> {/* Added padding consistent with dashboard pages */}
       {/* Heading styling - standard dashboard heading */}
       <h2 className="text-2xl font-bold tracking-tight text-foreground">Contact Form Submissions</h2>
       <p className="text-muted-foreground">View messages submitted through the contact form in the chat widget.</p>

      {/* Card styling - Target: Black background with purple border */}
      <div className="bg-black text-card-foreground rounded-lg border-2 border-primary"> {/* Explicit black background, purple border */}
        {/* Optional Card Header */}
        {/* <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="text-lg font-semibold leading-none tracking-tight">Received Submissions</h3>
        </div> */}

        {/* Card Content */}
        <div className="p-0"> {/* Remove padding if table handles it */}
          {submissions && submissions.length > 0 ? (
            <div className="overflow-x-auto">
              {/* Table styling */}
              <table className="w-full caption-bottom text-sm"> {/* Use w-full for better responsiveness */}
                {/* Table header styling */}
                <thead className="[&_tr]:border-b"> {/* shadcn thead style */}
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"> {/* shadcn tr style */}
                    {/* Header cell styling */}
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Submitted At</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Email</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Phone</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 max-w-xs">Message</th> {/* Added max-w */}
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Status</th>
                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th> {/* Adjusted alignment */}
                  </tr>
                </thead>
                {/* Table body styling */}
                <tbody className="[&_tr:last-child]:border-0"> {/* shadcn tbody style */}
                  {submissions.map((sub) => (
                    // Table row styling
                    <tr key={sub.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"> {/* shadcn tr style */}
                      {/* Table cell styling */}
                      <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 whitespace-nowrap text-muted-foreground">{formatDate(sub.submittedAt)}</td>
                      <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 whitespace-nowrap text-foreground">{sub.email}</td>
                      <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 whitespace-nowrap text-muted-foreground">{sub.phone || '-'}</td>
                      <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-muted-foreground max-w-xs whitespace-normal break-words">{sub.message}</td> {/* Added break-words */}
                      <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 whitespace-nowrap">
                        {/* Badge styling - Keeping existing distinct colors for clarity */}
                        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border ${ // Adjusted padding/size slightly
                          sub.completed ? 'bg-green-900/30 text-green-400 border-green-700/50' : 'bg-yellow-900/30 text-yellow-400 border-yellow-700/50'
                        }`}>
                          {sub.completed ? 'Completed' : 'Pending'}
                        </span>
                      </td>
                      <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 whitespace-nowrap text-right space-x-2"> {/* Adjusted alignment */}
                        {/* Button styling - Using text variants */}
                        <button
                          onClick={() => handleToggleComplete(sub)}
                          disabled={updateStatusMutation.isPending && updateStatusMutation.variables?.id === sub.id}
                          className="text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium" // Ensure font size/weight
                          title={sub.completed ? 'Mark as Pending' : 'Mark as Completed'}
                        >
                          {sub.completed ? 'Undo' : 'Complete'}
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id)}
                          disabled={deleteSubmissionMutation.isPending && deleteSubmissionMutation.variables === sub.id}
                          className="text-destructive hover:text-destructive/80 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium" // Ensure font size/weight
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
            // Apply dark theme muted text style within card padding
            <p className="text-center text-muted-foreground p-6">No contact submissions found.</p>
          )}
        </div> {/* End Card Content */}
      </div> {/* End Card */}
    </div> // End Main Container
  );
};

export default ContactSubmissionsManager;
