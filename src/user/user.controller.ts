import {
    Controller,
    Get,
    Patch,
    Param,
    Body,
    UseGuards,
    Request,
    ForbiddenException,
    Post,
    Delete
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { UpdateUserDto } from './dtos/update-user.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from './dtos/create-user.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
    constructor(private readonly userService: UserService) {}

    /** Obtener datos del usuario autenticado */
    @Get('profile')
    async getProfile(@Request() req: any) {
        const user = await this.userService.findOne(req.user.userId);
        if (!user) throw new ForbiddenException('Usuario no encontrado');
        return user;
    }

    /** Obtener todos los usuarios (solo ADMIN) */
    @Get()
    @Roles(UserRole.ADMIN)
    async findAll() {
        return this.userService.findAll();
    }

    /** Obtener usuario por ID (solo ADMIN) */
    @Get(':id')
    @Roles(UserRole.ADMIN)
    async findOne(@Param('id') id: number) {
        return this.userService.findOne(id);
    }

    /**  Crear usuario (solo ADMIN) */
    @Post()
    @Public()
    async create(@Body() dto: CreateUserDto) {
        return this.userService.create(dto);
    }
    



    /** Actualizar datos del usuario autenticado */
    @Patch('update')
    async updateProfile(@Request() req: any, @Body() dto: UpdateUserDto) {
        return this.userService.update(req.user.userId, dto);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    async update(@Param('id') id: number, @Body() dto: UpdateUserDto) {
        return this.userService.update(id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    async delete(@Param('id') id: number) {
        return this.userService.delete(id);
    }
}
