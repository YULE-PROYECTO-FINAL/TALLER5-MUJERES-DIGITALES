import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { Product } from '../product/entities/product.entity';
import { CartItem } from './entities/cart-item.entity'; // 👈 1. Importar CartItem

@Injectable()
export class CartService {
    constructor(
        @InjectRepository(Cart)
        private readonly cartRepo: Repository<Cart>,
        
        @InjectRepository(CartItem)
        private readonly itemRepo: Repository<CartItem>,
        
        @InjectRepository(Product)
        private readonly productRepo: Repository<Product>,
    ) {}

    // ==========================================
    // ENCONTRAR O CREAR CARRITO (Con items cargados)
    // ==========================================
    async findOrCreateCart(userId: number): Promise<Cart> {
        // Cargar 'items' y 'items.product' para tener acceso a la cantidad
        let cart = await this.cartRepo.findOne({
            where: { user: { id: userId }, checkedOut: false },
            relations: ['user', 'items', 'items.product'],
        });

        if (!cart) {
            cart = this.cartRepo.create({ user: { id: userId } });
            await this.cartRepo.save(cart);
            cart.items = [];
        }
        return cart;
    }

    async findOne(id: number): Promise<Cart> {
        const cart = await this.cartRepo.findOne({
            where: { id },
            relations: ['user', 'items', 'items.product'],
        });
        if (!cart) {
            throw new NotFoundException(`Cart ${id} not found`);
        }
        return cart;
    }
    
    // ==========================================
    // AGREGAR/ACTUALIZAR ITEM (Define la cantidad)
    // ==========================================
    async addOrUpdateProduct(userId: number, productId: number, quantity: number): Promise<Cart> {

        const cart = await this.findOrCreateCart(userId);
        
        if (quantity <= 0) {
            throw new BadRequestException('Quantity must be greater than 0');
        }

        const product = await this.productRepo.findOne({ where: { id: productId } });
        if (!product) {
            throw new NotFoundException(`Product ${productId} not found`);
        }

        if (product.cantidad < quantity) {
            // Falla si la cantidad solicitada excede el stock disponible
            throw new BadRequestException(
                `Insufficient stock for product ${productId}. Available: ${product.cantidad}`,
            );
        }
        
        // Buscar si el CartItem ya existe
        const existingItem = cart.items.find(item => item.product.id === productId);

        if (existingItem) {
            // Actualizar la cantidad y guardar el CartItem
            existingItem.quantity = quantity;
            await this.itemRepo.save(existingItem);
        } else {
            // Crear y guardar un nuevo CartItem
            const newItem = this.itemRepo.create({
                cart: cart,
                product: product,
                quantity: quantity,
            });
            await this.itemRepo.save(newItem);
            cart.items.push(newItem);
        }

        return cart; 
    }

    // ==========================================
    // ELIMINAR ITEM
    // ==========================================
    async removeProduct(userId: number, productId: number): Promise<Cart> {

        const cart = await this.findOrCreateCart(userId);
        
        const itemToRemove = cart.items.find(item => item.product.id === productId);

        if (!itemToRemove) {
            throw new NotFoundException(`Product ${productId} not found in cart`);
        }

        // Eliminar el CartItem de la bd
        await this.itemRepo.remove(itemToRemove);
        
        // Recargar el carrito para tener la lista de ítems sin el elemento eliminado
        return this.findOne(cart.id); 
    }

    // ==========================================
    // CHECKOUT
    // ==========================================
    async checkout(cartId: number): Promise<Cart> {
        const cart = await this.findOne(cartId);
        
        if (!cart.items || cart.items.length === 0) {
            throw new BadRequestException('Cannot checkout an empty cart.');
        }

        if (cart.checkedOut) {
            throw new BadRequestException('Cart is already checked out.');
        }

        cart.checkedOut = true;
        return this.cartRepo.save(cart);
    }
    
    // ==========================================
    // FIND ALL (ADMIN)
    // ==========================================
    async findAll(): Promise<Cart[]> {
        return this.cartRepo.find({ relations: ['user', 'items', 'items.product'] });
    }
}