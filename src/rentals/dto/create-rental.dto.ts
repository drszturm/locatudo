
import { IsNumber, IsDateString } from 'class-validator';

export class CreateRentalDto {
  @IsNumber()
  itemId: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
