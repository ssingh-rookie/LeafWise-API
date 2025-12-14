import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SpeciesDto {
  @ApiPropertyOptional({
    description: 'Species UUID in database (if exists)',
    nullable: true,
  })
  id: string | null;

  @ApiProperty({
    description: 'Scientific/botanical name',
    example: 'Monstera deliciosa',
  })
  scientificName: string;

  @ApiProperty({
    description: 'Common names',
    example: ['Swiss Cheese Plant', 'Monstera'],
  })
  commonNames: string[];

  @ApiProperty({ description: 'Plant family', example: 'Araceae' })
  family: string;

  @ApiProperty({ description: 'Confidence score 0-1', example: 0.92 })
  confidence: number;
}

export class SimilarSpeciesDto {
  @ApiProperty({ description: 'Scientific name' })
  scientificName: string;

  @ApiProperty({ description: 'Common name' })
  commonName: string;

  @ApiProperty({ description: 'Confidence score 0-1' })
  confidence: number;

  @ApiPropertyOptional({ description: 'Reference image URL', nullable: true })
  imageUrl: string | null;
}

export class PhotoInfoDto {
  @ApiProperty({ description: 'Full-size image URL' })
  url: string;

  @ApiProperty({ description: 'Thumbnail URL (300x300)' })
  thumbnailUrl: string;
}

export class IdentificationDataDto {
  @ApiProperty({ type: SpeciesDto })
  species: SpeciesDto;

  @ApiProperty({
    type: [SimilarSpeciesDto],
    description: 'Alternative matches (if confidence < 70%)',
  })
  similarSpecies: SimilarSpeciesDto[];

  @ApiProperty({ type: PhotoInfoDto })
  photo: PhotoInfoDto;
}

export class IdentificationMetaDto {
  @ApiProperty({
    description: 'AI provider used',
    enum: ['plant-id', 'gemini'],
  })
  provider: 'plant-id' | 'gemini';

  @ApiProperty({ description: 'Processing time in milliseconds', example: 1250 })
  processingTimeMs: number;
}

export class IdentificationResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: IdentificationDataDto })
  data: IdentificationDataDto;

  @ApiProperty({ type: IdentificationMetaDto })
  meta: IdentificationMetaDto;
}
