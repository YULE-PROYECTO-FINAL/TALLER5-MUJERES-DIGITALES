import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dtos/create-role.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';


@Injectable()
export class RoleService {
    constructor(
        @InjectRepository(Role)
        private readonly roleRepo: Repository<Role>,
    ) {}

    async findAll(): Promise<Role[]> {
        return this.roleRepo.find({ relations: ['users'] });
    }

    async findOne(id: number): Promise<Role> {
        const role = await this.roleRepo.findOne({
        where: { id },
        relations: ['users'],
        });
        if (!role) throw new NotFoundException(`Role with ID ${id} not found`);
        return role;
    }

    async create(dto: CreateRoleDto): Promise<Role> {
        const exists = await this.roleRepo.findOne({
        where: { nombre: dto.nombre },
        });
        if (exists) throw new BadRequestException('Role name already exists');

        const newRole = this.roleRepo.create(dto);
        return this.roleRepo.save(newRole);
    }

    async update(id: number, dto: UpdateRoleDto): Promise<Role> {
        const role = await this.findOne(id);
        Object.assign(role, dto);
        return this.roleRepo.save(role);
    }

    async remove(id: number): Promise<{ message: string }> {
        const role = await this.findOne(id);
        await this.roleRepo.remove(role);
        return { message: `Role ${id} removed` };
    }

    async findOneByName(nombre: string): Promise<Role | null> {
        const role = await this.roleRepo.findOne({ 
            where: { nombre }, 
        });
        return role;
    }


}
