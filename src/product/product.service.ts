// product.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, Not } from 'typeorm';
import { Product } from './entities/product.entity';
import { Category } from '../category/entities/category.entity';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ProductService {
    constructor(
        @InjectRepository(Product)
        private readonly productRepo: Repository<Product>,
        @InjectRepository(Category)
        private readonly categoryRepo: Repository<Category>,
        private readonly httpService: HttpService,
    ) { }

    // ========== MÉTODOS ORIGINALES (CRUD) ==========

    /** Obtener todos los productos */
    async findAll(): Promise<Product[]> {
        const products = await this.productRepo.find({ relations: ['categories'] });
        return products.map((product) => ({
            ...product,
            price: Number(product.price),
        }));
    }

    /** Obtener un producto por ID */
    async findOne(id: number): Promise<Product> {
        const product = await this.productRepo.findOne({
            where: { id },
            relations: ['categories'],
        });
        if (!product)
            throw new NotFoundException(`Product with ID ${id} not found`);
        return { ...product, price: Number(product.price) };
    }

    /** Crear un nuevo producto */
    async create(dto: CreateProductDto): Promise<Product> {
        const { categories, ...data } = dto;
        const productEntity = this.productRepo.create(data);

        productEntity.available = productEntity.cantidad > 0;

        if (categories?.length) {
            const foundCategories = await this.categoryRepo.find({
                where: { id: In(categories) },
            });
            if (foundCategories.length !== categories.length) {
                throw new NotFoundException('Una o más categorías no existen');
            }
            productEntity.categories = foundCategories;
        }

        return this.productRepo.save(productEntity);
    }

    /** Actualizar un producto */
    async update(id: number, dto: UpdateProductDto): Promise<Product> {
        const product = await this.findOne(id);
        const { categories, ...data } = dto;

        if (categories) {
            const foundCategories = await this.categoryRepo.find({
                where: { id: In(categories) },
            });
            if (foundCategories.length !== categories.length) {
                throw new NotFoundException('Una o más categorías no existen');
            }
            product.categories = foundCategories;
        }

        Object.assign(product, data);
        return this.productRepo.save(product);
    }

    /** Eliminar un producto */
    async remove(id: number): Promise<{ message: string }> {
        const product = await this.findOne(id);
        await this.productRepo.remove(product);
        return { message: `Product ${id} deleted successfully` };
    }

    // ========== MÉTODOS PARA EL CHAT ==========

    /** 🔍 BUSCAR PRODUCTO POR NOMBRE O DESCRIPCIÓN (para el chat) */
    async findByQuery(query: string): Promise<Product | null> {
        const product = await this.productRepo.findOne({
            where: [
                { name: Like(`%${query}%`) },
                { description: Like(`%${query}%`) }
            ],
            relations: ['categories']
        });

        if (product) {
            return { ...product, price: Number(product.price) };
        }
        return null;
    }

    /** 📦 OBTENER INFORMACIÓN DE STOCK */
    async getStockInfo(productId: number): Promise<{
        quantity: number;
        lowStock: boolean;
        available: boolean;
    }> {
        const product = await this.productRepo.findOne({
            where: { id: productId }
        });

        if (!product) {
            throw new NotFoundException(`Product with ID ${productId} not found`);
        }

        return {
            quantity: product.cantidad,
            lowStock: product.cantidad <= 5,
            available: product.available && product.cantidad > 0
        };
    }

    /** 💡 OBTENER RECOMENDACIONES BASADAS EN PRODUCTO */
    async getRecommendations(productId: number, customerId: string): Promise<any[]> {
        const product = await this.productRepo.findOne({
            where: { id: productId },
            relations: ['categories']
        });

        if (!product || !product.categories || product.categories.length === 0) {
            return [];
        }

        const categoryIds = product.categories.map(cat => cat.id);

        const recommendations = await this.productRepo.find({
            where: {
                categories: { id: In(categoryIds) },
                id: Not(productId),
                available: true
            },
            take: 5,
            relations: ['categories']
        });

        return recommendations.map(p => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            imageUrl: p.imageUrl,
            cantidad: p.cantidad,
            available: p.available
        }));
    }

    /** 🛡️ OBTENER INFORMACIÓN DE GARANTÍA */
    async getWarrantyInfo(productId: number): Promise<{
        duration: string;
        type: string;
        coverage: string[];
        conditions: string[];
        contactSupport: string;
    }> {
        const product = await this.productRepo.findOne({
            where: { id: productId }
        });

        if (!product) {
            throw new NotFoundException(`Product with ID ${productId} not found`);
        }

        return {
            duration: '12 meses',
            type: 'Garantía de fábrica',
            coverage: [
                'Defectos de fabricación',
                'Problemas de funcionamiento',
                'Partes y mano de obra'
            ],
            conditions: [
                'Uso normal del producto',
                'Factura de compra requerida',
                'Exclusión por daños por mal uso'
            ],
            contactSupport: 'soporte@tienda.com o 1-800-123-4567'
        };
    }

    /** ⚖️ COMPARAR PRODUCTOS */
    async compareProducts(productIds: number[]): Promise<any[]> {
        const products = await this.productRepo.find({
            where: { id: In(productIds) },
            relations: ['categories']
        });

        return products.map(product => ({
            id: product.id,
            name: product.name,
            price: Number(product.price),
            description: product.description,
            cantidad: product.cantidad,
            available: product.available,
            imageUrl: product.imageUrl,
            categories: product.categories.map(cat => cat.name),
            features: [
                `Stock: ${product.cantidad} unidades`,
                product.available ? 'Disponible' : 'No disponible',
                `Categorías: ${product.categories.map(c => c.name).join(', ')}`
            ]
        }));
    }

    /** 
     * IMPORTAR PRODUCTOS TECH DESDUMMYJSON API
     * Convierte y guarda en tu base de datos
     */

    async importTechProductsFromDummyJSON(categoryIds: number[] = []): Promise<{
        imported: number;
        skipped: number;
        errors: number;
    }> {
        try {
            const techCategories = ['smartphones', 'laptops', 'tablets'];
            let imported = 0;
            let skipped = 0;
            let errors = 0;

            for (const apiCategory of techCategories) {
                try {
                    const response = await firstValueFrom(
                        this.httpService.get(`https://dummyjson.com/products/category/${apiCategory}`)
                    );

                    for (const externalProduct of response.data.products) {
                        try {
                            // Verificar si el producto ya existe
                            const existingProduct = await this.productRepo.findOne({
                                where: { name: externalProduct.title }
                            });

                            if (existingProduct) {
                                skipped++;
                                continue;
                            }

                            // Convertir producto externo a tu CreateProductDto
                            const createProductDto: CreateProductDto = {
                                name: externalProduct.title,
                                description: externalProduct.description,
                                price: externalProduct.price,
                                cantidad: externalProduct.stock,
                                available: externalProduct.stock > 0,
                                imageUrl: externalProduct.thumbnail,
                                categories: categoryIds.length > 0 ? categoryIds : await this.getDefaultTechCategoryIds()
                            };

                            // Usar tu método create existente
                            await this.create(createProductDto);
                            imported++;

                        } catch (productError) {
                            console.error(`Error importing product: ${externalProduct.title}`, productError);
                            errors++;
                        }
                    }

                    // Pequeña pausa entre categorías
                    await new Promise(resolve => setTimeout(resolve, 200));

                } catch (categoryError) {
                    console.error(`Error fetching category ${apiCategory}:`, categoryError);
                    errors++;
                }
            }

            return { imported, skipped, errors };
        } catch (error) {
            console.error('Error in importTechProductsFromDummyJSON:', error);
            throw new Error('Failed to import products from external API');
        }
    }

    /** 
     * BUSCAR PRODUCTOS EN DUMMYJSON (solo lectura, no guarda)
     */
    async searchExternalTechProducts(query: string): Promise<any[]> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`https://dummyjson.com/products/search?q=${query}`)
            );

            const techCategories = ['smartphones', 'laptops', 'tablets'];
            return response.data.products
                .filter((product: any) => techCategories.includes(product.category))
                .map((product: any) => ({
                    externalId: product.id,
                    name: product.title,
                    description: product.description,
                    price: product.price,
                    stock: product.stock,
                    brand: product.brand,
                    category: product.category,
                    imageUrl: product.thumbnail,
                    rating: product.rating,
                    images: product.images
                }));
        } catch (error) {
            console.error('Error searching external products:', error);
            return [];
        }
    }

    /** 
     * OBTENER PRODUCTOS TECH DE DUMMYJSON (solo visualización)
     */
    async getExternalTechProducts(): Promise<any[]> {
        try {
            const techCategories = ['smartphones', 'laptops', 'tablets'];
            let allProducts: any[] = [];

            for (const category of techCategories) {
                const response = await firstValueFrom(
                    this.httpService.get(`https://dummyjson.com/products/category/${category}`)
                );
                allProducts = [...allProducts, ...response.data.products];
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            return allProducts.map(product => ({
                externalId: product.id,
                name: product.title,
                description: product.description,
                price: product.price,
                stock: product.stock,
                brand: product.brand,
                category: product.category,
                imageUrl: product.thumbnail,
                rating: product.rating,
                discount: product.discountPercentage
            }));
        } catch (error) {
            console.error('Error fetching external tech products:', error);
            return [];
        }
    }

    /** 
     * OBTENER IDs DE CATEGORÍAS TECH POR DEFECTO
     */
    private async getDefaultTechCategoryIds(): Promise<number[]> {
        // Buscar categorías tech existentes o crear una por defecto
        const techCategoryNames = ['Tecnología', 'Electrónicos', 'Smartphones', 'Laptops'];

        const categories = await this.categoryRepo.find({
            where: [
                { name: 'Tecnología' },
                { name: 'Electrónicos' },
                { name: 'Smartphones' },
                { name: 'Laptops' }
            ]
        });

        if (categories.length > 0) {
            return categories.map(cat => cat.id);
        }

        // Si no existen categorías tech, crear una por defecto
        const defaultCategory = this.categoryRepo.create({
            name: 'Tecnología',
            description: 'Productos tecnológicos y electrónicos'
        });
        const savedCategory = await this.categoryRepo.save(defaultCategory);

        return [savedCategory.id];
    }
}