import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class IdentifyPlantDto {
  @ApiProperty({
    description:
      'Array of base64 encoded plant images (1-5). More images from different angles = better accuracy. Recommended: leaf close-up, flower, whole plant.',
    example: ['/9j/4AAQSkZJRgABAQEASABIAAD...'],
    minItems: 1,
    maxItems: 5,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least 1 image is required' })
  @ArrayMaxSize(5, { message: 'Maximum 5 images allowed' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  images: string[];

  @ApiPropertyOptional({
    description: 'Image format hint',
    enum: ['jpeg', 'png', 'heic'],
    default: 'jpeg',
  })
  @IsOptional()
  @IsIn(['jpeg', 'png', 'heic'])
  imageFormat?: 'jpeg' | 'png' | 'heic';
}
