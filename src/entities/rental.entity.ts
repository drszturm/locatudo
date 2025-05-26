
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Item } from './item.entity';

export enum RentalStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

@Entity('rentals')
export class Rental {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  itemId: number;

  @Column()
  renterId: number;

  @Column()
  ownerId: number;

  @Column('timestamp')
  startDate: Date;

  @Column('timestamp')
  endDate: Date;

  @Column({ nullable: true })
  durationHours: number;

  @Column({ nullable: true })
  durationDays: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalPrice: number;

  @Column({
    type: 'enum',
    enum: RentalStatus,
    default: RentalStatus.PENDING,
  })
  status: RentalStatus;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Item, item => item.rentals)
  @JoinColumn({ name: 'itemId' })
  item: Item;

  @ManyToOne(() => User, user => user.rentals)
  @JoinColumn({ name: 'renterId' })
  renter: User;

  @ManyToOne(() => User, user => user.ownedRentals)
  @JoinColumn({ name: 'ownerId' })
  owner: User;
}
