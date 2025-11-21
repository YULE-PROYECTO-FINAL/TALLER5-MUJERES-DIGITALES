import { Test, TestingModule } from '@nestjs/testing';
import { User, UserRole } from '../user/entities/user.entity'; 
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from '../user/user.service';
import { Repository } from 'typeorm';
import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { RoleService } from '../role/role.service';

jest.mock('argon2');

describe('UserService', () => {
  let service: UserService;
  let userRepo: jest.Mocked<Repository<User>>;
  let roleService: jest.Mocked<RoleService>;

  const mockUserRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
  };

  const mockRoleService = {
    findOneByName: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: RoleService, useValue: mockRoleService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepo = module.get(getRepositoryToken(User));
    roleService = module.get(RoleService);

    jest.clearAllMocks();
  });

  // ======================================
  // FIND ALL
  // ======================================
  describe('findAll', () => {
    it('It must return all users with a role relationship', async () => {
      // Arrange
      const users = [{ id: 1 }, { id: 2 }];
      userRepo.find.mockResolvedValue(users as any);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(users);
      expect(userRepo.find).toHaveBeenCalledWith({ relations: ['role'] });
    });
  });

  // ======================================
  // FIND ONE
  // ======================================
  describe('findOne', () => {
    it('It must return an existing user', async () => {
      // Arrange
      const user = { id: 1 };
      userRepo.findOne.mockResolvedValue(user as any);

      // Act
      const result = await service.findOne(1);

      // Assert
      expect(result).toEqual(user);
    });

    it('It must throw NotFoundException if it does not exist', async () => {
      // Arrange
      userRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ======================================
  // CREATE
  // ======================================
  describe('create', () => {
    it('It must create a user with the role', async () => {
      // Arrange
      const dto = { email: 'test@mail.com', password: '1234', role: UserRole.CLIENT };
      const roleEntity = { id: 2, nombre: 'CLIENT' };

      mockRoleService.findOneByName.mockResolvedValue(roleEntity as any);
      userRepo.create.mockReturnValue({ ...dto, role: roleEntity } as any);
      userRepo.save.mockResolvedValue({ id: 1, ...dto, role: roleEntity } as any);

      (argon2.hash as jest.Mock).mockResolvedValue('hashed_password');

      // Act
      const result = await service.create(dto as any);

      // Assert
      expect(result.id).toBe(1);
      expect(userRepo.create).toHaveBeenCalled();
      expect(mockRoleService.findOneByName).toHaveBeenCalledWith('CLIENT');
    });

    it('It must throw an error if the role does not exist', async () => {
      // Arrange
      mockRoleService.findOneByName.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.create({ email: 'a', password: 'b', role: 'NO_EXISTE' } as any),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ======================================
  // UPDATE
  // ======================================
  describe('update', () => {
    it('It must update the username and hashear the password', async () => {
      // Arrange
      const existingUser = { id: 1, password: 'old', role: { nombre: UserRole.ADMIN } };
      const dto = { password: 'newpass' };

      jest.spyOn(service, 'findOne').mockResolvedValue(existingUser as any);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed_pass');

      userRepo.save.mockResolvedValue({ ...existingUser, password: 'hashed_pass' } as any);

      // Act
      const result = await service.update(1, dto);

      // Assert
      expect(result.password).toBe('hashed_pass');
    });

    it('It must throw an error if the role to be updated does not exist', async () => {
      // Arrange
      const existingUser = { id: 1, role: { nombre: UserRole.ADMIN } };
      jest.spyOn(service, 'findOne').mockResolvedValue(existingUser as any);

      mockRoleService.findOneByName.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(1, { role: 'NO_EXISTE' } as any)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ======================================
  // DELETE
  // ======================================
  describe('delete', () => {
    it('It must delete a client user', async () => {
      // Arrange
      const user = { id: 5, role: { nombre: UserRole.CLIENT } };
      jest.spyOn(service, 'findOne').mockResolvedValue(user as any);

      userRepo.delete.mockResolvedValue({} as any);

      // Act
      const result = await service.delete(5);

      // Assert
      expect(result).toEqual({ message: 'Usuario eliminado correctamente' });
      expect(userRepo.delete).toHaveBeenCalledWith({ id: 5 });
    });

    it('It must throw a ForbiddenException if you attempt to delete ADMIN', async () => {
      // Arrange
      const user = { id: 1, role: { nombre: UserRole.ADMIN } };
      jest.spyOn(service, 'findOne').mockResolvedValue(user as any);

      // Act & Assert
      await expect(service.delete(1)).rejects.toThrow(ForbiddenException);
    });
  });
});
