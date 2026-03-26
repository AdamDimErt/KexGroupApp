export declare enum UserRole {
    HOLDING_DIRECTOR = "HOLDING_DIRECTOR",
    RESTAURANT_DIRECTOR = "RESTAURANT_DIRECTOR"
}
export interface UserDto {
    id: string;
    phone: string;
    role: UserRole;
    restaurantIds: string[];
}
export interface SendOtpRequestDto {
    phone: string;
}
export interface SendOtpResponseDto {
    success: boolean;
    message: string;
    retryAfterSec?: number;
}
export interface VerifyOtpRequestDto {
    phone: string;
    code: string;
}
export interface AuthSuccessDto {
    accessToken: string;
    user: UserDto;
}
export interface RestaurantIndicatorDto {
    id: string;
    name: string;
    todayRevenue: number;
    planDeviationPercent: number;
    status: 'green' | 'red';
}
export interface DashboardOverviewDto {
    totalRevenue: number;
    totalAccountBalance: number;
    restaurants: RestaurantIndicatorDto[];
}
//# sourceMappingURL=index.d.ts.map