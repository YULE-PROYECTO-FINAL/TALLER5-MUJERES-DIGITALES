import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../user/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from './mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { RoleService } from '../role/role.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private jwtService: JwtService,
    private mailService: MailService,
    private readonly roleService: RoleService,
  ) {}

  private addHours(date: Date, hours: number) {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }

  private addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

async register(dto: RegisterDto) { 
    const exists = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('El usuario ya existe');

    const hashed = await argon2.hash(dto.password);
    const verificationToken = uuidv4();

    const user = this.usersRepo.create({
      email: dto.email,
      password: hashed,
      nombre: dto.nombre,     
      apellido: dto.apellido, 
      telefono: dto.telefono,
      verificationToken,
      verificationTokenExpiresAt: this.addHours(new Date(), 5),
      roleId: 2,
      isVerified: false,
    });

    await this.usersRepo.save(user);
    await this.mailService.sendVerificationEmail(dto.email, verificationToken);

    return { message: 'Usuario registrado. Verifica tu correo.' };
}


  // Verificación de correo
  async verifyEmail(token: string) {
    const user = await this.usersRepo.findOne({ where: { verificationToken: token } });
    if (!user) throw new BadRequestException('Token inválido o expirado');

    if (!user.verificationTokenExpiresAt || new Date() > user.verificationTokenExpiresAt) {
      throw new BadRequestException('El token de verificación ha expirado');
    }

    if (user.isVerified) return { message: 'Cuenta ya verificada.' };

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpiresAt = null;

    await this.usersRepo.save(user);
    return { message: 'Cuenta verificada con éxito.' };
  }

  // Login de usuario
 async login(email: string, password: string) {

    const user = await this.usersRepo.findOne({ 
        where: { email },
        relations: ['role'],
        select: [
            'id', 'email', 'password', 'isVerified'
        ]
    }); 

    if (!user) throw new BadRequestException('Usuario no encontrado');

    const valid = await argon2.verify(user.password, password);
    if (!valid) throw new BadRequestException('Contraseña incorrecta');

    if (!user.isVerified) {
      throw new BadRequestException('Debes verificar tu correo antes de iniciar sesión.');
    }
  
    const roleName = user.role.nombre;

    const payload = { 
        sub: user.id, 
        email: user.email, 
        role: roleName 
    }; 
    
    const token = this.jwtService.sign(payload);

    return {
        access_token: token,
        user: { id: user.id, email: user.email, role: roleName },
    };
}

  // Solicitud de recuperación de contraseña
  async requestPasswordReset(email: string) {
    const user = await this.usersRepo.findOne({ where: { email } });
    if (!user) throw new BadRequestException('Usuario no encontrado');

    const resetToken = uuidv4();
    user.resetToken = resetToken;
    user.resetTokenExpiresAt = this.addMinutes(new Date(), 20);

    await this.usersRepo.save(user);
    await this.mailService.sendPasswordResetEmail(email, resetToken);

    return { message: 'Correo de recuperación enviado. Revisa tu bandeja.' };
  }

  // Reseteo de contraseña
  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersRepo.findOne({ where: { resetToken: token } });
    if (!user) throw new BadRequestException('Token inválido');

    if (!user.resetTokenExpiresAt || new Date() > user.resetTokenExpiresAt) {
      throw new BadRequestException('El token de recuperación ha expirado');
    }

    user.password = await argon2.hash(newPassword);
    user.resetToken = null;
    user.resetTokenExpiresAt = null;

    await this.usersRepo.save(user);
    return { message: 'Contraseña actualizada correctamente.' };
  }
}
