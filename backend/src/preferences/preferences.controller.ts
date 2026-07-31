import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { PreferencesService } from './preferences.service';

@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  get() {
    return this.preferencesService.getOrCreate();
  }

  @Patch()
  update(@Body() dto: UpdatePreferenceDto) {
    return this.preferencesService.update(dto);
  }

  /** Alias for clients / proxies that block PATCH */
  @Post()
  updateViaPost(@Body() dto: UpdatePreferenceDto) {
    return this.preferencesService.update(dto);
  }
}
