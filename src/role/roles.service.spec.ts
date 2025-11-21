import { Test, TestingModule } from '@nestjs/testing';
import { RoleService } from './role.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateRoleDto } from './dtos/create-role.dto'; 
import { UpdateRoleDto } from './dtos/update-role.dto';

// --- Mocks Inferred (Simulaciones) ---

// Mocks de la Entidad Role (Inferencia del RoleService)
const mockRoleEntity: Role = {
  id: 1,
  nombre: 'Admin',
  descripcion: 'Administrador del sistema',
  users: [],
};

const mockRoleList: Role[] = [
  mockRoleEntity,
  {
    ...mockRoleEntity,
    id: 2,
    nombre: 'User',
    descripcion: 'Usuario estándar',
  },
];

// Mocks de los DTOs (Inferencia del RoleService)
const mockCreateRoleDto: CreateRoleDto = {
  nombre: 'Editor',
  descripcion: 'Puede editar contenido',
};

const mockUpdateRoleDto: UpdateRoleDto = {
  descripcion: 'Nuevo editor de contenido',
};

// --- Mock del TypeORM Repository ---
const mockRoleRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(), 
  save: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
};

// --- Test Suite para RoleService ---
describe('RoleService', () => {
  let service: RoleService;
  let roleRepository: Repository<Role>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    
    // Limpiar mocks antes de cada test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ------------------------------------------
  // findAll
  // ------------------------------------------
  describe('findAll', () => {
    it('should return an array of roles', async () => {
      // **A**rrange
      mockRoleRepository.find.mockResolvedValue(mockRoleList);

      // **A**ct
      const result = await service.findAll();

      // **A**ssert
      expect(result).toEqual(mockRoleList);
      expect(mockRoleRepository.find).toHaveBeenCalledTimes(1);
      expect(mockRoleRepository.find).toHaveBeenCalledWith({ relations: ['users'] });
    });
  });

  // ------------------------------------------
  // findOne
  // ------------------------------------------
  describe('findOne', () => {
    it('should return a role if ID is found', async () => {
      // **A**rrange
      mockRoleRepository.findOne.mockResolvedValue(mockRoleEntity);
      const roleId = 1;

      // **A**ct
      const result = await service.findOne(roleId);

      // **A**ssert
      expect(result).toEqual(mockRoleEntity);
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({
        where: { id: roleId },
        relations: ['users'],
      });
    });

    it('should throw NotFoundException if role ID is not found', async () => {
      // **A**rrange
      mockRoleRepository.findOne.mockResolvedValue(null);
      const roleId = 99;

      // **A**ct & **A**ssert
      await expect(service.findOne(roleId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(roleId)).rejects.toThrow(`Role with ID ${roleId} not found`);
    });
  });

  // ------------------------------------------
  // create
  // ------------------------------------------
  describe('create', () => {
    it('should successfully create a new role', async () => {
      // **A**rrange
      const createdRole = { id: 3, ...mockCreateRoleDto } as Role;
      mockRoleRepository.findOne.mockResolvedValue(null); // No existe un rol con el mismo nombre
      mockRoleRepository.create.mockReturnValue(createdRole);
      mockRoleRepository.save.mockResolvedValue(createdRole);

      // **A**ct
      const result = await service.create(mockCreateRoleDto);

      // **A**ssert
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({
        where: { nombre: mockCreateRoleDto.nombre },
      });
      expect(mockRoleRepository.create).toHaveBeenCalledWith(mockCreateRoleDto);
      expect(mockRoleRepository.save).toHaveBeenCalledWith(createdRole);
      expect(result).toEqual(createdRole);
    });

    it('should throw BadRequestException if role name already exists', async () => {
      // **A**rrange
      mockRoleRepository.findOne.mockResolvedValue(mockRoleEntity); // Rol ya existe
      
      // **A**ct & **A**ssert
      await expect(service.create(mockCreateRoleDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(mockCreateRoleDto)).rejects.toThrow('Role name already exists');
      expect(mockRoleRepository.save).not.toHaveBeenCalled(); // No debe guardar si falla
    });
  });

  // ------------------------------------------
  // update
  // ------------------------------------------
  describe('update', () => {
    it('should successfully update an existing role', async () => {
      // **A**rrange
      const roleId = 1;
      const updatedRole = { 
        ...mockRoleEntity, 
        descripcion: mockUpdateRoleDto.descripcion 
      } as Role;

      // Mock para findOne
      jest.spyOn(service, 'findOne').mockResolvedValue(mockRoleEntity);
      // Mock para save
      mockRoleRepository.save.mockResolvedValue(updatedRole);

      // **A**ct
      const result = await service.update(roleId, mockUpdateRoleDto);

      // **A**ssert
      expect(service.findOne).toHaveBeenCalledWith(roleId);
      expect(mockRoleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockRoleEntity,
          descripcion: mockUpdateRoleDto.descripcion, // Verifica que la propiedad se haya asignado
        }),
      );
      expect(result).toEqual(updatedRole);
    });

    it('should throw NotFoundException if role ID to update is not found', async () => {
      // **A**rrange
      const roleId = 99;
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException());

      // **A**ct & **A**ssert
      await expect(service.update(roleId, mockUpdateRoleDto)).rejects.toThrow(NotFoundException);
      expect(mockRoleRepository.save).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------
  // remove
  // ------------------------------------------
  describe('remove', () => {
    it('should successfully remove a role', async () => {
      // **A**rrange
      const roleId = 1;
      jest.spyOn(service, 'findOne').mockResolvedValue(mockRoleEntity);
      mockRoleRepository.remove.mockResolvedValue(undefined); // remove retorna void

      // **A**ct
      const result = await service.remove(roleId);

      // **A**ssert
      expect(service.findOne).toHaveBeenCalledWith(roleId);
      expect(mockRoleRepository.remove).toHaveBeenCalledWith(mockRoleEntity);
      expect(result).toEqual({ message: `Role ${roleId} removed` });
    });

    it('should throw NotFoundException if role ID to remove is not found', async () => {
      // **A**rrange
      const roleId = 99;
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException());

      // **A**ct & **A**ssert
      await expect(service.remove(roleId)).rejects.toThrow(NotFoundException);
      expect(mockRoleRepository.remove).not.toHaveBeenCalled();
    });
  });
  
  // ------------------------------------------
  // findOneByName
  // ------------------------------------------
  describe('findOneByName', () => {
    it('should return a role if name is found', async () => {
      // **A**rrange
      const roleName = 'Admin';
      mockRoleRepository.findOne.mockResolvedValue(mockRoleEntity);

      // **A**ct
      const result = await service.findOneByName(roleName);

      // **A**ssert
      expect(result).toEqual(mockRoleEntity);
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({ 
          where: { nombre: roleName } 
      });
    });

    it('should return null if role name is not found', async () => {
      // **A**rrange
      const roleName = 'Ghost';
      mockRoleRepository.findOne.mockResolvedValue(null);

      // **A**ct
      const result = await service.findOneByName(roleName);

      // **A**ssert
      expect(result).toBeNull();
    });
  });
});