
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth hook
import { api } from "@/lib/api"; // Import api wrapper
import { Order } from "@/types"; // Import Order type
import LoadingSpinner from "@/components/shared/LoadingSpinner"; // Use default import

export default function OrdersPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth(); // Use auth context
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth check to complete
    if (isAuthLoading) {
      return;
    }

    // Only fetch if authenticated
    if (!isAuthenticated) {
      setLoading(false);
      setError("Please log in to view orders.");
      // Optionally redirect to login
      // router.push('/login');
      return;
    }

    async function fetchOrders() {
      setLoading(true);
      setError(null);
      try {
        // Use the api wrapper which handles auth headers
        const response = await api.get<Order[]>('/api/orders');
        setOrders(response.data); // Access data property from api wrapper response
      } catch (err: any) {
        console.error("Failed to fetch orders:", err);
        setError(err.message || "Failed to load orders.");
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [isAuthenticated, isAuthLoading]); // Re-run if auth state changes

  // Handle combined loading state (auth check + data fetch)
  const isLoading = isAuthLoading || loading;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Orders</h1>
      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <LoadingSpinner />
        </div>
      ) : error ? (
         <p className="text-red-500">{error}</p>
      ) : orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border bg-white shadow-md rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2 text-left text-sm font-semibold text-gray-600">Order #</th>
                <th className="border px-4 py-2 text-left text-sm font-semibold text-gray-600">Date</th>
                <th className="border px-4 py-2 text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="border px-4 py-2 text-left text-sm font-semibold text-gray-600">Total</th>
                <th className="border px-4 py-2 text-left text-sm font-semibold text-gray-600">Tracking</th>
                {/* Add more columns as needed */}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2 text-sm text-gray-700">{order.order_number || order.platform_order_id}</td>
                  <td className="border px-4 py-2 text-sm text-gray-700">{new Date(order.order_date).toLocaleDateString()}</td>
                  <td className="border px-4 py-2 text-sm text-gray-700">
                     {/* Add some styling for status */}
                     <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                         order.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                         order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                         order.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                         'bg-yellow-100 text-yellow-800' // Default for Pending/Processing
                     }`}>
                         {order.status}
                     </span>
                  </td>
                   <td className="border px-4 py-2 text-sm text-gray-700">{order.total_amount.toFixed(2)} {order.currency}</td>
                  <td className="border px-4 py-2 text-sm text-gray-700">
                    {order.tracking_number ? (
                      // TODO: Add link to carrier tracking if possible
                      <a href="#" className="text-blue-600 hover:underline" title={`Carrier: ${order.carrier || 'N/A'}`}>
                        {order.tracking_number}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  {/* Add more cells for other details */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
