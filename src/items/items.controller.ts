
import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { SearchItemsDto } from './dto/search-items.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('items')
export class ItemsController {
  constructor(private itemsService: ItemsService) {}

  @Get('search')
  async search(@Query() searchDto: SearchItemsDto) {
    return this.itemsService.search(searchDto);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createItemDto: CreateItemDto, @Request() req) {
    return this.itemsService.create(createItemDto, req.user.userId);
  }
}
