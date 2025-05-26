
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rental } from '../entities/rental.entity';
import { Item } from '../entities/item.entity';
import { CreateRentalDto } from './dto/create-rental.dto';

@Injectable()
export class RentalsService {
  constructor(
    @InjectRepository(Rental)
    private rentalRepository: Repository<Rental>,
    @InjectRepository(Item)
    private itemRepository: Repository<Item>,
  ) {}

  async create(createRentalDto: CreateRentalDto, renterId: number) {
    const { itemId, startDate, endDate } = createRentalDto;

    const item = await this.itemRepository.findOne({ where: { id: itemId } });
    if (!item || !item.available) {
      throw new BadRequestException('Item not available');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

    const totalPrice = diffDays >= 1 ? 
      (diffDays * parseFloat(item.pricePerDay.toString())) : 
      (diffHours * parseFloat(item.pricePerHour.toString()));

    const rental = this.rentalRepository.create({
      itemId,
      renterId,
      ownerId: item.ownerId,
      startDate: start,
      endDate: end,
      durationHours: diffHours,
      durationDays: diffDays,
      totalPrice,
    });

    await this.rentalRepository.save(rental);
    
    return this.rentalRepository.findOne({
      where: { id: rental.id },
      relations: ['item', 'renter', 'owner'],
    });
  }

  async getUserRentals(userId: number) {
    return this.rentalRepository.find({
      where: [
        { renterId: userId },
        { ownerId: userId }
      ],
      relations: ['item', 'renter', 'owner'],
    });
  }
}
