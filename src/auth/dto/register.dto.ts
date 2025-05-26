
import { IsEmail, IsString, MinLength, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  latitude?: number;

  @IsOptional()
  longitude?: number;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsString()
  phone?: string;
}
