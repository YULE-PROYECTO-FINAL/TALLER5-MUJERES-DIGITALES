// user.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from './entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';


  // ====================================================
  // HELPERS PARA DTO
  // ====================================================
function createUserDtoMock(overrides?: Partial<CreateUserDto>): CreateUserDto {
  return {
    nombre: 'Test',
    apellido: 'User',
    email: 'test@example.com',
    password: '123456',
    role: UserRole.CLIENT,
    ...overrides,
  };
}

function updateUserDtoMock(overrides?: Partial<UpdateUserDto>): UpdateUserDto {
  return {
    nombre: 'Updated',
    apellido: 'User',
    email: 'updated@example.com',
    password: '654321',
    role: UserRole.CLIENT,
    ...overrides,
  };
}


  // ====================================================
  // TEST DEL CONTROLLER
  // ====================================================
describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  const mockUserService = {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ====================================================
  // TEST: GET PROFILE
  // ====================================================
  it('should return user profile', async () => {
    const mockUser = { id: 1, ...createUserDtoMock() };
    mockUserService.findOne.mockResolvedValue(mockUser);

    const req = { user: { userId: 1 } };
    const result = await controller.getProfile(req);
    expect(result).toEqual(mockUser);
    expect(mockUserService.findOne).toHaveBeenCalledWith(1);
  });

  it('should throw ForbiddenException if user not found', async () => {
    mockUserService.findOne.mockResolvedValue(null);
    const req = { user: { userId: 99 } };

    await expect(controller.getProfile(req)).rejects.toThrow(ForbiddenException);
  });

  // ====================================================
  // TEST: FINDALL
  // ====================================================
  it('should return all users', async () => {
    const mockUsers = [
      { id: 1, ...createUserDtoMock() },
      { id: 2, ...createUserDtoMock({ email: 'a@b.com' }) },
    ];
    mockUserService.findAll.mockResolvedValue(mockUsers);

    const result = await controller.findAll();
    expect(result).toEqual(mockUsers);
    expect(mockUserService.findAll).toHaveBeenCalled();
  });

  // ====================================================
  // TEST: FINDONE
  // ====================================================
  it('should return a single user by id', async () => {
    const mockUser = { id: 1, ...createUserDtoMock() };
    mockUserService.findOne.mockResolvedValue(mockUser);

    const result = await controller.findOne(1);
    expect(result).toEqual(mockUser);
    expect(mockUserService.findOne).toHaveBeenCalledWith(1);
  });

  // ====================================================
  // MOCK DEL SERVICE
  // ====================================================
  it('should create a user', async () => {
    const dto = createUserDtoMock({ email: 'newuser@example.com' });
    const mockUser = { id: 1, ...dto };
    mockUserService.create.mockResolvedValue(mockUser);

    const result = await controller.create(dto);
    expect(result).toEqual(mockUser);
    expect(mockUserService.create).toHaveBeenCalledWith(dto);
  });

  // ====================================================
  // TEST: UPDATE PROFILE
  // ====================================================
  it('should update profile', async () => {
    const dto = updateUserDtoMock();
    const updatedUser = { id: 1, ...dto };
    mockUserService.update.mockResolvedValue(updatedUser);

    const req = { user: { userId: 1 } };
    const result = await controller.updateProfile(req, dto);

    expect(result).toEqual(updatedUser);
    expect(mockUserService.update).toHaveBeenCalledWith(1, dto);
  });

  // ====================================================
  // TEST: UPDATE
  // ====================================================
  it('should update user by id', async () => {
    const dto = updateUserDtoMock();
    const updatedUser = { id: 2, ...dto };
    mockUserService.update.mockResolvedValue(updatedUser);

    const result = await controller.update(2, dto);
    expect(result).toEqual(updatedUser);
    expect(mockUserService.update).toHaveBeenCalledWith(2, dto);
  });

  // ====================================================
  // TEST: DELETE
  // ====================================================
  it('should delete user by id', async () => {
    mockUserService.delete.mockResolvedValue(true);

    const result = await controller.delete(1);
    expect(result).toBe(true);
    expect(mockUserService.delete).toHaveBeenCalledWith(1);
  });
});