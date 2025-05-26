
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from '../entities/item.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { SearchItemsDto } from './dto/search-items.dto';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private itemRepository: Repository<Item>,
  ) {}

  async create(createItemDto: CreateItemDto, ownerId: number) {
    const { location, ...itemData } = createItemDto;
    
    const item = this.itemRepository.create({
      ...itemData,
      ownerId,
      locationAddress: location.address,
      locationLatitude: location.latitude,
      locationLongitude: location.longitude,
    });

    await this.itemRepository.save(item);
    
    return this.itemRepository.findOne({
      where: { id: item.id },
      relations: ['owner'],
    });
  }

  async search(searchDto: SearchItemsDto) {
    const { latitude, longitude, radius = 50, category, minPrice, maxPrice } = searchDto;

    let queryBuilder = this.itemRepository.createQueryBuilder('item')
      .leftJoinAndSelect('item.owner', 'owner')
      .where('item.available = :available', { available: true });

    if (category) {
      queryBuilder.andWhere('LOWER(item.category) LIKE LOWER(:category)', { 
        category: `%${category}%` 
      });
    }

    if (minPrice) {
      queryBuilder.andWhere('item.pricePerDay >= :minPrice', { minPrice });
    }

    if (maxPrice) {
      queryBuilder.andWhere('item.pricePerDay <= :maxPrice', { maxPrice });
    }

    let items = await queryBuilder.getMany();

    if (latitude && longitude) {
      const lat = parseFloat(latitude.toString());
      const lng = parseFloat(longitude.toString());
      const radiusKm = parseFloat(radius.toString());

      items = items.filter(item => {
        const distance = this.calculateDistance(
          lat, 
          lng, 
          parseFloat(item.locationLatitude.toString()), 
          parseFloat(item.locationLongitude.toString())
        );
        return distance <= radiusKm;
      });
    }

    return items;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
}
