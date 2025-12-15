import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlantPhotoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  storageUrl: string;

  @ApiPropertyOptional()
  thumbnailUrl: string | null;

  @ApiProperty()
  type: string;

  @ApiProperty()
  takenAt: Date;
}

export class SpeciesResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  scientificName: string;

  @ApiProperty()
  commonNames: string[];

  @ApiProperty()
  family: string;

  @ApiProperty()
  lightRequirement: string;

  @ApiProperty()
  waterFrequency: string;

  @ApiProperty()
  difficulty: string;
}

export class PlantResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  nickname: string;

  @ApiProperty()
  locationInHome: string;

  @ApiProperty()
  lightExposure: string;

  @ApiProperty()
  currentHealth: string;

  @ApiProperty()
  wateringFrequencyDays: number;

  @ApiPropertyOptional()
  lastWatered: Date | null;

  @ApiProperty()
  nextWaterDue: Date;

  @ApiPropertyOptional()
  acquiredDate: Date | null;

  @ApiProperty()
  acquisitionMethod: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: SpeciesResponseDto })
  species: SpeciesResponseDto;

  @ApiProperty({ type: [PlantPhotoResponseDto] })
  photos: PlantPhotoResponseDto[];
}
