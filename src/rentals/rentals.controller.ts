
import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { RentalsService } from './rentals.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('rentals')
@UseGuards(JwtAuthGuard)
export class RentalsController {
  constructor(private rentalsService: RentalsService) {}

  @Post()
  async create(@Body() createRentalDto: CreateRentalDto, @Request() req) {
    return this.rentalsService.create(createRentalDto, req.user.userId);
  }

  @Get('my')
  async getUserRentals(@Request() req) {
    return this.rentalsService.getUserRentals(req.user.userId);
  }
}
