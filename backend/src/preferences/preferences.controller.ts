import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { PreferencesService } from './preferences.service';

@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  get(@CurrentUser() user: User) {
    return this.preferencesService.getOrCreate(user.id);
  }

  @Patch()
  update(@CurrentUser() user: User, @Body() dto: UpdatePreferenceDto) {
    return this.preferencesService.update(user.id, dto);
  }

  /** Alias for clients / proxies that block PATCH */
  @Post()
  updateViaPost(@CurrentUser() user: User, @Body() dto: UpdatePreferenceDto) {
    return this.preferencesService.update(user.id, dto);
  }
}
