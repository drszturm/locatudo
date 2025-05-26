
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from '../entities/user.entity';
import { Item } from '../entities/item.entity';
import { Rental } from '../entities/rental.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Item, Rental])],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
