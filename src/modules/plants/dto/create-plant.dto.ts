import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsIn,
  IsDateString,
  MaxLength,
  IsUrl,
} from 'class-validator';

export class CreatePlantDto {
  @ApiProperty({ description: 'Species UUID from identification' })
  @IsUUID()
  speciesId: string;

  @ApiPropertyOptional({
    description: 'Photo URL from identification to link as initial photo',
  })
  @IsOptional()
  @IsUrl()
  identificationPhotoUrl?: string;

  @ApiPropertyOptional({ description: 'Custom nickname', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nickname?: string;

  @ApiProperty({ description: 'Location in home', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  locationInHome: string;

  @ApiProperty({
    description: 'Light exposure',
    enum: ['low', 'medium', 'bright', 'direct'],
  })
  @IsIn(['low', 'medium', 'bright', 'direct'])
  lightExposure: 'low' | 'medium' | 'bright' | 'direct';

  @ApiPropertyOptional({ description: 'Date plant was acquired' })
  @IsOptional()
  @IsDateString()
  acquiredDate?: string;

  @ApiPropertyOptional({
    description: 'How plant was acquired',
    enum: ['purchased', 'propagated', 'gifted', 'unknown'],
  })
  @IsOptional()
  @IsIn(['purchased', 'propagated', 'gifted', 'unknown'])
  acquisitionMethod?: 'purchased' | 'propagated' | 'gifted' | 'unknown';

  @ApiPropertyOptional({ description: 'Additional notes', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
