import { Controller, Get } from '@nestjs/common';
import { PreferencesService } from './preferences.service';

@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  get() {
    return this.preferencesService.getOrCreate();
  }
}
