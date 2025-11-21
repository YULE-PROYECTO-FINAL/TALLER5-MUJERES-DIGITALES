import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Order } from '../../order/entities/order.entity';
import { Cart } from '../../cart/entities/cart.entity';
import { Role } from '../../role/entities/role.entity';

// Enum de roles de usuario
export enum UserRole {
  ADMIN = 'ADMIN',
  CLIENT = 'CLIENT',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  nombre?: string;

  @Column({ nullable: true })
  apellido?: string;

  @Column({ unique: true })
  email: string;

  @Column({select: false})
  password: string;

  @Column({ nullable: true })
  telefono?: string;

  @Column({ name: 'roleId', type: 'int', default: 2 })
  roleId: number;

  // Verificación de correo
  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'text', nullable: true })
  verificationToken?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  verificationTokenExpiresAt?: Date | null;

  // Recuperación de contraseña
  @Column({ type: 'text', nullable: true })
  resetToken?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpiresAt?: Date | null;

  // Relación con órdenes
  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  // Relación con carritos
  @OneToMany(() => Cart, (cart) => cart.user)
  carts: Cart[];

  // Relación con roles
  @ManyToOne(()=> Role, (role)=>role.users)
  @JoinColumn({name: 'roleId'})
  role: Role;
}
