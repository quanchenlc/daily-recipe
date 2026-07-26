import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { Recipe } from './entities/recipe.entity';

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipesRepo: Repository<Recipe>,
  ) {}

  findAll() {
    return this.recipesRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const recipe = await this.recipesRepo.findOne({ where: { id } });
    if (!recipe) {
      throw new NotFoundException(`Recipe ${id} not found`);
    }
    return recipe;
  }

  async findByName(name: string) {
    return this.recipesRepo.findOne({ where: { name } });
  }

  async create(dto: CreateRecipeDto) {
    const existing = await this.findByName(dto.name);
    if (existing) {
      throw new ConflictException(`Recipe already exists: ${dto.name}`);
    }
    const recipe = this.recipesRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      ingredients: dto.ingredients ?? null,
      tags: dto.tags ?? null,
      cookMinutes: dto.cookMinutes ?? null,
      difficulty: dto.difficulty ?? null,
      source: dto.source ?? 'manual',
    });
    return this.recipesRepo.save(recipe);
  }

  async findOrCreateFromLlm(input: {
    name: string;
    description?: string;
    ingredients?: string[];
    tags?: string[];
    cookMinutes?: number;
    difficulty?: string;
  }) {
    const existing = await this.findByName(input.name);
    if (existing) {
      return existing;
    }
    return this.recipesRepo.save(
      this.recipesRepo.create({
        name: input.name,
        description: input.description ?? null,
        ingredients: input.ingredients ?? null,
        tags: input.tags ?? null,
        cookMinutes: input.cookMinutes ?? null,
        difficulty: input.difficulty ?? null,
        source: 'llm',
      }),
    );
  }

  async update(id: string, dto: UpdateRecipeDto) {
    const recipe = await this.findOne(id);
    if (dto.name && dto.name !== recipe.name) {
      const conflict = await this.findByName(dto.name);
      if (conflict) {
        throw new ConflictException(`Recipe already exists: ${dto.name}`);
      }
    }
    Object.assign(recipe, {
      ...dto,
      description: dto.description ?? recipe.description,
      ingredients: dto.ingredients ?? recipe.ingredients,
      tags: dto.tags ?? recipe.tags,
      cookMinutes: dto.cookMinutes ?? recipe.cookMinutes,
      difficulty: dto.difficulty ?? recipe.difficulty,
      source: dto.source ?? recipe.source,
    });
    return this.recipesRepo.save(recipe);
  }

  async remove(id: string) {
    const recipe = await this.findOne(id);
    await this.recipesRepo.remove(recipe);
    return { deleted: true, id };
  }
}
