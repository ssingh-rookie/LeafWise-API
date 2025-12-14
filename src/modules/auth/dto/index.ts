// ============================================================================
// Authentication DTOs
// ============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

// Sign Up DTO
export class SignUpDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters)',
    example: 'securepassword123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @ApiProperty({
    description: 'User display name',
    example: 'John Doe',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;
}

// Sign In DTO
export class SignInDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'securepassword123',
  })
  @IsString()
  password: string;
}

// Refresh Token DTO
export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token from login response',
  })
  @IsString()
  refreshToken: string;
}

// Forgot Password DTO
export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address to send password reset link',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;
}

// Reset Password DTO
export class ResetPasswordDto {
  @ApiProperty({
    description: 'Access token from password reset email link (access_token parameter)',
  })
  @IsString()
  accessToken: string;

  @ApiProperty({
    description: 'Refresh token from password reset email link (refresh_token parameter)',
  })
  @IsString()
  refreshToken: string;

  @ApiProperty({
    description: 'New password (minimum 8 characters)',
    example: 'newSecurePassword123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  newPassword: string;
}
