import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    UseGuards,
    ParseIntPipe,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dtos/create-role.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';

@Controller('roles')
//@UseGuards(JwtAuthGuard, RolesGuard)
export class RoleController {
    constructor(private readonly roleService: RoleService) {}

    //@Roles(UserRole.ADMIN)
    @Get()
    findAll() {
        return this.roleService.findAll();
    }

    //@Roles(UserRole.ADMIN)
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.roleService.findOne(id);
    }

    //@Roles(UserRole.ADMIN)
    @Post()
    create(@Body() dto: CreateRoleDto) {
        return this.roleService.create(dto);
    }

    @Roles(UserRole.ADMIN)
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateRoleDto,
    ) {
        return this.roleService.update(id, dto);
    }

    @Roles(UserRole.ADMIN)
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.roleService.remove(id);
    }
}
