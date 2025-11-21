import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { UpdateUserDto } from './dtos/update-user.dto';
import * as argon2 from 'argon2';
import { CreateUserDto } from './dtos/create-user.dto';
import { RoleService } from '../role/role.service'; 

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly usersRepo: Repository<User>,
        private readonly roleService: RoleService, 
    ) { } // <-- Cierre del constructor

    // ===========================
    // FIND ALL
    // ===========================
    async findAll(): Promise<User[]> {
        return this.usersRepo.find({ relations: ['role'] });
    }

    // ===========================
    // FIND ONE
    // ===========================
    async findOne(id: number): Promise<User> {
        // Cargar la relación 'role'
        const user = await this.usersRepo.findOne({ where: { id }, relations: ['role'] });
        if (!user) throw new NotFoundException('Usuario no encontrado');
        return user;
    }

    // ===========================
    // UPDATE
    // ===========================
    async update(id: number, dto: UpdateUserDto, currentUser?: User) {
        // Asegura que se cargue la relación 'role' para la lógica de comparación
        const user = await this.findOne(id); 

        // Si es un cliente, no se puede actualizar el rol
        if (currentUser && currentUser.role.nombre !== UserRole.ADMIN) {
            // No podemos usar delete sobre dto.role si no es opcional, 
            // pero lo eliminamos para evitar errores de tipo si se pasa al assign.
            if ('role' in dto) {
                delete dto.role;
            }
        }

        if (dto.password) {
            dto.password = await argon2.hash(dto.password);
        }

        // Manejar actualización de la entidad Role si se proporciona en DTO
        if (dto.role) {
            const newRoleEntity = await this.roleService.findOneByName(dto.role as string);
            if (!newRoleEntity) throw new InternalServerErrorException(`Role ${dto.role} not found`);
            
            user.role = newRoleEntity;
            delete dto.role; // Eliminar la propiedad string del DTO
        }

        Object.assign(user, dto);
        return this.usersRepo.save(user);
    }

    // ===========================
    // CREATE
    // ===========================
    async create(dto: CreateUserDto) {
        const roleName = dto.role || UserRole.CLIENT;

        console.log('Buscanco el rol:', roleName);
        
        // 1. Obtener la entidad Role
        const roleEntity = await this.roleService.findOneByName(roleName as string);
        if (!roleEntity) {
            console.log('Roles disponibles:', await this.roleService.findAll());
            throw new InternalServerErrorException(`Role "${roleName}" not found. Available roles: ADMIN, CLIENT`);
        }
        
        // 2. usar entidad rol
        const { role, ...restOfDto } = dto;
        
        const user = this.usersRepo.create({
            nombre: dto.nombre,
            apellido: dto.apellido,
            email: dto.email,
            telefono: dto.telefono,
            role: roleEntity,
        });
        
        if (dto.password) {
            user.password = await argon2.hash(dto.password);
        }

        user.password = await argon2.hash(dto.password);
        
        return this.usersRepo.save(user);
    }
    
    // ===========================
    // DELETE
    // ===========================
    async delete(id: number) {
        const user = await this.findOne(id);
        
        //  Comparar user.role.nombre (string)
        if (user.role.nombre === UserRole.ADMIN) {
            throw new ForbiddenException('No se puede eliminar un administrador');
        }
        
        await this.usersRepo.delete({ id });

        return { message: 'Usuario eliminado correctamente' };
    }
} 