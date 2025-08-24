import { AxiosInstance } from 'axios';
import { getApiInstance } from './authService';
import { 
  ApiResponse, 
  Device, 
  DeviceFormData, 
  MetricPoint,
  PaginationOptions,
  DeviceFilter 
} from '../types';

class DeviceService {
  private api: AxiosInstance;

  constructor() {
    this.api = getApiInstance();
  }

  // Get all devices
  async getDevices(filter?: DeviceFilter): Promise<Device[]> {
    try {
      const params = new URLSearchParams();
      
      if (filter?.type) params.append('type', filter.type);
      if (filter?.vendor) params.append('vendor', filter.vendor);
      if (filter?.location) params.append('location', filter.location);
      if (filter?.status) params.append('status', filter.status);
      if (filter?.search) params.append('search', filter.search);

      const response = await this.api.get<ApiResponse<Device[]>>(`/devices?${params.toString()}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch devices');
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
  }

  // Get device by ID
  async getDevice(id: string): Promise<Device> {
    try {
      const response = await this.api.get<ApiResponse<Device>>(`/devices/${id}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch device');
      }
    } catch (error) {
      console.error(`Error fetching device ${id}:`, error);
      throw error;
    }
  }

  // Add new device
  async addDevice(deviceData: DeviceFormData): Promise<Device> {
    try {
      const response = await this.api.post<ApiResponse<Device>>('/devices', deviceData);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to add device');
      }
    } catch (error) {
      console.error('Error adding device:', error);
      throw error;
    }
  }

  // Update device
  async updateDevice(id: string, deviceData: Partial<DeviceFormData>): Promise<Device> {
    try {
      const response = await this.api.put<ApiResponse<Device>>(`/devices/${id}`, deviceData);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to update device');
      }
    } catch (error) {
      console.error(`Error updating device ${id}:`, error);
      throw error;
    }
  }

  // Delete device
  async deleteDevice(id: string): Promise<void> {
    try {
      const response = await this.api.delete<ApiResponse<void>>(`/devices/${id}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete device');
      }
    } catch (error) {
      console.error(`Error deleting device ${id}:`, error);
      throw error;
    }
  }

  // Get device metrics
  async getDeviceMetrics(
    id: string, 
    timeRange: string = '1h', 
    metric?: string
  ): Promise<{ deviceId: string; timeRange: string; metrics: MetricPoint[] }> {
    try {
      const params = new URLSearchParams();
      params.append('timeRange', timeRange);
      if (metric) params.append('metric', metric);

      const response = await this.api.get<ApiResponse<{
        deviceId: string;
        timeRange: string;
        metrics: MetricPoint[];
      }>>(`/devices/${id}/metrics?${params.toString()}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch device metrics');
      }
    } catch (error) {
      console.error(`Error fetching metrics for device ${id}:`, error);
      throw error;
    }
  }

  // Get device interfaces
  async getDeviceInterfaces(
    id: string, 
    timeRange: string = '1h'
  ): Promise<{ deviceId: string; timeRange: string; interfaces: MetricPoint[] }> {
    try {
      const params = new URLSearchParams();
      params.append('timeRange', timeRange);

      const response = await this.api.get<ApiResponse<{
        deviceId: string;
        timeRange: string;
        interfaces: MetricPoint[];
      }>>(`/devices/${id}/interfaces?${params.toString()}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch device interfaces');
      }
    } catch (error) {
      console.error(`Error fetching interfaces for device ${id}:`, error);
      throw error;
    }
  }

  // Test device connectivity
  async testDevice(id: string): Promise<{ success: boolean; message: string; timestamp: string }> {
    try {
      const response = await this.api.post<{
        success: boolean;
        message: string;
        timestamp: string;
        error?: string;
      }>(`/devices/${id}/test`);
      
      return {
        success: response.data.success,
        message: response.data.message || response.data.error || 'Test completed',
        timestamp: response.data.timestamp,
      };
    } catch (error) {
      console.error(`Error testing device ${id}:`, error);
      return {
        success: false,
        message: 'Test failed: Network error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Get device statistics
  async getDeviceStats(
    id: string, 
    period: string = '24h'
  ): Promise<{
    deviceId: string;
    period: string;
    statistics: Array<{
      metric_name: string;
      data_points: number;
      avg_value: number;
      min_value: number;
      max_value: number;
      std_dev: number;
    }>;
  }> {
    try {
      const params = new URLSearchParams();
      params.append('period', period);

      const response = await this.api.get<ApiResponse<{
        deviceId: string;
        period: string;
        statistics: Array<{
          metric_name: string;
          data_points: number;
          avg_value: number;
          min_value: number;
          max_value: number;
          std_dev: number;
        }>;
      }>>(`/devices/${id}/stats?${params.toString()}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch device statistics');
      }
    } catch (error) {
      console.error(`Error fetching statistics for device ${id}:`, error);
      throw error;
    }
  }

  // Get device types for filtering
  getDeviceTypes(): string[] {
    return [
      'router',
      'switch',
      'firewall',
      'server',
      'printer',
      'ups',
      'wireless_controller',
      'access_point'
    ];
  }

  // Get device vendors for filtering
  getDeviceVendors(): string[] {
    return [
      'cisco',
      'juniper',
      'aruba',
      'hp',
      'dell',
      'netgear',
      'ubiquiti',
      'fortinet',
      'palo_alto',
      'mikrotik',
      'generic'
    ];
  }

  // Import devices from CSV
  async importDevices(file: File): Promise<{ success: boolean; imported: number; errors: string[] }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.api.post<ApiResponse<{
        imported: number;
        errors: string[];
      }>>('/devices/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        return {
          success: true,
          imported: response.data.data.imported,
          errors: response.data.data.errors,
        };
      } else {
        throw new Error(response.data.error || 'Failed to import devices');
      }
    } catch (error) {
      console.error('Error importing devices:', error);
      return {
        success: false,
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Import failed'],
      };
    }
  }

  // Export devices to CSV
  async exportDevices(filter?: DeviceFilter): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      
      if (filter?.type) params.append('type', filter.type);
      if (filter?.vendor) params.append('vendor', filter.vendor);
      if (filter?.location) params.append('location', filter.location);
      if (filter?.status) params.append('status', filter.status);

      const response = await this.api.get(`/devices/export?${params.toString()}`, {
        responseType: 'blob',
      });
      
      return response.data;
    } catch (error) {
      console.error('Error exporting devices:', error);
      throw error;
    }
  }

  // Bulk operations
  async bulkUpdateDevices(deviceIds: string[], updates: Partial<DeviceFormData>): Promise<{
    success: boolean;
    updated: number;
    errors: string[];
  }> {
    try {
      const response = await this.api.put<ApiResponse<{
        updated: number;
        errors: string[];
      }>>('/devices/bulk', {
        deviceIds,
        updates,
      });
      
      if (response.data.success) {
        return {
          success: true,
          updated: response.data.data.updated,
          errors: response.data.data.errors,
        };
      } else {
        throw new Error(response.data.error || 'Failed to update devices');
      }
    } catch (error) {
      console.error('Error bulk updating devices:', error);
      return {
        success: false,
        updated: 0,
        errors: [error instanceof Error ? error.message : 'Bulk update failed'],
      };
    }
  }

  async bulkDeleteDevices(deviceIds: string[]): Promise<{
    success: boolean;
    deleted: number;
    errors: string[];
  }> {
    try {
      const response = await this.api.delete<ApiResponse<{
        deleted: number;
        errors: string[];
      }>>('/devices/bulk', {
        data: { deviceIds },
      });
      
      if (response.data.success) {
        return {
          success: true,
          deleted: response.data.data.deleted,
          errors: response.data.data.errors,
        };
      } else {
        throw new Error(response.data.error || 'Failed to delete devices');
      }
    } catch (error) {
      console.error('Error bulk deleting devices:', error);
      return {
        success: false,
        deleted: 0,
        errors: [error instanceof Error ? error.message : 'Bulk delete failed'],
      };
    }
  }
}

// Create and export singleton instance
const deviceService = new DeviceService();

export default deviceService;