
import { IsString, IsNumber, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ItemCondition } from '../../entities/item.entity';

class LocationDto {
  @IsString()
  address: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}

export class CreateItemDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  category: string;

  @IsNumber()
  pricePerHour: number;

  @IsNumber()
  pricePerDay: number;

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  condition?: ItemCondition;
}
