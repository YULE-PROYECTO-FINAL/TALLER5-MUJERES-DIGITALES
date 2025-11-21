import { Test, TestingModule } from '@nestjs/testing';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dtos/create-role.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';
import { Role } from './entities/role.entity';
import { ParseIntPipe } from '@nestjs/common';

// --- Mocks de Datos ---
const mockRole: Role = {
  id: 1,
  nombre: 'Admin',
  descripcion: 'Administrador del sistema',
  users: [],
};

const mockRoleList: Role[] = [mockRole];
const mockCreateDto: CreateRoleDto = { nombre: 'Editor', descripcion: 'Edita' };
const mockUpdateDto: UpdateRoleDto = { descripcion: 'Edita avanzado' };

// --- Mock del Servicio ---
const mockRoleService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

// --- Test Suite para RoleController ---
describe('RoleController', () => {
  let controller: RoleController;
  let service: RoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [
        {
          provide: RoleService,
          useValue: mockRoleService,
        },
      ],
    }).compile();

    controller = module.get<RoleController>(RoleController);
    service = module.get<RoleService>(RoleService);
    
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ------------------------------------------
  // findAll (GET /roles)
  // ------------------------------------------
  describe('findAll', () => {
    it('should call roleService.findAll and return a list of roles', async () => {
      // **A**rrange
      mockRoleService.findAll.mockResolvedValue(mockRoleList);

      // **A**ct
      const result = await controller.findAll();

      // **A**ssert
      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRoleList);
    });
  });

  // ------------------------------------------
  // findOne (GET /roles/:id)
  // ------------------------------------------
  describe('findOne', () => {
    it('should call roleService.findOne with the correct ID and return a single role', async () => {
      // **A**rrange
      const roleId = 1;
      mockRoleService.findOne.mockResolvedValue(mockRole);

      // **A**ct
      // Usamos el pipe ParseIntPipe implícito en el controlador
      const result = await controller.findOne(roleId);

      // **A**ssert
      expect(service.findOne).toHaveBeenCalledWith(roleId);
      expect(service.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRole);
    });
  });

  // ------------------------------------------
  // create (POST /roles)
  // ------------------------------------------
  describe('create', () => {
    it('should call roleService.create and return the created role', async () => {
      // **A**rrange
      const newRole = { id: 2, ...mockCreateDto } as Role;
      mockRoleService.create.mockResolvedValue(newRole);

      // **A**ct
      const result = await controller.create(mockCreateDto);

      // **A**ssert
      expect(service.create).toHaveBeenCalledWith(mockCreateDto);
      expect(service.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(newRole);
    });
  });

  // ------------------------------------------
  // update (PATCH /roles/:id)
  // ------------------------------------------
  describe('update', () => {
    it('should call roleService.update with the ID and DTO, and return the updated role', async () => {
      // **A**rrange
      const roleId = 1;
      const updatedRole = { ...mockRole, ...mockUpdateDto } as Role;
      mockRoleService.update.mockResolvedValue(updatedRole);

      // **A**ct
      const result = await controller.update(roleId, mockUpdateDto);

      // **A**ssert
      expect(service.update).toHaveBeenCalledWith(roleId, mockUpdateDto);
      expect(service.update).toHaveBeenCalledTimes(1);
      expect(result).toEqual(updatedRole);
    });
  });

  // ------------------------------------------
  // remove (DELETE /roles/:id)
  // ------------------------------------------
  describe('remove', () => {
    it('should call roleService.remove with the correct ID and return the success message', async () => {
      // **A**rrange
      const roleId = 1;
      const message = { message: `Role ${roleId} removed` };
      mockRoleService.remove.mockResolvedValue(message);

      // **A**ct
      const result = await controller.remove(roleId);

      // **A**ssert
      expect(service.remove).toHaveBeenCalledWith(roleId);
      expect(service.remove).toHaveBeenCalledTimes(1);
      expect(result).toEqual(message);
    });
  });
});