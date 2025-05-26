
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Item } from '../entities/item.entity';
import { Rental } from '../entities/rental.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Item)
    private itemRepository: Repository<Item>,
    @InjectRepository(Rental)
    private rentalRepository: Repository<Rental>,
  ) {}

  async getUsers() {
    return this.userRepository.find({
      select: ['id', 'email', 'name', 'role', 'locationAddress', 'phone', 'verified', 'createdAt', 'updatedAt'],
    });
  }

  async getItems() {
    return this.itemRepository.find({
      relations: ['owner'],
    });
  }

  async getRentals() {
    return this.rentalRepository.find({
      relations: ['item', 'renter', 'owner'],
    });
  }
}
