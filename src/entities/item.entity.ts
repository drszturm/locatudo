
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Rental } from './rental.entity';

export enum ItemCondition {
  NEW = 'new',
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
}

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column()
  category: string;

  @Column('decimal', { precision: 10, scale: 2 })
  pricePerHour: number;

  @Column('decimal', { precision: 10, scale: 2 })
  pricePerDay: number;

  @Column()
  ownerId: number;

  @Column()
  locationAddress: string;

  @Column('decimal', { precision: 10, scale: 8 })
  locationLatitude: number;

  @Column('decimal', { precision: 11, scale: 8 })
  locationLongitude: number;

  @Column('text', { array: true, nullable: true })
  images: string[];

  @Column({ default: true })
  available: boolean;

  @Column({
    type: 'enum',
    enum: ItemCondition,
    default: ItemCondition.GOOD,
  })
  condition: ItemCondition;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, user => user.items)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @OneToMany(() => Rental, rental => rental.item)
  rentals: Rental[];
}
