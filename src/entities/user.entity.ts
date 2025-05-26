
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Item } from './item.entity';
import { Rental } from './rental.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ nullable: true })
  locationAddress: string;

  @Column('decimal', { precision: 10, scale: 8, nullable: true })
  locationLatitude: number;

  @Column('decimal', { precision: 11, scale: 8, nullable: true })
  locationLongitude: number;

  @Column({ nullable: true })
  phone: string;

  @Column({ default: false })
  verified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Item, item => item.owner)
  items: Item[];

  @OneToMany(() => Rental, rental => rental.renter)
  rentals: Rental[];

  @OneToMany(() => Rental, rental => rental.owner)
  ownedRentals: Rental[];
}
