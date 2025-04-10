'use client';

import { useState, useEffect } from 'react';
import { WidgetConfigManager } from '@/components/admin/WidgetConfigManager';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function AdminWidgetConfigPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [widgetConfig, setWidgetConfig] = useState(null);

  useEffect(() => {
    const fetchWidgetConfig = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get('/api/admin/widgets/config');
        setWidgetConfig(response.data);
      } catch (error) {
        console.error('Error fetching widget configuration:', error);
        toast.error('Failed to load widget configuration');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWidgetConfig();
  }, []);

  const handleUpdateConfig = async (config) => {
    try {
      setIsLoading(true);
      const response = await axios.put('/api/admin/widgets/config', config);
      setWidgetConfig(response.data);
      toast.success('Widget configuration updated successfully');
      return response.data;
    } catch (error) {
      console.error('Error updating widget configuration:', error);
      toast.error('Failed to update widget configuration');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Widget Management</h1>
        <p className="text-gray-600">
          Configure and manage the widget appearance and behavior for all users
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <WidgetConfigManager
          initialConfig={widgetConfig}
          onSubmit={handleUpdateConfig}
        />
      )}
    </div>
  );
} 