export interface JwtPayload {
  sub: string;
  role: string;
  tenantId: string;
  restaurantIds: string[];
}
