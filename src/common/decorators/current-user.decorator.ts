// ============================================================================
// Current User Decorator
// ============================================================================
// Extracts the authenticated user from the request
// ============================================================================

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtUser {
  id: string;
  email: string;
  role: string;
}

/**
 * Decorator to extract the current user from the request
 *
 * @example
 * // Get the entire user object
 * @Get('profile')
 * async getProfile(@CurrentUser() user: JwtUser) {
 *   return user;
 * }
 *
 * @example
 * // Get a specific property
 * @Get('my-plants')
 * async getMyPlants(@CurrentUser('id') userId: string) {
 *   return this.plantsService.findByUserId(userId);
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtUser;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
