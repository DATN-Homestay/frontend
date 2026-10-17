import { apiClient } from './apiClient';
import type { HomestayItem, CustomerBooking, ReviewSubmission } from '../types/customer';

export const customerService = {
  async getHomestays(city?: string, limit = 20, offset = 0): Promise<{ items: HomestayItem[]; total: number }> {
    try {
      return await apiClient('/homestays', {
        params: { city, limit, offset },
      });
    } catch {
      // Mock fallback nếu DB trống
      return {
        items: [
          {
            id: '1',
            name: 'Mây Homestay Đà Lạt',
            city: 'Đà Lạt',
            address: '123 Đường An Bình, Phường 3, Đà Lạt',
            latitude: 11.9404,
            longitude: 108.4583,
            average_rating: 4.8,
            total_reviews: 24,
            is_claimed: 1,
            cancellation_policy: 'FLEXIBLE',
            amenities_json: { wifi: true, bbq: true, pool: false, view: true },
            rooms: [
              {
                id: '101',
                homestay_id: '1',
                room_name: 'Phòng Deluxe Hướng Đồi (Deluxe Mountain View)',
                capacity: 2,
                base_price: 650000,
                bed_info: '1 Giường đôi Queen Size',
                area_sqm: 28,
                amenities: ['Ban công ngắm mây', 'Bồn tắm nằm', 'Điều hòa 2 chiều', 'Wifi 150Mbps', 'Máy sấy tóc'],
                images: [{ id: '1', image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800', is_primary: 1, sort_order: 1 }],
              },
              {
                id: '102',
                homestay_id: '1',
                room_name: 'Phòng Gia Đình Sân Hiên Riêng (Family Suite)',
                capacity: 4,
                base_price: 1150000,
                bed_info: '2 Giường đôi King Size',
                area_sqm: 48,
                amenities: ['Sân hiên nướng BBQ', 'Bếp nấu riêng', 'Smart TV 55 inch', 'Tủ lạnh lớn', 'View thung lũng'],
                images: [{ id: '2', image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800', is_primary: 1, sort_order: 1 }],
              },
              {
                id: '103',
                homestay_id: '1',
                room_name: 'Bungalow Gỗ Thông Giữa Vườn Hoa (Cozy Cabin)',
                capacity: 3,
                base_price: 850000,
                bed_info: '1 Giường King + 1 Giường Sofa',
                area_sqm: 35,
                amenities: ['Lối đi riêng', 'Lò sưởi củi', 'Bàn trà ngoài trời', 'Bao gồm bữa sáng', 'Đỗ xe 7 chỗ'],
                images: [{ id: '3', image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', is_primary: 1, sort_order: 1 }],
              },
            ],
          },
          {
            id: '2',
            name: 'Sun & Sea Villa Vũng Tàu',
            city: 'Vũng Tàu',
            district: 'Bãi Sau',
            address: '45 Thùy Vân, Phường Thắng Tam, Vũng Tàu',
            latitude: 10.3392,
            longitude: 107.0843,
            average_rating: 4.9,
            total_reviews: 38,
            is_claimed: 1,
            cancellation_policy: 'FLEXIBLE',
            amenities_json: { pool: true, bbq: true, sea_view: true },
            rooms: [
              {
                id: '201',
                homestay_id: '2',
                room_name: 'Villa Nguyên Căn Hồ Bơi Riêng',
                capacity: 8,
                base_price: 2800000,
                bed_info: '4 Giường đôi King',
                area_sqm: 120,
                amenities: ['Hồ bơi riêng', 'View biển 100%', 'Bếp BBQ sân thượng'],
                images: [{ id: '21', image_url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800', is_primary: 1, sort_order: 1 }],
              },
            ],
          },
          {
            id: '3',
            name: 'Sapa Eco Pine Lodge',
            city: 'Sa Pa',
            district: 'Tả Van',
            address: 'Thôn Tả Van Giáy, Xã Tả Van, Sa Pa',
            latitude: 22.3039,
            longitude: 103.8863,
            average_rating: 4.7,
            total_reviews: 19,
            is_claimed: 1,
            cancellation_policy: 'STRICT',
            amenities_json: { mountain_view: true, fireplace: true },
            rooms: [
              {
                id: '301',
                homestay_id: '3',
                room_name: 'Bungalow Gỗ Pơ Mu Ruộng Bậc Thang',
                capacity: 2,
                base_price: 750000,
                bed_info: '1 Giường King',
                area_sqm: 32,
                amenities: ['View ruộng bậc thang', 'Lò sưởi ấm cúng', 'Bồn tắm gỗ'],
                images: [{ id: '31', image_url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800', is_primary: 1, sort_order: 1 }],
              },
            ],
          },
          {
            id: '4',
            name: 'Hanoi Old Quarter Heritage Home',
            city: 'Hà Nội',
            district: 'Hoàn Kiếm',
            address: '18 Hàng Bè, Hoàn Kiếm, Hà Nội',
            latitude: 21.0333,
            longitude: 105.8544,
            average_rating: 4.8,
            total_reviews: 42,
            is_claimed: 1,
            cancellation_policy: 'FLEXIBLE',
            amenities_json: { city_view: true, kitchen: true },
            rooms: [
              {
                id: '401',
                homestay_id: '4',
                room_name: 'Studio Indochine Giữa Lòng Phố Cổ',
                capacity: 2,
                base_price: 590000,
                bed_info: '1 Giường đôi Queen',
                area_sqm: 26,
                amenities: ['Ban công ngắm phố', 'Khu bếp tiện nghi', 'Gần Hồ Gươm'],
                images: [{ id: '41', image_url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', is_primary: 1, sort_order: 1 }],
              },
            ],
          },
        ],
        total: 4,
      };
    }
  },

  async getHomestayDetail(id: string): Promise<HomestayItem> {
    return await apiClient(`/homestays/${id}`);
  },

  async createBooking(data: { room_id: string; check_in_date: string; check_out_date: string; customer_note?: string }) {
    return await apiClient('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMyTrips(): Promise<CustomerBooking[]> {
    return await apiClient('/customer/bookings');
  },

  async submitReview(data: ReviewSubmission) {
    return await apiClient(`/bookings/${data.booking_id}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
